import React, { useState, useRef } from 'react';
import * as Tone from 'tone';

const MidiPlayer = ({ parsedMidi }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const synthRef = useRef(null);

  const playMidi = async () => {
    if (!parsedMidi || !parsedMidi.tracks || parsedMidi.tracks.length === 0) return;

    try {
      // Start the audio context
      await Tone.start();
      
      if (!synthRef.current) {
        synthRef.current = new Tone.Synth().toDestination();
      }

      setIsPlaying(true);
      
      // Get all notes from all tracks
      const allNotes = [];
      parsedMidi.tracks.forEach(track => {
        track.notes.forEach(note => {
          allNotes.push({
            time: note.time,
            midi: note.midi,
            duration: note.duration,
            velocity: note.velocity || 0.7
          });
        });
      });

      // Sort notes by time
      allNotes.sort((a, b) => a.time - b.time);

      const now = Tone.now();
      let maxTime = 0;
      
      // Schedule all notes
      allNotes.forEach(note => {
        const noteTime = now + note.time;
        const noteName = Tone.Frequency(note.midi, "midi").toNote();
        const duration = Math.max(0.1, note.duration); // Minimum duration
        const velocity = note.velocity;
        
        synthRef.current.triggerAttackRelease(noteName, duration, noteTime, velocity);
        maxTime = Math.max(maxTime, note.time + note.duration);
      });

      // Stop playing indicator after all notes finish
      const stopTime = Math.max(1000, maxTime * 1000 + 500); // At least 1 second
      setTimeout(() => setIsPlaying(false), stopTime);
    } catch (error) {
      console.error('Error playing MIDI:', error);
      setIsPlaying(false);
    }
  };

  return (
    <div style={{ marginTop: '16px' }}>
      <button 
        onClick={playMidi}
        disabled={!parsedMidi || isPlaying}
        style={{
          padding: '8px 16px',
          fontSize: '14px',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: (!parsedMidi || isPlaying) ? 'not-allowed' : 'pointer',
          opacity: (!parsedMidi || isPlaying) ? 0.6 : 1
        }}
      >
        {isPlaying ? 'Playing...' : 'Play MIDI'}
      </button>
    </div>
  );
};

export default MidiPlayer;