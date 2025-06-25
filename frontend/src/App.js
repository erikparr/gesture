import React, { useState } from 'react';
import { Midi } from '@tonejs/midi';
import GenerateButton from './components/GenerateButton';
import MidiPlayer from './components/MidiPlayer';
import Timeline from './Timeline';

function App() {
  const [midiData, setMidiData] = useState(null);
  const [parsedMidi, setParsedMidi] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      
      <GenerateButton onGenerate={handleGenerate} loading={loading} />
      
      {error && (
        <div style={{ color: 'red', marginTop: '16px' }}>
          Error: {error}
        </div>
      )}
      
      {midiData && (
        <div style={{ marginTop: '16px' }}>
          <p style={{ color: 'green' }}>MIDI generated successfully!</p>
          <MidiPlayer midiData={midiData} />
          {parsedMidi && <Timeline midiData={parsedMidi} />}
        </div>
      )}
    </div>
  );
}

export default App;