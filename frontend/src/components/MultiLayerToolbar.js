import React from 'react';

const MultiLayerToolbar = ({ 
  onLoadAllLayers,
  onPlayAll,
  onStopAll,
  onClearAll,
  loading
}) => {
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      onLoadAllLayers(file);
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
      </div>
    </div>
  );
};

export default MultiLayerToolbar;