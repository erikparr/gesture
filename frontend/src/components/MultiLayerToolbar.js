import React, { useState } from 'react';
import SuperColliderExport from './SuperColliderExport';

const MultiLayerToolbar = ({ 
  onLoadAllLayers,
  onImportMidi,
  onPlayAll,
  onStopAll,
  onClearAll,
  loading,
  layers
}) => {
  const [sendingOSC, setSendingOSC] = useState(false);
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      onLoadAllLayers(file);
    }
  };

  const handleMidiImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      onImportMidi(file);
    }
  };

  const handleSendToOSC = async () => {
    if (sendingOSC) return;

    setSendingOSC(true);
    
    try {
      const exportData = {
        layers: {},
        duration_type: "absolute",
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
        alert('No layers with content to send');
        return;
      }

      const response = await fetch('http://localhost:8000/send-to-osc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'OSC send failed');
      }

      const result = await response.json();
      
      // Show success message
      if (result.success) {
        console.log(`Successfully sent ${result.layers.length} layers to SuperCollider via OSC`);
        // Optionally show a temporary success indicator
      }
      
    } catch (error) {
      console.error('Error sending to OSC:', error);
      alert('Failed to send to OSC: ' + error.message);
    } finally {
      setSendingOSC(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '12px 20px',
      backgroundColor: '#2a2a2a',
      borderRadius: '6px',
      marginBottom: '16px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    }}>
      <h3 style={{ 
        margin: 0, 
        color: '#fff',
        fontSize: '16px',
        fontWeight: 'bold'
      }}>
        Multi-Layer Actions
      </h3>
      
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
        <label style={{
          padding: '8px 16px',
          backgroundColor: '#9C27B0',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          opacity: loading ? 0.6 : 1,
          transition: 'all 0.2s'
        }}>
          Load All Layers
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            disabled={loading}
          />
        </label>

        <label style={{
          padding: '8px 16px',
          backgroundColor: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          opacity: loading ? 0.6 : 1,
          transition: 'all 0.2s'
        }}>
          Import MIDI
          <input
            type="file"
            accept=".mid,.midi"
            onChange={handleMidiImport}
            style={{ display: 'none' }}
            disabled={loading}
          />
        </label>

        <button 
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            opacity: onPlayAll ? 1 : 0.5,
            transition: 'all 0.2s'
          }}
          onClick={onPlayAll}
          disabled={!onPlayAll || loading}
        >
          Play All
        </button>

        <button 
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            opacity: onStopAll ? 1 : 0.5,
            transition: 'all 0.2s'
          }}
          onClick={onStopAll}
          disabled={!onStopAll || loading}
        >
          Stop All
        </button>

        <button 
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            opacity: onClearAll ? 1 : 0.5,
            transition: 'all 0.2s'
          }}
          onClick={onClearAll}
          disabled={!onClearAll || loading}
        >
          Clear All
        </button>

        <SuperColliderExport 
          layers={layers}
          style={{ marginLeft: '8px' }}
        />

        <button
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: '#FF6B6B',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: sendingOSC ? 'not-allowed' : 'pointer',
            opacity: sendingOSC || loading ? 0.6 : 1,
            transition: 'all 0.2s',
            marginLeft: '8px'
          }}
          onClick={handleSendToOSC}
          disabled={sendingOSC || loading}
          title="Send current layers to SuperCollider via OSC"
        >
          {sendingOSC ? 'Sending...' : 'Send to OSC'}
        </button>
      </div>
    </div>
  );
};

export default MultiLayerToolbar;