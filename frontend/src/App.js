import React, { useState, useEffect, useRef } from 'react';
import { Midi } from '@tonejs/midi';
import GenerateButton from './components/GenerateButton';
import RecordButton from './components/RecordButton';
import EditModeButton from './components/EditModeButton';
import SaveMidiButton from './components/SaveMidiButton';
import MidiPlayer from './components/MidiPlayer';
import Timeline from './Timeline';
import MidiRecorder from './utils/MidiRecorder';

function App() {
  const [midiData, setMidiData] = useState(null);
  const [parsedMidi, setParsedMidi] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [midiRecorder, setMidiRecorder] = useState(null);
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [liveNotes, setLiveNotes] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const recordButtonRef = useRef(null);

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
        
        recorder.setOnLiveNote((eventType, note) => {
          if (eventType === 'noteOn') {
            setLiveNotes(prev => [...prev, note]);
          } else if (eventType === 'noteOff') {
            setLiveNotes(prev => prev.map(n => n.id === note.id ? note : n));
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
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  const handleRecordComplete = async (action) => {
    if (!midiRecorder) {
      setError('MIDI recorder not initialized');
      return;
    }

    if (action === 'start') {
      try {
        setLiveNotes([]); // Clear any previous live notes
        setIsRecording(true);
        midiRecorder.startRecording();
      } catch (err) {
        setError(err.message);
        setIsRecording(false);
        if (recordButtonRef.current) {
          recordButtonRef.current.setError(err.message);
        }
      }
    } else if (action === 'stop') {
      setIsRecording(false);
      const recording = midiRecorder.stopRecording();
      if (recording && recording.events.length > 0) {
        console.log('Recording complete:', recording);
        await processRecording(recording);
        setLiveNotes([]); // Clear live notes after processing
      } else {
        setError('No MIDI events recorded');
        setLiveNotes([]);
      }
    }
  };

  const processRecording = async (recording) => {
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
      setMidiData(blob);
      
      try {
        const arrayBuffer = await blob.arrayBuffer();
        const midi = new Midi(arrayBuffer);
        console.log('Parsed recorded MIDI:', midi);
        console.log('MIDI tracks:', midi.tracks);
        if (midi.tracks && midi.tracks.length > 0) {
          console.log('First track notes:', midi.tracks[0].notes);
        }
        console.log('Setting parsedMidi to:', midi);
        setParsedMidi(midi);
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

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/generate');
      
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
      setMidiData(blob);
      
      try {
        const arrayBuffer = await blob.arrayBuffer();
        console.log('ArrayBuffer size:', arrayBuffer.byteLength);
        const midi = new Midi(arrayBuffer);
        console.log('Parsed MIDI:', midi);
        console.log('MIDI tracks:', midi.tracks);
        console.log('Setting parsedMidi to:', midi);
        setParsedMidi(midi);
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

  return (
    <div style={{
      padding: '40px',
      fontFamily: 'Arial, sans-serif',
      maxWidth: '1400px',
      margin: '0 auto'
    }}>
      <h1>MIDI Editor</h1>
      <p>Generate and play MIDI files</p>
      
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <GenerateButton onGenerate={handleGenerate} loading={loading} />
        <RecordButton 
          ref={recordButtonRef}
          onRecordComplete={handleRecordComplete} 
          disabled={loading || !midiRecorder}
        />
        <EditModeButton 
          editMode={editMode}
          onToggle={setEditMode}
          disabled={loading || isRecording || !parsedMidi}
        />
        <SaveMidiButton 
          editableNotes={parsedMidi}
          disabled={loading || isRecording}
        />
      </div>
      
      {connectedDevices.length > 0 && (
        <div style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
          Connected MIDI devices: {connectedDevices.map(d => d.name).join(', ')}
        </div>
      )}
      
      {error && (
        <div style={{ color: 'red', marginTop: '16px' }}>
          Error: {error}
        </div>
      )}
      
      <Timeline 
        midiData={parsedMidi} 
        liveNotes={liveNotes} 
        isRecording={isRecording}
        editMode={editMode}
        onNotesChange={(newData) => {
          console.log('Notes changed, updating parsedMidi:', newData);
          setParsedMidi(newData);
        }}
      />
      
      {midiData && (
        <div style={{ marginTop: '16px' }}>
          <p style={{ color: 'green' }}>MIDI generated successfully!</p>
          <MidiPlayer parsedMidi={parsedMidi} />
        </div>
      )}
    </div>
  );
}

export default App;