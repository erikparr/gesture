# MIDI Editor App

A comprehensive interactive MIDI editing application with React frontend and Python FastAPI backend. Record from MIDI devices, edit notes visually, and export compositions.

## Features

### 🎹 Live MIDI Recording
- **Real-time Recording**: Connect any MIDI keyboard/controller via Web MIDI API
- **Visual Feedback**: See notes appear on timeline as you play them
- **Accurate Timing**: Microsecond precision timing preservation
- **10-Second Sessions**: Perfect for short musical phrases and loops

### ✏️ Interactive Note Editing
- **Edit Mode**: Toggle between view and edit modes
- **Drag & Drop**: Move notes to change timing and pitch
- **Multi-Select**: Select multiple notes with Ctrl/Cmd+click
- **Visual Feedback**: Blue selection, orange drag preview
- **Constraints**: Prevent invalid positions (negative time, out-of-range pitches)

### 🎵 Audio Playback
- **Accurate Playback**: Plays actual MIDI content with correct timing and velocity
- **Real-time Synthesis**: Uses Tone.js for high-quality audio rendering
- **Timeline Sync**: Audio matches exactly what's displayed visually

### 🎼 Scale-Based Composition
- **15+ Musical Scales**: Major, Minor, Pentatonic, Blues, All Modes (Dorian, Phrygian, Lydian, etc.)
- **Custom Root Notes**: All 12 chromatic notes (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
- **Octave Selection**: Choose from octaves 2-6
- **Ascending Patterns**: Generate perfect ascending scale sequences

### 📁 File Management & Settings  
- **Scale-Based Generation**: Create MIDI patterns in any scale and key
- **Settings Persistence**: App remembers your scale, key, and compositions
- **Auto-Save**: Settings saved to file automatically
- **Import/Export Settings**: Upload/download settings files for backup/sharing
- **Export MIDI**: Save edited compositions as standard MIDI files
- **Standard Format**: Compatible with all DAWs and MIDI software

### 🖼️ Visual Timeline
- **Always-On Display**: Timeline visible for all operations
- **Zoom & Pan**: 10%-500% zoom with mouse wheel controls
- **Grid Layout**: Clear timing and pitch visualization
- **Color-Coded States**: Green (normal), Red (recording), Blue (selected), Orange (editing)

## Setup

### Backend (Python)

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Create virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run server:
   ```bash
   uvicorn main:app --reload
   ```

**Important**: Always activate the virtual environment before starting the backend:
```bash
cd backend
source venv/bin/activate  # This is required every time you start the server
uvicorn main:app --reload
```

Backend will run on http://localhost:8000

### Frontend (React)

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm start
   ```

Frontend will run on http://localhost:3000

## Usage

### Quick Start
1. Start both backend and frontend servers
2. Open http://localhost:3000 in your browser
3. **Select Scale**: Choose scale type, root note, and octave from the toolbar
4. **Generate Pattern**: Click "Generate MIDI" to create an ascending scale pattern
5. **Play Audio**: Click "Play MIDI" to hear the composition
6. **Edit Notes**: Click "Edit Mode" to select and drag notes
7. **Save Settings**: Click "Save Settings" to persist your configuration
8. **Save Work**: Click "Save MIDI" to download your composition

### MIDI Recording Workflow
1. **Connect Device**: Plug in MIDI keyboard/controller (auto-detected)
2. **Start Recording**: Click "Record MIDI" button
3. **3-Second Countdown**: Prepare to play
4. **Record Performance**: Play your MIDI device (max 10 seconds)
5. **Auto-Stop**: Recording stops automatically or click "Stop"
6. **Edit Result**: Use edit mode to refine the recorded notes
7. **Export**: Save as standard MIDI file

### Edit Mode Controls
- **Click Note**: Select individual note (turns blue)
- **Ctrl/Cmd+Click**: Add notes to selection
- **Drag Notes**: Move horizontally (time) or vertically (pitch)
- **Click Empty Space**: Deselect all notes
- **Zoom**: Ctrl/Cmd + mouse wheel or zoom buttons
- **Pan**: Mouse wheel horizontal scroll

## Technical Details

### Frontend Architecture
- **React 18.2.0** with functional components and hooks
- **Tone.js v15.1.22** for audio synthesis and MIDI playback
- **@tonejs/midi** for MIDI file parsing and processing
- **Web MIDI API** for live device input
- **Canvas-based Timeline** for high-performance note visualization

### Backend Architecture  
- **FastAPI 0.104.1** for REST API with automatic OpenAPI documentation
- **music21 9.1.0** for MIDI generation and processing
- **Uvicorn** ASGI server for high-performance async handling

## Supported Scales

**Western Scales**: Major, Minor, Harmonic Minor, Melodic Minor  
**Pentatonic**: Major Pentatonic, Minor Pentatonic  
**Blues**: Blues Scale  
**Modes**: Dorian, Phrygian, Lydian, Mixolydian, Aeolian (Natural Minor), Locrian  
**Other**: Chromatic, Whole Tone

All scales support any root note (C, C#, D, D#, E, F, F#, G, G#, A, A#, B) and octaves 2-6.

## API Endpoints

- `GET /` - Health check and status
- `POST /generate` - Generate scale-based MIDI with custom parameters
- `POST /convert-recording` - Convert live recording to MIDI file
- `POST /save-midi` - Export edited notes as downloadable MIDI
- `GET /settings` - Load current app settings
- `POST /settings` - Save app settings to file
- `POST /settings/upload` - Upload settings file
- `GET /settings/download` - Download settings file

## Browser Requirements

- **Modern Browser**: Chrome 43+, Firefox 59+, Safari 14.1+, Edge 79+
- **MIDI Support**: Web MIDI API (Chrome/Chromium recommended)
- **HTTPS**: Required for MIDI access in production environments
- **Audio Context**: Modern browsers with Web Audio API support

## Troubleshooting

### MIDI Device Not Detected
1. Ensure device is connected before opening the app
2. Grant MIDI permissions when browser prompts
3. Try refreshing the page after connecting device
4. Check browser console for MIDI API errors

### Audio Not Playing
1. Click somewhere on the page to activate audio context
2. Check browser's autoplay policy settings
3. Ensure speakers/headphones are connected
4. Look for audio context errors in console

### Notes Not Appearing in Edit Mode
1. Ensure MIDI content exists (generate or record first)
2. Check that edit mode is properly enabled (blue indicator)
3. Try refreshing the page if timeline appears empty
4. Verify browser console for rendering errors