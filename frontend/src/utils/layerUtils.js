// Utility functions for managing layer state

export const updateLayer = (layers, layerId, updates) => {
  return layers.map(layer => 
    layer.id === layerId 
      ? { ...layer, ...updates }
      : layer
  );
};

export const updateLayerMidi = (layers, layerId, midiData, parsedMidi) => {
  return updateLayer(layers, layerId, { midiData, parsedMidi });
};

export const updateLayerEditMode = (layers, layerId, editMode) => {
  return updateLayer(layers, layerId, { editMode });
};

export const updateLayerRecording = (layers, layerId, isRecording, liveNotes = null) => {
  const updates = { isRecording };
  if (liveNotes !== null) {
    updates.liveNotes = liveNotes;
  }
  return updateLayer(layers, layerId, updates);
};

export const updateLayerZoom = (layers, layerId, zoom) => {
  return updateLayer(layers, layerId, { zoom });
};

export const updateLayerScroll = (layers, layerId, scrollX) => {
  return updateLayer(layers, layerId, { scrollX });
};

export const clearLayerRecording = (layers, layerId) => {
  return updateLayer(layers, layerId, { 
    isRecording: false, 
    liveNotes: [] 
  });
};

// Get a specific layer by ID
export const getLayer = (layers, layerId) => {
  return layers.find(layer => layer.id === layerId);
};

// Reset a layer to initial state
export const resetLayer = (layers, layerId) => {
  return updateLayer(layers, layerId, {
    midiData: null,
    parsedMidi: null,
    editMode: false,
    isRecording: false,
    liveNotes: [],
    zoom: 300,
    scrollX: 0,
    muted: false
  });
};