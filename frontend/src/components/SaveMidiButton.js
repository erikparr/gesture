import React, { useState } from 'react';

const SaveMidiButton = ({ editableNotes, disabled, style }) => {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editableNotes || saving) return;

    setSaving(true);
    
    try {
      // Convert editableNotes to the format expected by backend
      const notesToSave = [];
      editableNotes.tracks.forEach(track => {
        track.notes.forEach(note => {
          notesToSave.push({
            midi: note.midi,
            time: note.time,
            duration: note.duration,
            velocity: note.velocity || 0.7
          });
        });
      });

      const response = await fetch('http://localhost:8000/save-midi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notes: notesToSave
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save MIDI file');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `edited-midi-${Date.now()}.mid`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Error saving MIDI:', error);
      alert('Failed to save MIDI file: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const getButtonStyle = () => {
    return {
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: 'bold',
      border: 'none',
      borderRadius: '4px',
      cursor: (disabled || saving || !editableNotes) ? 'not-allowed' : 'pointer',
      transition: 'all 0.3s ease',
      minWidth: '120px',
      backgroundColor: (disabled || saving || !editableNotes) ? '#374151' : '#0891b2',
      color: 'white',
      opacity: (disabled || saving || !editableNotes) ? 0.6 : 1,
      ...style
    };
  };

  return (
    <button
      onClick={handleSave}
      disabled={disabled || saving || !editableNotes}
      style={getButtonStyle()}
      title="Save MIDI file"
    >
      {saving ? '💾 Saving...' : '💾 Save MIDI'}
    </button>
  );
};

export default SaveMidiButton;