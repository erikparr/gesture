import React, { useState } from 'react';

const SuperColliderExport = ({ layers, style }) => {
  const [exporting, setExporting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [durationType, setDurationType] = useState('absolute');

  const handleExport = async () => {
    if (exporting) return;

    setExporting(true);
    
    try {
      const exportData = {
        layers: {},
        duration_type: durationType,
        format_type: "standard"
      };
      
      // Collect data from all layers with content
      layers.forEach(layer => {
        if (layer.parsedMidi && layer.parsedMidi.tracks && layer.parsedMidi.tracks.length > 0) {
          // Check if layer has any notes
          const hasNotes = layer.parsedMidi.tracks.some(track => 
            track.notes && track.notes.length > 0
          );
          
          if (hasNotes) {
            exportData.layers[layer.id] = {
              parsedMidi: layer.parsedMidi,
              mute: layer.mute,
              solo: layer.solo
            };
          }
        }
      });

      if (Object.keys(exportData.layers).length === 0) {
        alert('No layers with content to export');
        return;
      }

      const response = await fetch('http://localhost:8000/export-supercollider', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `sc_export_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Error exporting to SuperCollider:', error);
      alert('Failed to export: ' + error.message);
    } finally {
      setExporting(false);
    }
  };

  const buttonStyle = {
    padding: '8px 16px',
    fontSize: '14px',
    backgroundColor: '#9b59b6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: exporting ? 'not-allowed' : 'pointer',
    opacity: exporting ? 0.6 : 1,
    transition: 'all 0.2s',
    position: 'relative',
    ...style
  };

  const settingsStyle = {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '4px',
    backgroundColor: '#2a2a2a',
    border: '1px solid #444',
    borderRadius: '4px',
    padding: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    zIndex: 1000,
    minWidth: '200px'
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setShowSettings(!showSettings)}
        style={buttonStyle}
        disabled={exporting}
        title="Export to SuperCollider"
      >
        {exporting ? 'Exporting...' : 'Export SC ⚙️'}
      </button>
      
      {showSettings && (
        <div style={settingsStyle}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ 
              display: 'block', 
              color: '#e0e0e0', 
              fontSize: '12px',
              marginBottom: '4px' 
            }}>
              Duration Type:
            </label>
            <select 
              value={durationType} 
              onChange={(e) => setDurationType(e.target.value)}
              style={{
                width: '100%',
                padding: '4px 8px',
                backgroundColor: '#1a1a1a',
                color: '#e0e0e0',
                border: '1px solid #444',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              <option value="absolute">Absolute (seconds)</option>
              <option value="fractional">Fractional (0-1)</option>
            </select>
          </div>
          
          <button
            onClick={() => {
              setShowSettings(false);
              handleExport();
            }}
            style={{
              width: '100%',
              padding: '6px 12px',
              backgroundColor: '#9b59b6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              marginTop: '8px'
            }}
          >
            Export with Settings
          </button>
        </div>
      )}
    </div>
  );
};

export default SuperColliderExport;