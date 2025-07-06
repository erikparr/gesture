import React from 'react';

const Toolbar = ({ 
  selectedScale, 
  rootNote, 
  octave,
  onScaleChange, 
  onRootNoteChange,
  onOctaveChange,
  onSaveSettings,
  onLoadSettings,
  onDownloadSettings
}) => {
  const scales = [
    { value: 'major', label: 'Major' },
    { value: 'minor', label: 'Minor' },
    { value: 'harmonic minor', label: 'Harmonic Minor' },
    { value: 'melodic minor', label: 'Melodic Minor' },
    { value: 'pentatonic', label: 'Pentatonic' },
    { value: 'minor pentatonic', label: 'Minor Pentatonic' },
    { value: 'blues', label: 'Blues' },
    { value: 'chromatic', label: 'Chromatic' },
    { value: 'whole tone', label: 'Whole Tone' },
    { value: 'dorian', label: 'Dorian' },
    { value: 'phrygian', label: 'Phrygian' },
    { value: 'phrygian dominant', label: 'Phrygian Dominant' },
    { value: 'lydian', label: 'Lydian' },
    { value: 'mixolydian', label: 'Mixolydian' },
    { value: 'aeolian', label: 'Aeolian' },
    { value: 'locrian', label: 'Locrian' }
  ];

  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octaves = [2, 3, 4, 5, 6];

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      onLoadSettings(file);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '16px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      marginBottom: '24px',
      flexWrap: 'wrap'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={{ fontWeight: 'bold' }}>Scale:</label>
        <select 
          value={selectedScale} 
          onChange={(e) => onScaleChange(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontSize: '14px'
          }}
        >
          {scales.map(scale => (
            <option key={scale.value} value={scale.value}>
              {scale.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={{ fontWeight: 'bold' }}>Root:</label>
        <select 
          value={rootNote} 
          onChange={(e) => onRootNoteChange(e.target.value)}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontSize: '14px'
          }}
        >
          {notes.map(note => (
            <option key={note} value={note}>
              {note}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={{ fontWeight: 'bold' }}>Octave:</label>
        <select 
          value={octave} 
          onChange={(e) => onOctaveChange(parseInt(e.target.value))}
          style={{
            padding: '6px 12px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontSize: '14px'
          }}
        >
          {octaves.map(oct => (
            <option key={oct} value={oct}>
              {oct}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
        <button
          onClick={onSaveSettings}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Save Settings
        </button>

        <button
          onClick={onDownloadSettings}
          style={{
            padding: '8px 16px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Download Settings
        </button>

        <label style={{
          padding: '8px 16px',
          backgroundColor: '#FF9800',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}>
          Load Settings
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </label>
      </div>
    </div>
  );
};

export default Toolbar;