import React, { useState } from 'react';

const TransformationPanel = ({ 
  layerId, 
  notes, 
  scale, 
  rootNote,
  onTransform,
  disabled,
  loading 
}) => {
  const [selectedTransform, setSelectedTransform] = useState(null);
  const [transformParams, setTransformParams] = useState({});
  const [showPanel, setShowPanel] = useState(false);

  const transformations = [
    {
      id: 'analyze',
      name: 'Analyze',
      description: 'Analyze melody intervals and structure',
      params: null
    },
    {
      id: 'counter-melody',
      name: 'Counter Melody',
      description: 'Generate counter melody line',
      params: {
        style: {
          type: 'select',
          label: 'Motion Type',
          options: ['contrary', 'parallel', 'oblique', 'mixed'],
          default: 'contrary'
        }
      }
    },
    {
      id: 'harmonize',
      name: 'Harmonize',
      description: 'Create harmony at interval',
      params: {
        interval: {
          type: 'select',
          label: 'Interval',
          options: [
            { value: 3, label: 'Third' },
            { value: 5, label: 'Fifth' },
            { value: 6, label: 'Sixth' },
            { value: 8, label: 'Octave' }
          ],
          default: 3
        }
      }
    },
    {
      id: 'transpose',
      name: 'Transpose',
      description: 'Shift pitch up or down by semitones',
      params: {
        semitones: {
          type: 'slider',
          label: 'Semitones',
          min: -12,
          max: 12,
          default: 0
        }
      }
    },
    {
      id: 'transpose-diatonic',
      name: 'Transpose Diatonic',
      description: 'Shift pitch by scale degrees',
      params: {
        semitones: {  // Using semitones field for scale steps
          type: 'slider',
          label: 'Scale Steps',
          min: -7,
          max: 7,
          default: 0
        }
      }
    },
    {
      id: 'invert',
      name: 'Invert',
      description: 'Mirror melody around axis',
      params: {
        axis: {
          type: 'select',
          label: 'Axis Point',
          options: ['center', 'first-note', 'last-note'],
          default: 'center'
        }
      }
    },
    {
      id: 'augment',
      name: 'Augment',
      description: 'Stretch timing',
      params: {
        factor: {
          type: 'number',
          label: 'Factor',
          min: 1.5,
          max: 4,
          step: 0.5,
          default: 2
        }
      }
    },
    {
      id: 'diminish',
      name: 'Diminish',
      description: 'Compress timing',
      params: {
        factor: {
          type: 'number',
          label: 'Factor',
          min: 0.25,
          max: 0.75,
          step: 0.25,
          default: 0.5
        }
      }
    },
    {
      id: 'ornament',
      name: 'Ornament',
      description: 'Add musical decorations',
      params: {
        style: {
          type: 'select',
          label: 'Style',
          options: ['classical', 'jazz', 'baroque', 'minimal'],
          default: 'classical'
        }
      }
    },
    {
      id: 'develop',
      name: 'Develop',
      description: 'Apply development techniques',
      params: {
        method: {
          type: 'select',
          label: 'Method',
          options: ['sequence', 'fragment', 'extend', 'retrograde'],
          default: 'sequence'
        }
      }
    }
  ];

  const handleTransform = (transform) => {
    if (!transform.params) {
      // Direct action (like analyze)
      onTransform(transform.id, {});
      return;
    }

    setSelectedTransform(transform);
    // Initialize params with defaults
    const defaults = {};
    Object.entries(transform.params).forEach(([key, config]) => {
      defaults[key] = config.default;
    });
    setTransformParams(defaults);
  };

  const applyTransformation = () => {
    if (selectedTransform) {
      onTransform(selectedTransform.id, transformParams);
      setSelectedTransform(null);
      setTransformParams({});
    }
  };

  const renderParamControl = (key, config) => {
    const value = transformParams[key];

    switch (config.type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => setTransformParams({
              ...transformParams,
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
              onChange={(e) => setTransformParams({
                ...transformParams,
                [key]: Number(e.target.value)
              })}
              style={{ width: '100%' }}
            />
            <span style={{ color: '#aaa', fontSize: '12px' }}>{value}</span>
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
            onChange={(e) => setTransformParams({
              ...transformParams,
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
        disabled={disabled || !notes || notes.length === 0}
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
        Transform
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
          minWidth: '300px',
          maxWidth: '400px',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '14px' }}>
            Transformations
          </h4>

          {!selectedTransform ? (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: '8px' 
            }}>
              {transformations.map(transform => (
                <button
                  key={transform.id}
                  onClick={() => handleTransform(transform)}
                  disabled={loading}
                  style={{
                    padding: '12px',
                    backgroundColor: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '6px',
                    color: '#fff',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                    fontSize: '12px'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#3a3a3a'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#2a2a2a'}
                  title={transform.description}
                >
                  <div style={{ fontSize: '11px' }}>{transform.name}</div>
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
                {selectedTransform.name}
              </h5>
              
              {Object.entries(selectedTransform.params).map(([key, config]) => (
                <div key={key} style={{ marginBottom: '12px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '4px', 
                    color: '#aaa',
                    fontSize: '12px'
                  }}>
                    {config.label}
                  </label>
                  {renderParamControl(key, config)}
                </div>
              ))}

              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                marginTop: '16px' 
              }}>
                <button
                  onClick={applyTransformation}
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
                    setSelectedTransform(null);
                    setTransformParams({});
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

export default TransformationPanel;