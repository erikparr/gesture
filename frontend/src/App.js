import React, { useState, useEffect, useRef } from 'react';
import { Midi } from '@tonejs/midi';
import GenerateButton from './components/GenerateButton';
import RecordButton from './components/RecordButton';
import EditModeButton from './components/EditModeButton';
import SaveMidiButton from './components/SaveMidiButton';
import MidiPlayer from './components/MidiPlayer';
import Timeline from './Timeline';
import MultiLayerEditor from './components/MultiLayerEditor';
import MidiRecorder from './utils/MidiRecorder';
import MultiLayerPlayer from './utils/MultiLayerPlayer';
import Toolbar from './components/Toolbar';
import SettingsManager from './utils/SettingsManager';
import * as layerUtils from './utils/layerUtils';

function App() {
  // Layer state structure
  const [layers, setLayers] = useState([
    {
      id: 0,
      name: 'Layer 1',
      midiData: null,
      parsedMidi: null,
      editMode: false,
      isRecording: false,
      liveNotes: [],
      zoom: 300,
      scrollX: 0,
      muted: false
    },
    {
      id: 1,
      name: 'Layer 2',
      midiData: null,
      parsedMidi: null,
      editMode: false,
      isRecording: false,
      liveNotes: [],
      zoom: 300,
      scrollX: 0,
      muted: false
    },
    {
      id: 2,
      name: 'Layer 3',
      midiData: null,
      parsedMidi: null,
      editMode: false,
      isRecording: false,
      liveNotes: [],
      zoom: 300,
      scrollX: 0,
      muted: false
    }
  ]);
  
  const [activeLayer, setActiveLayer] = useState(0); // Which layer is being targeted
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [midiRecorder, setMidiRecorder] = useState(null);
  const [multiLayerPlayer] = useState(() => new MultiLayerPlayer());
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [selectedScale, setSelectedScale] = useState('major');
  const [rootNote, setRootNote] = useState('C');
  const [octave, setOctave] = useState(4);
  const [playbackTime, setPlaybackTime] = useState(null);
  const recordButtonRef = useRef(null);
  
  // Backward compatibility helpers (temporary)
  const midiData = layers[activeLayer]?.midiData;
  const parsedMidi = layers[activeLayer]?.parsedMidi;
  const editMode = layers[activeLayer]?.editMode;
  const isRecording = layers[activeLayer]?.isRecording;
  const liveNotes = layers[activeLayer]?.liveNotes || [];

  // Load settings on component mount
  useEffect(() => {
    const loadInitialSettings = async () => {
      try {
        const settings = await SettingsManager.loadSettings();
        setSelectedScale(settings.selectedScale);
        setRootNote(settings.rootNote);
        setOctave(settings.octave);
        // Note: editMode is now per-layer, not global
        
        // Load last MIDI data if available (to first layer for backward compatibility)
        if (settings.lastMidiData) {
          const deserializedData = SettingsManager.deserializeMidiData(settings.lastMidiData);
          if (deserializedData) {
            setLayers(prev => layerUtils.updateLayerMidi(prev, 0, null, deserializedData));
          }
        }
      } catch (error) {
        console.error('Error loading initial settings:', error);
      }
    };
    
    loadInitialSettings();
  }, []);

  // Initialize MIDI recorder on component mount
  useEffect(() => {
    const initMidiRecorder = async () => {
      const recorder = new MidiRecorder();
      try {
        await recorder.initialize();
        
        recorder.setOnProgress((progress) => {
          if (recordButtonRef.current) {
            recordButtonRef.current.updateProgress(progress);
          }
        });
        
        recorder.setOnStateChange((state) => {
          console.log('Recording state changed:', state);
        });
        
        recorder.setOnDeviceChange((devices) => {
          setConnectedDevices(devices);
        });
        
        // Keep track of current active layer in closure
        let currentActiveLayer = 0;
        setActiveLayer(layer => {
          currentActiveLayer = layer;
          return layer;
        });
        
        recorder.setOnLiveNote((eventType, note) => {
          if (eventType === 'noteOn') {
            setLayers(prev => {
              const targetLayer = prev.find(l => l.isRecording) || prev[currentActiveLayer];
              return layerUtils.updateLayer(prev, targetLayer.id, {
                liveNotes: [...targetLayer.liveNotes, note]
              });
            });
          } else if (eventType === 'noteOff') {
            setLayers(prev => {
              const targetLayer = prev.find(l => l.isRecording) || prev[currentActiveLayer];
              return layerUtils.updateLayer(prev, targetLayer.id, {
                liveNotes: targetLayer.liveNotes.map(n => n.id === note.id ? note : n)
              });
            });
          }
        });
        
        setMidiRecorder(recorder);
        const devices = recorder.getConnectedDevices();
        setConnectedDevices(devices);
        console.log('MIDI Recorder initialized, devices:', devices);
      } catch (err) {
        console.error('Failed to initialize MIDI recorder:', err);
        setError('MIDI not available: ' + err.message);
      }
    };

    initMidiRecorder();

    return () => {
      if (midiRecorder) {
        midiRecorder.destroy();
      }
      if (multiLayerPlayer) {
        multiLayerPlayer.dispose();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  const handleRecordComplete = async (action, layerId = activeLayer) => {
    if (!midiRecorder) {
      setError('MIDI recorder not initialized');
      return;
    }

    if (action === 'start') {
      try {
        setLayers(prev => layerUtils.updateLayerRecording(prev, layerId, true, []));
        midiRecorder.startRecording();
      } catch (err) {
        setError(err.message);
        setLayers(prev => layerUtils.updateLayerRecording(prev, layerId, false));
        if (recordButtonRef.current) {
          recordButtonRef.current.setError(err.message);
        }
      }
    } else if (action === 'stop') {
      setLayers(prev => layerUtils.updateLayerRecording(prev, layerId, false));
      const recording = midiRecorder.stopRecording();
      if (recording && recording.events.length > 0) {
        console.log('Recording complete:', recording);
        await processRecording(recording, layerId);
        setLayers(prev => layerUtils.clearLayerRecording(prev, layerId));
      } else {
        setError('No MIDI events recorded');
        setLayers(prev => layerUtils.clearLayerRecording(prev, layerId));
      }
    }
  };

  const processRecording = async (recording, layerId = activeLayer) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/convert-recording', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: recording.events,
          duration: recording.duration
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to convert recording');
      }
      
      const blob = await response.blob();
      
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const midi = new Midi(arrayBuffer);
        console.log('Parsed recorded MIDI:', midi);
        console.log('MIDI tracks:', midi.tracks);
        if (midi.tracks && midi.tracks.length > 0) {
          console.log('First track notes:', midi.tracks[0].notes);
        }
        console.log('Setting parsedMidi for layer', layerId, ':', midi);
        setLayers(prev => layerUtils.updateLayerMidi(prev, layerId, blob, midi));
      } catch (parseError) {
        console.error('Error parsing recorded MIDI:', parseError);
        setError('Failed to parse recorded MIDI: ' + parseError.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (layerId = activeLayer) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scale_type: selectedScale,
          root_note: rootNote,
          octave: octave,
          num_notes: 8
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate MIDI');
      }
      
      const contentType = response.headers.get('content-type');
      console.log('Response content-type:', contentType);
      
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        console.error('Backend error:', errorData);
        throw new Error('Backend error: ' + (errorData.error || 'Unknown error'));
      }
      
      const blob = await response.blob();
      
      try {
        const arrayBuffer = await blob.arrayBuffer();
        console.log('ArrayBuffer size:', arrayBuffer.byteLength);
        const midi = new Midi(arrayBuffer);
        console.log('Parsed MIDI:', midi);
        console.log('MIDI tracks:', midi.tracks);
        console.log('Setting parsedMidi for layer', layerId, ':', midi);
        setLayers(prev => layerUtils.updateLayerMidi(prev, layerId, blob, midi));
      } catch (parseError) {
        console.error('Error parsing MIDI:', parseError);
        setError('Failed to parse MIDI file: ' + parseError.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTransform = async (layerId, transformType, params) => {
    setLoading(true);
    setError(null);
    
    try {
      const layer = layers.find(l => l.id === layerId);
      if (!layer || !layer.parsedMidi) {
        throw new Error('No MIDI data to transform');
      }

      // Extract notes from parsed MIDI
      const notes = layer.parsedMidi.tracks[0]?.notes || [];
      const notesData = notes.map(note => ({
        midi: note.midi,
        time: note.time,
        duration: note.duration,
        velocity: note.velocity
      }));

      // Handle analyze separately (it returns analysis, not transformed notes)
      if (transformType === 'analyze') {
        const response = await fetch(`http://localhost:8000/transform/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notes: notesData,
            scale_type: selectedScale,
            root_note: rootNote
          })
        });
        
        const analysis = await response.json();
        // Show analysis in console or modal
        console.log('Melody Analysis:', analysis);
        alert(`Melody Analysis:\n${JSON.stringify(analysis, null, 2)}`);
        return;
      }

      // Call transformation API
      const response = await fetch(`http://localhost:8000/transform/${transformType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: notesData,
          scale_type: selectedScale,
          root_note: rootNote,
          ...params
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to apply ${transformType} transformation`);
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const transformedMidi = new Midi(arrayBuffer);
      
      // Update layer with transformed MIDI
      setLayers(prev => layerUtils.updateLayerMidi(prev, layerId, blob, transformedMidi));
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGesture = async (layerId, gestureType, params) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:8000/gesture/${gestureType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gesture_type: gestureType,
          scale_type: selectedScale,
          root_note: rootNote,
          note: params.note,
          note_duration: params.noteDuration,
          interval: params.interval,
          gesture_duration: params.gestureDuration
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate ${gestureType} gesture`);
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const gestureMidi = new Midi(arrayBuffer);
      
      // Update layer with generated MIDI
      setLayers(prev => layerUtils.updateLayerMidi(prev, layerId, blob, gestureMidi));
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      // For backward compatibility, save only the first layer's data
      const firstLayer = layers[0];
      const settings = {
        selectedScale,
        rootNote,
        octave,
        zoomLevel: firstLayer?.zoom || 100,
        editMode: firstLayer?.editMode || false,
        lastMidiData: SettingsManager.serializeMidiData(firstLayer?.parsedMidi)
      };
      
      await SettingsManager.saveSettings(settings);
      setError(null);
      console.log('Settings saved successfully');
    } catch (error) {
      setError('Failed to save settings: ' + error.message);
    }
  };

  const handleLoadSettings = async (file) => {
    try {
      const result = await SettingsManager.uploadSettings(file);
      if (result.settings) {
        setSelectedScale(result.settings.selectedScale);
        setRootNote(result.settings.rootNote);
        setOctave(result.settings.octave);
        // Note: editMode is now per-layer
        
        if (result.settings.lastMidiData) {
          const deserializedData = SettingsManager.deserializeMidiData(result.settings.lastMidiData);
          if (deserializedData) {
            setLayers(prev => layerUtils.updateLayerMidi(prev, 0, null, deserializedData));
          }
        }
      }
      setError(null);
      console.log('Settings loaded successfully');
    } catch (error) {
      setError('Failed to load settings: ' + error.message);
    }
  };

  const handleDownloadSettings = async () => {
    try {
      await SettingsManager.downloadSettings();
      setError(null);
    } catch (error) {
      setError('Failed to download settings: ' + error.message);
    }
  };

  const handleLoadMelody = async (file, layerId = activeLayer) => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('http://localhost:8000/load-json-melody', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to load melody');
      }
      
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error('Backend error: ' + (errorData.error || 'Unknown error'));
      }
      
      const blob = await response.blob();
      
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const midi = new Midi(arrayBuffer);
        console.log('Parsed JSON melody for layer', layerId, ':', midi);
        setLayers(prev => layerUtils.updateLayerMidi(prev, layerId, blob, midi));
      } catch (parseError) {
        console.error('Error parsing melody MIDI:', parseError);
        setError('Failed to parse melody: ' + parseError.message);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadAllLayers = async (file) => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('http://localhost:8000/load-multi-layer-melody', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to load multi-layer melody');
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Process each layer's MIDI data
      const newLayers = [...layers];
      
      for (const [layerKey, base64Midi] of Object.entries(data.layers)) {
        const layerIndex = parseInt(layerKey.replace('layer', ''));
        
        // Convert base64 to blob
        const binaryString = atob(base64Midi);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/midi' });
        
        // Parse MIDI
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const midi = new Midi(arrayBuffer);
          console.log(`Loaded melody for layer ${layerIndex}:`, midi);
          
          // Update the layer
          newLayers[layerIndex] = {
            ...newLayers[layerIndex],
            midiData: blob,
            parsedMidi: midi
          };
        } catch (parseError) {
          console.error(`Error parsing MIDI for layer ${layerIndex}:`, parseError);
        }
      }
      
      setLayers(newLayers);
      setError(null);
      console.log('All layers loaded successfully');
    } catch (err) {
      setError('Failed to load all layers: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllLayers = () => {
    const clearedLayers = layers.map(layer => ({
      ...layer,
      midiData: null,
      parsedMidi: null,
      editMode: false,
      isRecording: false,
      liveNotes: [],
      zoom: 300,
      scrollX: 0
    }));
    setLayers(clearedLayers);
    setError(null);
    console.log('All layers cleared');
  };

  const handlePlayAll = () => {
    multiLayerPlayer.playAll(layers, (time) => {
      setPlaybackTime(time);
    });
  };

  const handleStopAll = () => {
    multiLayerPlayer.stopAll();
    setPlaybackTime(null);
  };

  const handleMuteLayer = (layerId, muted) => {
    multiLayerPlayer.muteLayer(layerId, muted);
    // Update layer state to reflect mute status
    setLayers(prev => layerUtils.updateLayer(prev, layerId, { muted }));
  };

  const handleSoloLayer = (layerId) => {
    // Solo means mute all others
    layers.forEach(layer => {
      const shouldMute = layer.id !== layerId;
      multiLayerPlayer.muteLayer(layer.id, shouldMute);
    });
    
    // Update all layer states
    setLayers(prev => prev.map(layer => ({
      ...layer,
      muted: layer.id !== layerId
    })));
  };

  return (
    <div style={{
      padding: '40px',
      fontFamily: 'Arial, sans-serif',
      maxWidth: '1400px',
      margin: '0 auto',
      backgroundColor: '#0a0a0a',
      minHeight: '100vh',
      color: '#e0e0e0'
    }}>
      <h1 style={{ color: '#ffffff' }}>MIDI Editor - Multi-Layer Mode</h1>
      
      <Toolbar
        selectedScale={selectedScale}
        rootNote={rootNote}
        octave={octave}
        onScaleChange={setSelectedScale}
        onRootNoteChange={setRootNote}
        onOctaveChange={setOctave}
        onSaveSettings={handleSaveSettings}
        onLoadSettings={handleLoadSettings}
        onDownloadSettings={handleDownloadSettings}
        onLoadMelody={handleLoadMelody}
      />
      
      
      {connectedDevices.length > 0 && (
        <div style={{ marginTop: '16px', fontSize: '14px', color: '#888' }}>
          Connected MIDI devices: {connectedDevices.map(d => d.name).join(', ')}
        </div>
      )}
      
      {error && (
        <div style={{ color: '#ff6b6b', marginTop: '16px' }}>
          Error: {error}
        </div>
      )}
      
      <MultiLayerEditor
        layers={layers}
        onLayerUpdate={(layerId, updates) => {
          setLayers(prev => layerUtils.updateLayer(prev, layerId, updates));
        }}
        activeLayer={activeLayer}
        onActiveLayerChange={setActiveLayer}
        selectedScale={selectedScale}
        rootNote={rootNote}
        octave={octave}
        loading={loading}
        midiRecorder={midiRecorder}
        recordButtonRef={recordButtonRef}
        onGenerate={handleGenerate}
        onRecordComplete={handleRecordComplete}
        onLoadMelody={handleLoadMelody}
        onLoadAllLayers={handleLoadAllLayers}
        onClearAllLayers={handleClearAllLayers}
        onPlayAll={handlePlayAll}
        onStopAll={handleStopAll}
        onMuteLayer={handleMuteLayer}
        onSoloLayer={handleSoloLayer}
        onPlaybackProgress={setPlaybackTime}
        onTransform={handleTransform}
        onGesture={handleGesture}
      />
      
    </div>
  );
}

export default App;