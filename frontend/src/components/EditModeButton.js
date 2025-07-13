import React from 'react';

const EditModeButton = ({ editMode, onToggle, disabled, style }) => {
  const handleClick = () => {
    if (!disabled) {
      onToggle(!editMode);
    }
  };

  const getButtonStyle = () => {
    const baseStyle = {
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: 'bold',
      border: 'none',
      borderRadius: '4px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.3s ease',
      minWidth: '120px'
    };

    if (editMode) {
      return {
        ...baseStyle,
        backgroundColor: disabled ? '#ccc' : '#2196F3',
        color: 'white',
        ...style
      };
    } else {
      return {
        ...baseStyle,
        backgroundColor: disabled ? '#ccc' : '#6c757d',
        color: 'white',
        ...style
      };
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      style={getButtonStyle()}
      title={editMode ? 'Exit edit mode' : 'Enter edit mode'}
    >
      {editMode ? '✏️ Edit Mode' : '📝 Edit Mode'}
    </button>
  );
};

export default EditModeButton;