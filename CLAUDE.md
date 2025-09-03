# MIDI Editor App - Claude Context

## Project Structure
- **Frontend**: React app in `/frontend` directory using Create React App
- **Backend**: Python FastAPI server in `/backend` directory using music21 for MIDI generation

## Frontend Architecture

### Dependencies
- React 18.2.0
- Tone.js v15.1.22 (for audio playback)
- @tonejs/midi (for MIDI file parsing)
- React Scripts 5.0.1

### Key Components
- `App.js` - Main component handling multi-layer state and API calls
- `GenerateButton.js` - Button component for generating MIDI files
- `RecordButton.js` - Live MIDI recording with countdown and progress indicator
- `EditModeButton.js` - Toggle button for enabling/disabling edit mode per layer
- `SaveMidiButton.js` - Export edited MIDI as downloadable file
- `MidiPlayer.js` - Component for playing actual MIDI content using Tone.js
- `Timeline.js` - Interactive canvas-based timeline for visualizing and editing MIDI notes
- `MidiRecorder.js` - Utility class for Web MIDI API integration and live recording
- `Toolbar.js` - Scale/key selection and settings management toolbar
- `SettingsManager.js` - Utility for saving/loading app settings to file
- `MultiLayerEditor.js` - Container component managing 3 independent timeline layers
- `MultiLayerToolbar.js` - Toolbar for multi-layer actions (Load All, Play All, Clear All, Export SC)
- `MultiLayerPlayer.js` - Handles synchronized playback of multiple layers with mute/solo
- `SuperColliderExport.js` - Export layers to SuperCollider with duration type selection
- `TransformationPanel.js` - Dropdown panel for applying musical transformations to layers
- `GesturePanel.js` - Dropdown panel for generating algorithmic musical gestures

### Frontend Setup Commands
```bash
cd frontend
npm install
npm start  # Runs on http://localhost:3000
```

## Backend Architecture

### Dependencies
- FastAPI 0.104.1
- Uvicorn 0.24.0
- music21 9.1.0
- python-multipart 0.0.6
- python-osc 1.8.3

### Key Modules
- `main.py` - FastAPI application with all endpoints
- `scale_utils.py` - Scale definitions and music theory utilities
- `transformations.py` - Musical transformation algorithms (MusicTransformer class)

### API Endpoints
- `GET /` - Health check, returns `{"message": "MIDI Editor Backend"}`
- `POST /generate` - Generates scale-based MIDI file with custom parameters
- `POST /convert-recording` - Converts live MIDI recording events to MIDI file
- `POST /save-midi` - Saves edited MIDI notes as downloadable MIDI file
- `GET /settings` - Load current app settings from file
- `POST /settings` - Save app settings to file
- `POST /settings/upload` - Upload settings file
- `GET /settings/download` - Download settings file
- `POST /load-melody` - Load melody from JSON file with pattern arrays
- `POST /load-multi-layer-melody` - Load melodies for all 3 layers from JSON file
- `POST /export-supercollider` - Export layers to SuperCollider format with decoupled timing
- `POST /send-to-osc` - Send layer data to SuperCollider via OSC in real-time
- `POST /import-midi` - Import multi-track MIDI file, extracting up to 3 tracks (first 10 seconds)

#### Transformation Endpoints
- `POST /transform/analyze` - Analyze melody structure and patterns
- `POST /transform/counter-melody` - Generate counter melody with various motion types
- `POST /transform/harmonize` - Create harmony line at specified interval
- `POST /transform/transpose` - Transpose by semitones (chromatic)
- `POST /transform/transpose-diatonic` - Transpose by scale degrees (diatonic)
- `POST /transform/invert` - Melodic inversion around axis
- `POST /transform/augment` - Rhythmic augmentation (stretch timing)
- `POST /transform/diminish` - Rhythmic diminution (compress timing)
- `POST /transform/ornament` - Add musical ornamentations
- `POST /transform/develop` - Apply melodic development techniques

#### Gesture Endpoints
- `POST /gesture/simple-rhythm` - Generate repeating rhythmic pattern with rest intervals between notes

### Backend Setup Commands
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload  # Runs on http://localhost:8000
```

## Known Issues & Solutions

### Tone.js Import Issues
- **Problem**: Tone.js module imports can fail with webpack/Create React App
- **Solution**: Use `import * as Tone from 'tone'` syntax and ensure latest version (v15+)
- **Fallback**: If imports fail, try dynamic imports or CDN approach

### CORS Configuration
- Backend configured to allow requests from `http://localhost:3000`
- Modify `main.py` CORS settings if frontend runs on different port

### MIDI Generation with music21
- **Issue**: music21's `write()` method expects a file path, not a BytesIO object
- **Solution**: Use temporary file approach:
  ```python
  with tempfile.NamedTemporaryFile(suffix='.mid', delete=False) as tmp_file:
      s.write('midi', fp=tmp_file.name)
      # Read and return bytes
  ```
- **Scale Generation**: Supports 15+ scales with custom root note and octave
- **Supported Scales**: Major, Minor, Harmonic Minor, Melodic Minor, Pentatonic, Minor Pentatonic, Blues, Chromatic, Whole Tone, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian, Phrygian Dominant
- **Implementation**: Uses semitone intervals for consistent ascending patterns
- MIDI files returned as binary data with `audio/midi` content type

### Audio Playback
- Frontend uses Tone.js for audio synthesis with proper scheduling
- MidiPlayer component plays actual MIDI content (not hardcoded)
- Supports both generated and recorded MIDI with accurate timing and velocity
- Timeline component uses @tonejs/midi to parse MIDI file data

## Live MIDI Recording Features

### Web MIDI API Integration
- Automatic detection and connection to all available MIDI devices
- Device status display showing connected controllers
- Real-time MIDI event capture with microsecond precision timing
- Support for note on/off, velocity, and channel data

### Recording Workflow
- 3-second countdown before recording starts
- Visual progress indicator (0-10 seconds maximum)
- Auto-stop at 10 seconds or manual stop
- Real-time visualization of notes as they're being played
- Automatic conversion to standard MIDI format

### Recording Visual Feedback
- **Red markers**: Currently pressed keys (active notes)
- **Orange bars**: Completed notes during recording session
- **Green bars**: Final recorded/generated notes

## Multi-Layer Architecture

### Layer Management
- **3 Independent Layers**: Each with separate MIDI data, edit modes, and controls
- **Layer State Structure**: Each layer maintains its own:
  - MIDI data (raw and parsed)
  - Edit mode state
  - Selected notes
  - Mute/Solo status
  - Zoom level (shared across layers)
- **Synchronized Playback**: All layers play together with mute/solo controls
- **Independent Editing**: Each layer can be edited separately

### Multi-Layer Features
- **Load All Layers**: Upload JSON file to populate all 3 layers simultaneously
- **Import MIDI**: Import multi-track MIDI files, distributing up to 3 tracks to layers
- **Play All**: Synchronized playback of all non-muted layers
- **Clear All**: Reset all layers to empty state
- **Individual Layer Controls**: Generate, Record, Edit, Save per layer
- **Mute/Solo**: Control which layers are heard during playback
- **Visual Layer Headers**: Each layer shows name and mute/solo buttons

### JSON Melody Format
```json
{
  "layer1": {
    "pattern": [60, 62, 64, 65, 67],
    "duration": 0.5
  },
  "layer2": {
    "pattern": [48, 50, 52, 53, 55],
    "duration": 1.0
  },
  "layer3": {
    "pattern": [72, 74, 76, 77, 79],
    "duration": 0.25
  }
}
```

## Timeline Editor Features

### Current Implementation
- Canvas-based rendering (1200x200px per layer) - always visible
- Visual representation of MIDI notes on a grid
- Zoom controls (10% to 500%) with buttons or Ctrl/Cmd+scroll
- Horizontal scrolling with mouse wheel
- Note height visualization based on MIDI note number (0-127)
- Grid background for timing reference
- Multi-layer view with 3 stacked timelines

### Edit Mode Features
- **Toggle Edit Mode**: Enable/disable note editing with visual indicator
- **Note Selection**: Click notes to select (turn blue), Ctrl/Cmd+click for multi-select
- **Drag and Drop**: Move notes horizontally (time) and vertically (pitch)
- **Delete Notes**: Press Delete or Backspace key to delete selected notes
- **Real-time Preview**: Orange preview during dragging
- **Position Constraints**: Notes cannot go below time 0 or outside MIDI range
- **Visual States**: Green (normal), Blue (selected), Orange (dragging)

### Timeline Interaction
- **View Mode**: Zoom and pan only
- **Edit Mode**: Full editing capabilities
- Zoom: Use zoom buttons or Ctrl/Cmd + mouse wheel
- Pan: Scroll horizontally with mouse wheel
- Time scale: 100 pixels per second (adjustable with zoom)
- Click empty space to deselect all notes

### Musical Transformations
- **Transform Button**: Per-layer transformation controls
- **Transformation Types**:
  - **Analyze**: View intervals, contour, scale degrees, and phrase structure
  - **Counter Melody**: Generate complementary melody (contrary/parallel/oblique motion)
  - **Harmonize**: Add harmony line at 3rd, 5th, 6th, or octave
  - **Transpose**: Shift by semitones (chromatic) or scale degrees (diatonic)
  - **Invert**: Mirror melody around center, first, or last note
  - **Augment/Diminish**: Stretch or compress timing by factor
  - **Ornament**: Add decorations (classical, jazz, baroque, minimal styles)
  - **Develop**: Apply techniques (sequence, fragment, extend, retrograde)
- **Scale-Aware**: All transformations respect the selected scale and key
- **Real-time Processing**: Instant transformation results

### Musical Gestures
- **Gesture Button**: Per-layer algorithmic pattern generation
- **Gesture Types**:
  - **Simple Rhythm**: Create repeating rhythmic patterns with parameters:
    - Note: MIDI pitch to repeat (0-127)
    - Note Duration: How long each note plays (0.1-2.0 seconds)
    - Rest Interval: Rest period between notes as percentage of note duration (0-200%)
    - Gesture Duration: Total time the pattern runs (1-10 seconds)
- **Algorithm-based**: Generates patterns programmatically based on parameters
- **Layer Integration**: Generated patterns replace current layer content

## Scale Selection & Settings Features

### Scale Selection Toolbar
- **Scale Types**: 15 scales available via dropdown (Major, Minor, Pentatonic, Blues, Modes, etc.)
- **Root Note Selection**: All 12 chromatic notes (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
- **Octave Selection**: Choose from octaves 2-6
- **Real-time Updates**: Changes immediately affect new MIDI generation

### Settings Persistence
- **File-based Storage**: Settings saved to `settings.json` in backend directory
- **Auto-load on Startup**: App restores previous scale, key, and MIDI data
- **Manual Save/Load**: Save current settings or upload settings file
- **Download Settings**: Export settings as JSON file for backup/sharing
- **Included Data**: Scale type, root note, octave, zoom level, edit mode, last MIDI composition

### Settings Structure
```json
{
  "selectedScale": "major",
  "rootNote": "C", 
  "octave": 4,
  "zoomLevel": 100,
  "layers": [
    {
      "id": 0,
      "midiData": "[base64 encoded MIDI]",
      "editMode": false,
      "mute": false,
      "solo": false
    },
    {
      "id": 1,
      "midiData": "[base64 encoded MIDI]",
      "editMode": false,
      "mute": false,
      "solo": false
    },
    {
      "id": 2,
      "midiData": "[base64 encoded MIDI]",
      "editMode": false,
      "mute": false,
      "solo": false
    }
  ]
}
```

## MIDI Import Feature

### Import MIDI Files
- **Import Button**: Load external MIDI files from the Multi-Layer Actions toolbar
- **Multi-Track Support**: Automatically distributes tracks to layers:
  - Track 1 → Layer 1
  - Track 2 → Layer 2
  - Track 3 → Layer 3
  - Additional tracks are ignored
- **Time Limit**: Only imports first 10 seconds of MIDI data
- **Format Support**: Accepts .mid and .midi file extensions
- **Automatic Distribution**: Each track is processed independently and assigned to its respective layer

## File Export Features

### Save MIDI Functionality
- **Save Button**: Export edited compositions as standard MIDI files
- **Automatic Download**: Files saved as `edited-midi-[timestamp].mid`
- **Preserves Edits**: All timing, pitch, velocity, and duration changes included
- **Standard Format**: Compatible with all MIDI software and hardware

### SuperCollider Export
- **Export to SC**: Export all layers to JSON format for SuperCollider
- **Decoupled Timing**: Notes and timing are separated for maximum flexibility
- **Duration Types**:
  - **Absolute**: Note durations in seconds (default)
  - **Fractional**: Note durations as fractions of inter-onset intervals (0-1)
- **JSON Structure**:
  ```json
  {
    "metadata": {
      "exportDate": "2024-01-20",
      "source": "MIDI Editor",
      "format": "decoupled-timing"
    },
    "layers": {
      "layer0": {
        "metadata": {
          "durationType": "absolute",
          "totalDuration": 4.0,
          "key": "C",
          "scale": "major"
        },
        "notes": [
          {"midi": 60, "vel": 0.8, "dur": 0.6}
        ],
        "timing": [0.1, 0.3, 0.3, 0.3]
      }
    }
  }
  ```
- **Benefits**:
  - Independent manipulation of rhythm and melody
  - Easy tempo/timing transformations
  - Preserves all note relationships
  - Clean JSON format for easy parsing in SuperCollider

### OSC Real-time Communication
- **Send to OSC**: Send current layer data to SuperCollider via OSC
- **Real-time Updates**: Updates can be sent while SuperCollider is playing
- **OSC Details**:
  - Host: 127.0.0.1 (localhost)
  - Port: 57120 (SuperCollider default)
  - Message format: `/liveMelody/update/<layerName>`
- **Layer Mapping**:
  - Frontend layer 0 → SuperCollider layer1
  - Frontend layer 1 → SuperCollider layer2
  - Frontend layer 2 → SuperCollider layer3
- **Data Conversion**:
  - Velocity converted from 0-127 to 0.0-1.0 range
  - Timing array normalized to sum to 1.0
  - Includes metadata (key, scale, duration)

## Development Workflow

1. Start backend: `cd backend && source venv/bin/activate && uvicorn main:app --reload`
2. Start frontend: `cd frontend && npm start`
3. **Multi-Layer Mode**: Work with 3 independent layers simultaneously
4. **Load Content**: Use "Load All Layers" for JSON melody files or "Import MIDI" for multi-track MIDI files
5. **Select Scale**: Choose scale type, root note, and octave from toolbar
6. **Generate MIDI**: Click "Generate MIDI" on any layer to create scale pattern
7. **Record MIDI**: Connect MIDI device and click "Record MIDI" on any layer (max 10 seconds)
8. **Edit Notes**: Enable "Edit Mode" per layer to select and drag notes
9. **Transform Melodies**: Use "Transform" button to apply musical transformations
10. **Generate Gestures**: Use "Gesture" button to create algorithmic patterns (e.g., simple rhythms)
11. **Mute/Solo**: Control which layers play during "Play All"
12. **Save Settings**: Click "Save Settings" to persist all layers and configuration
13. **Save File**: Click "Save MIDI" on any layer to download that layer's composition
14. **Playback**: Use "Play MIDI" for single layer or "Play All" for multi-layer playback

## Error Handling

### Backend Errors
- Added try-catch to `/generate` endpoint
- Errors logged to console and returned as JSON
- Common error: music21 file path issues (resolved with temp file approach)

### Frontend Errors
- Fetch errors displayed in UI
- Audio context errors handled in MidiPlayer component
- MIDI parsing errors caught and displayed
- Content-type checking to detect backend JSON error responses
- MIDI device connection errors with fallback messaging
- Edit mode validation prevents invalid note positions

### Known Issues & Solutions

#### MIDI Object Property Access
- **Issue**: @tonejs/midi note objects have non-enumerable properties that don't survive spread operator
- **Solution**: Explicitly copy properties: `{time: note.time, midi: note.midi, duration: note.duration, velocity: note.velocity}`
- **Affects**: Edit mode note rendering and dragging functionality

#### Browser MIDI Permissions
- **Issue**: Web MIDI API requires user permission and HTTPS in some browsers
- **Solution**: Graceful fallback with error messaging when MIDI unavailable
- **Note**: Recording features disabled if no MIDI access granted

#### Settings File Management
- **Location**: `settings.json` created in `/backend` directory
- **Persistence**: Settings automatically loaded on app startup
- **Backup**: Use "Download Settings" to export for safe keeping
- **Git**: `settings.json` added to `.gitignore` to prevent accidental commits

## Testing Commands
- Backend: No specific test command configured
- Frontend: `npm test` (standard Create React App testing)

## Build Commands
- Backend: No build step required
- Frontend: `npm run build` for production build