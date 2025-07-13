import React from 'react';

const GenerateButton = ({ onGenerate, loading, style }) => {
  return (
    <button 
      onClick={onGenerate} 
      disabled={loading}
      style={{
        padding: '12px 24px',
        fontSize: '16px',
        backgroundColor: '#0066cc',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        transition: 'background-color 0.2s',
        ...style
      }}
      onMouseEnter={(e) => e.target.style.backgroundColor = '#0052a3'}
      onMouseLeave={(e) => e.target.style.backgroundColor = '#0066cc'}
    >
      {loading ? 'Generating...' : 'Generate MIDI'}
    </button>
  );
};

export default GenerateButton;