import React from 'react';

const GenerateButton = ({ onGenerate, loading, style }) => {
  return (
    <button 
      onClick={onGenerate} 
      disabled={loading}
      style={{
        padding: '12px 24px',
        fontSize: '16px',
        backgroundColor: '#007bff',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        ...style
      }}
    >
      {loading ? 'Generating...' : 'Generate MIDI'}
    </button>
  );
};

export default GenerateButton;