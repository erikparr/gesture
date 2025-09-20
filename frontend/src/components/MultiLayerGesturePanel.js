import React, { useState } from 'react';

const MultiLayerGesturePanel = ({ 
  onMultiLayerGesture,
  disabled,
  loading 
}) => {
  const [showPanel, setShowPanel] = useState(false);
  const [layerConfigs, setLayerConfigs] = useState([
    { layerId: 0, midiNote: 60, durationPercent: 50, totalDuration: 4, numNotes: 1 },
    { layerId: 1, midiNote: 64, durationPercent: 50, totalDuration: 4, numNotes: 5 },
    { layerId: 2, midiNote: 67, durationPercent: 50, totalDuration: 4, numNotes: 10 }
  ]);

  const updateLayerConfig = (layerId, field, value) => {
    setLayerConfigs(prev => prev.map(config => 
      config.layerId === layerId 
        ? { ...config, [field]: Number(value) }
        : config
    ));
  };

  const handleGenerate = () => {
    onMultiLayerGesture(layerConfigs);
    setShowPanel(false);
  };

  const validateConfig = (config) => {
    return (
      config.midiNote >= 0 && config.midiNote <= 127 &&
      config.durationPercent >= 1 && config.durationPercent <= 100 &&
      config.totalDuration >= 1 && config.totalDuration <= 10 &&
      config.numNotes >= 1 && config.numNotes <= 100
    );
  };

  const allConfigsValid = layerConfigs.every(validateConfig);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowPanel(!showPanel)}
        disabled={disabled}
        style={{
          padding: '8px 16px',
          fontSize: '14px',
          backgroundColor: showPanel ? '#FF9800' : '#666',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s'
        }}
      >
        Multi-Layer Gesture
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
          padding: '16px',
          minWidth: '600px',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          <h4 style={{ 
            margin: '0 0 16px 0', 
            color: '#fff', 
            fontSize: '16px',
            textAlign: 'center'
          }}>
            Multi-Layer Gesture Configuration
          </h4>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'auto repeat(4, 1fr)',
            gap: '8px',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            {/* Header row */}
            <div style={{ color: '#aaa', fontSize: '12px', fontWeight: 'bold' }}></div>
            <div style={{ color: '#aaa', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>
              MIDI Note
            </div>
            <div style={{ color: '#aaa', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>
              Duration % (of max)
            </div>
            <div style={{ color: '#aaa', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>
              Total Duration (s)
            </div>
            <div style={{ color: '#aaa', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>
              Num Notes
            </div>

            {/* Layer configuration rows */}
            {layerConfigs.map((config, index) => (
              <React.Fragment key={config.layerId}>
                <div style={{ 
                  color: '#fff', 
                  fontSize: '14px', 
                  fontWeight: 'bold',
                  padding: '4px 8px'
                }}>
                  Layer {index + 1}
                </div>
                
                <input
                  type="number"
                  min="0"
                  max="127"
                  value={config.midiNote}
                  onChange={(e) => updateLayerConfig(config.layerId, 'midiNote', e.target.value)}
                  style={{
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #444',
                    backgroundColor: '#2a2a2a',
                    color: '#fff',
                    textAlign: 'center',
                    fontSize: '13px'
                  }}
                />
                
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={config.durationPercent}
                  onChange={(e) => updateLayerConfig(config.layerId, 'durationPercent', e.target.value)}
                  style={{
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #444',
                    backgroundColor: '#2a2a2a',
                    color: '#fff',
                    textAlign: 'center',
                    fontSize: '13px'
                  }}
                />
                
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="0.5"
                  value={config.totalDuration}
                  onChange={(e) => updateLayerConfig(config.layerId, 'totalDuration', e.target.value)}
                  style={{
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #444',
                    backgroundColor: '#2a2a2a',
                    color: '#fff',
                    textAlign: 'center',
                    fontSize: '13px'
                  }}
                />
                
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={config.numNotes}
                  onChange={(e) => updateLayerConfig(config.layerId, 'numNotes', e.target.value)}
                  style={{
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #444',
                    backgroundColor: '#2a2a2a',
                    color: '#fff',
                    textAlign: 'center',
                    fontSize: '13px'
                  }}
                />
              </React.Fragment>
            ))}
          </div>

          {/* Validation message */}
          {!allConfigsValid && (
            <div style={{ 
              color: '#ff6b6b', 
              fontSize: '12px', 
              marginBottom: '12px',
              textAlign: 'center'
            }}>
              Please check parameter ranges: MIDI Note (0-127), Duration % of max (1-100), Total Duration (1-10s), Num Notes (1-100)
            </div>
          )}

          {/* Action buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '8px',
            justifyContent: 'center'
          }}>
            <button
              onClick={handleGenerate}
              disabled={loading || !allConfigsValid}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: allConfigsValid && !loading ? '#FF9800' : '#666',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (loading || !allConfigsValid) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                opacity: (loading || !allConfigsValid) ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
            >
              {loading ? 'Generating...' : 'Generate Gestures'}
            </button>
            <button
              onClick={() => setShowPanel(false)}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiLayerGesturePanel;