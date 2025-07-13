# Multi-Layer Editor Implementation Plan

## Overview
Transform the single-timeline MIDI editor into a 3-layer system where each layer operates independently with its own MIDI data, controls, and edit capabilities.

## Architecture

### State Management Structure
```javascript
// App.js state refactor
const [layers, setLayers] = useState([
  { 
    id: 0,
    name: 'Layer 1',
    midiData: null,
    parsedMidi: null,
    editMode: false,
    isRecording: false,
    liveNotes: [],
    selectedNotes: new Set(),
    zoom: 300,
    scrollX: 0
  },
  { id: 1, name: 'Layer 2', ... },
  { id: 2, name: 'Layer 3', ... }
]);

const [activeLayer, setActiveLayer] = useState(0); // For generate/record targeting
const [globalPlayback, setGlobalPlayback] = useState(false); // Play all layers together
```

### Component Hierarchy
```
App.js
└── MultiLayerEditor
    ├── LayerControls (layer selection, global play)
    └── LayerContainer (for each layer)
        ├── LayerHeader (name, solo/mute buttons)
        └── Timeline (existing component, modified)
            ├── ViewportEditor
            └── Canvas (200px height instead of 600px)
```

## Implementation Phases

### Phase 1: State Refactoring ✅
- [ ] Convert single MIDI state to layer array
- [ ] Update all handlers to accept layer index
- [ ] Create layer update utility functions
- [ ] Maintain backward compatibility during transition

### Phase 2: UI Layout
- [ ] Create MultiLayerEditor container component
- [ ] Modify Timeline to accept configurable height (200px)
- [ ] Add layer headers with name and mute/solo buttons
- [ ] Adjust Y-axis scaling for smaller canvas height
- [ ] Stack 3 Timeline components vertically

### Phase 3: Layer-Specific Features
- [ ] Independent Generate MIDI per layer
- [ ] Independent Record MIDI per layer
- [ ] Independent Edit Mode per layer
- [ ] Per-layer Load Melody functionality
- [ ] Per-layer Save MIDI functionality
- [ ] Layer-specific note transformations

### Phase 4: Multi-Layer Playback
- [ ] Implement Tone.js multi-synth playback
- [ ] Add solo/mute controls per layer
- [ ] Sync playback position across all layers
- [ ] Global play/stop controls
- [ ] Layer volume controls

### Phase 5: Enhanced Features
- [ ] Export as multi-track MIDI file
- [ ] Copy/paste notes between layers
- [ ] Layer pan controls
- [ ] Settings persistence for all layers
- [ ] Shared zoom/scroll option

## Technical Details

### Timeline Component Modifications
**New Props:**
- `layerId`: Layer identification
- `layerName`: Display name
- `height`: Canvas height (default 200px)
- `onLayerUpdate`: Callback for layer-specific updates

**Visual Adjustments:**
- Canvas height: 200px (vs current 600px)
- Grid lines: ~5 per layer
- Note height: Scale appropriately
- Layer label: Top-left corner

### Backend Considerations
- Existing endpoints work for individual layers
- New endpoint needed for multi-layer export
- Layer data structure in settings.json

### Performance Optimizations
- Shared requestAnimationFrame for all canvases
- Debounced state updates
- Virtualization if needed for many notes

## UI Mockup
```
┌─────────────────────────────────────────────┐
│ MIDI Editor - Multi-Layer Mode              │
│ [Play All] [Stop All] [Export Multi-Track]  │
├─────────────────────────────────────────────┤
│ Layer 1 [🔇] [S] │ Generate│Record│Edit│... │
│ ┌───────────────────────────────────────┐   │
│ │ Canvas (200px) - Note display         │   │
│ └───────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│ Layer 2 [🔇] [S] │ Generate│Record│Edit│... │
│ ┌───────────────────────────────────────┐   │
│ │ Canvas (200px) - Note display         │   │
│ └───────────────────────────────────────┘   │
├─────────────────────────────────────────────┤
│ Layer 3 [🔇] [S] │ Generate│Record│Edit│... │
│ ┌───────────────────────────────────────┐   │
│ │ Canvas (200px) - Note display         │   │
│ └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

## Success Criteria
1. Each layer operates completely independently
2. No regression in single-layer functionality
3. Intuitive multi-layer controls
4. Performance remains smooth with 3 layers
5. Clean, maintainable code structure