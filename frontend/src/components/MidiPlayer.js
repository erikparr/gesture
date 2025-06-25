import React, { useState, useRef } from 'react';
import * as Tone from 'tone';

const MidiPlayer = ({ midiData }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const synthRef = useRef(null);

  const playMidi = async () => {
    if (!midiData) return;

    try {
      // Start the audio context
      await Tone.start();
      
      if (!synthRef.current) {
        synthRef.current = new Tone.Synth().toDestination();
      }

      setIsPlaying(true);
      
      // Simple playback of C major scale
      const notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
      const now = Tone.now();
      
      notes.forEach((note, index) => {
        synthRef.current.triggerAttackRelease(note, '8n', now + index * 0.5);
      });

      setTimeout(() => setIsPlaying(false), notes.length * 500);
    } catch (error) {
      console.error('Error playing MIDI:', error);
      setIsPlaying(false);
    }
  };

  return (
    <div style={{ marginTop: '16px' }}>
      <button 
        onClick={playMidi}
        disabled={!midiData || isPlaying}
        style={{
          padding: '8px 16px',
          fontSize: '14px',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: (!midiData || isPlaying) ? 'not-allowed' : 'pointer',
          opacity: (!midiData || isPlaying) ? 0.6 : 1
        }}
      >
        {isPlaying ? 'Playing...' : 'Play MIDI'}
      </button>
    </div>
  );
};

export default MidiPlayer;