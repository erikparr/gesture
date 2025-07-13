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
- `MultiLayerToolbar.js` - Toolbar for multi-layer actions (Load All, Play All, Clear All)
- `MultiLayerPlayer.js` - Handles synchronized playback of multiple layers with mute/solo

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
- **Supported Scales**: Major, Minor, Harmonic Minor, Melodic Minor, Pentatonic, Minor Pentatonic, Blues, Chromatic, Whole Tone, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian
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

## Timeline Editor Features

### Current Implementation
- Canvas-based rendering (1200x600px) - always visible
- Visual representation of MIDI notes on a grid
- Zoom controls (10% to 500%) with buttons or Ctrl/Cmd+scroll
- Horizontal scrolling with mouse wheel
- Note height visualization based on MIDI note number (0-127)
- Grid background for timing reference

### Edit Mode Features
- **Toggle Edit Mode**: Enable/disable note editing with visual indicator
- **Note Selection**: Click notes to select (turn blue), Ctrl/Cmd+click for multi-select
- **Drag and Drop**: Move notes horizontally (time) and vertically (pitch)
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
  "editMode": false,
  "lastMidiData": "[serialized MIDI data]"
}
```

## File Export Feature

### Save MIDI Functionality
- **Save Button**: Export edited compositions as standard MIDI files
- **Automatic Download**: Files saved as `edited-midi-[timestamp].mid`
- **Preserves Edits**: All timing, pitch, velocity, and duration changes included
- **Standard Format**: Compatible with all MIDI software and hardware

## Development Workflow

1. Start backend: `cd backend && source venv/bin/activate && uvicorn main:app --reload`
2. Start frontend: `cd frontend && npm start`
3. **Select Scale**: Choose scale type, root note, and octave from toolbar
4. **Generate MIDI**: Click "Generate MIDI" to create scale pattern with selected parameters
5. **Record MIDI**: Connect MIDI device and click "Record MIDI" (max 10 seconds)
6. **Edit Notes**: Enable "Edit Mode" to select and drag notes
7. **Save Settings**: Click "Save Settings" to persist current configuration
8. **Save File**: Click "Save MIDI" to download edited composition
9. **Playback**: Use "Play MIDI" to hear current composition

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