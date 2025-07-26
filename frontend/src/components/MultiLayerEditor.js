import React from 'react';
import Timeline from '../Timeline';
import MultiLayerToolbar from './MultiLayerToolbar';

const MultiLayerEditor = ({ 
  layers, 
  onLayerUpdate,
  activeLayer,
  onActiveLayerChange,
  selectedScale,
  rootNote,
  octave,
  loading,
  midiRecorder,
  recordButtonRef,
  onGenerate,
  onRecordComplete,
  onLoadMelody,
  onLoadAllLayers,
  onClearAllLayers,
  onPlayAll,
  onStopAll,
  onMuteLayer,
  onSoloLayer,
  onPlaybackProgress,
  onTransform,
  onGesture
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      backgroundColor: '#1a1a1a',
      padding: '20px',
      borderRadius: '8px'
    }}>
      {/* Multi-layer toolbar */}
      <MultiLayerToolbar
        onLoadAllLayers={onLoadAllLayers}
        onPlayAll={onPlayAll}
        onStopAll={onStopAll}
        onClearAll={onClearAllLayers}
        loading={loading}
        layers={layers}
      />

      {/* Individual layers */}
      {layers.map((layer, index) => (
        <div 
          key={layer.id}
          style={{
            border: `2px solid ${activeLayer === layer.id ? '#007bff' : '#333'}`,
            borderRadius: '6px',
            overflow: 'hidden',
            transition: 'border-color 0.2s'
          }}
        >
          {/* Layer header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            backgroundColor: activeLayer === layer.id ? '#2a3f5f' : '#2a2a2a',
            borderBottom: '1px solid #444',
            cursor: 'pointer'
          }}
          onClick={() => onActiveLayerChange(layer.id)}
          >
            <span style={{ 
              color: '#fff', 
              fontSize: '14px',
              fontWeight: activeLayer === layer.id ? 'bold' : 'normal'
            }}>
              {layer.name}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  backgroundColor: layer.muted ? '#dc3545' : '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onMuteLayer(layer.id, !layer.muted);
                }}
                title={layer.muted ? 'Unmute' : 'Mute'}
              >
                {layer.muted ? '🔇' : '🔊'}
              </button>
              <button
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSoloLayer(layer.id);
                }}
                title="Solo this layer"
              >
                S
              </button>
            </div>
          </div>

          {/* Timeline for this layer */}
          <Timeline
            midiData={layer.parsedMidi}
            liveNotes={layer.liveNotes}
            isRecording={layer.isRecording}
            editMode={layer.editMode}
            playbackTime={null} // TODO: Add playback time per layer
            selectedScale={selectedScale}
            rootNote={rootNote}
            onNotesChange={(newData) => {
              console.log('Notes changed for layer', layer.id, ':', newData);
              onLayerUpdate(layer.id, { parsedMidi: newData });
            }}
            onGenerate={() => onGenerate(layer.id)}
            onRecordComplete={(action) => onRecordComplete(action, layer.id)}
            onEditModeToggle={(editMode) => onLayerUpdate(layer.id, { editMode })}
            loading={loading}
            recordButtonRef={layer.id === activeLayer ? recordButtonRef : null}
            midiRecorder={midiRecorder}
            onPlaybackProgress={onPlaybackProgress}
            height={200} // Smaller height for multi-layer view
            layerId={layer.id}
            layerName={layer.name}
            onTransform={onTransform ? (transformType, params) => onTransform(layer.id, transformType, params) : undefined}
            onGesture={onGesture ? (gestureType, params) => onGesture(layer.id, gestureType, params) : undefined}
          />
        </div>
      ))}
    </div>
  );
};

export default MultiLayerEditor;