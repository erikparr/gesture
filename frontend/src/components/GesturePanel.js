import React, { useState } from 'react';

const GesturePanel = ({ 
  layerId, 
  notes, 
  scale, 
  rootNote,
  onGesture,
  disabled,
  loading 
}) => {
  const [selectedGesture, setSelectedGesture] = useState(null);
  const [gestureParams, setGestureParams] = useState({});
  const [showPanel, setShowPanel] = useState(false);

  const gestures = [
    {
      id: 'simple-rhythm',
      name: 'Simple Rhythm',
      description: 'Create repeating rhythmic pattern',
      params: {
        note: {
          type: 'number',
          label: 'MIDI Note',
          min: 0,
          max: 127,
          default: 60,
          step: 1
        },
        noteDuration: {
          type: 'number',
          label: 'Note Duration (seconds)',
          min: 0.1,
          max: 2.0,
          default: 0.5,
          step: 0.1
        },
        interval: {
          type: 'slider',
          label: 'Rest Interval (% of note duration)',
          min: 0,
          max: 200,
          default: 50
        },
        gestureDuration: {
          type: 'number',
          label: 'Total Duration (seconds)',
          min: 1,
          max: 10,
          default: 4,
          step: 0.5
        }
      }
    }
  ];

  const handleGesture = (gesture) => {
    setSelectedGesture(gesture);
    // Initialize params with defaults
    const defaults = {};
    Object.entries(gesture.params).forEach(([key, config]) => {
      defaults[key] = config.default;
    });
    setGestureParams(defaults);
  };

  const applyGesture = () => {
    if (selectedGesture) {
      onGesture(selectedGesture.id, gestureParams);
      setSelectedGesture(null);
      setGestureParams({});
    }
  };

  const renderParamControl = (key, config) => {
    const value = gestureParams[key];

    switch (config.type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => setGestureParams({
              ...gestureParams,
              [key]: config.options[0].value !== undefined 
                ? Number(e.target.value) 
                : e.target.value
            })}
            style={{
              width: '100%',
              padding: '6px',
              borderRadius: '4px',
              border: '1px solid #444',
              backgroundColor: '#2a2a2a',
              color: '#fff'
            }}
          >
            {config.options.map(opt => (
              <option 
                key={opt.value || opt} 
                value={opt.value || opt}
              >
                {opt.label || opt}
              </option>
            ))}
          </select>
        );

      case 'slider':
        return (
          <div>
            <input
              type="range"
              min={config.min}
              max={config.max}
              value={value}
              onChange={(e) => setGestureParams({
                ...gestureParams,
                [key]: Number(e.target.value)
              })}
              style={{ width: '100%' }}
            />
            <span style={{ color: '#aaa', fontSize: '12px' }}>{value}%</span>
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            min={config.min}
            max={config.max}
            step={config.step}
            value={value}
            onChange={(e) => setGestureParams({
              ...gestureParams,
              [key]: Number(e.target.value)
            })}
            style={{
              width: '100%',
              padding: '6px',
              borderRadius: '4px',
              border: '1px solid #444',
              backgroundColor: '#2a2a2a',
              color: '#fff'
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowPanel(!showPanel)}
        disabled={disabled}
        style={{
          padding: '6px 12px',
          fontSize: '13px',
          backgroundColor: showPanel ? '#007bff' : '#444',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1
        }}
      >
        Gesture
      </button>

      {showPanel && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          backgroundColor: '#1a1a1a',
          border: '1px solid #444',
          borderRadius: '8px',
          padding: '12px',
          minWidth: '400px',
          maxWidth: '500px',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '14px' }}>
            Gestures
          </h4>

          {!selectedGesture ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {gestures.map(gesture => (
                <button
                  key={gesture.id}
                  onClick={() => handleGesture(gesture)}
                  disabled={loading}
                  style={{
                    padding: '12px',
                    backgroundColor: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    color: '#fff',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left',
                    fontSize: '12px'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#3a3a3a'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#2a2a2a'}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{gesture.name}</div>
                  <div style={{ fontSize: '11px', color: '#aaa' }}>{gesture.description}</div>
                </button>
              ))}
            </div>
          ) : (
            <div>
              <h5 style={{ 
                margin: '0 0 12px 0', 
                color: '#fff', 
                fontSize: '13px'
              }}>
                {selectedGesture.name}
              </h5>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                marginBottom: '16px'
              }}>
                {Object.entries(selectedGesture.params).map(([key, config]) => (
                  <div key={key}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '4px', 
                      color: '#aaa',
                      fontSize: '11px'
                    }}>
                      {config.label}
                    </label>
                    {renderParamControl(key, config)}
                  </div>
                ))}
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '8px'
              }}>
                <button
                  onClick={applyGesture}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Apply
                </button>
                <button
                  onClick={() => {
                    setSelectedGesture(null);
                    setGestureParams({});
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: '#666',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GesturePanel;