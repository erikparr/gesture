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
- `App.js` - Main component handling state and API calls
- `GenerateButton.js` - Button component for generating MIDI files
- `MidiPlayer.js` - Component for playing MIDI files using Tone.js
- `Timeline.js` - Canvas-based timeline component for visualizing MIDI notes

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
- `GET /generate` - Generates C major scale MIDI file and returns binary data

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
- Currently generates simple C major scale: `['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']`
- MIDI files returned as binary data with `audio/midi` content type

### Audio Playback
- Frontend uses Tone.js for audio synthesis
- MidiPlayer component plays hardcoded notes that match backend generation
- Timeline component uses @tonejs/midi to parse actual MIDI file data

## Timeline Editor Features

### Current Implementation
- Canvas-based rendering (1200x600px)
- Visual representation of MIDI notes on a grid
- Zoom controls (10% to 500%) with buttons or Ctrl/Cmd+scroll
- Horizontal scrolling with mouse wheel
- Note height visualization based on MIDI note number (0-127)
- Grid background for timing reference

### Timeline Interaction
- Zoom: Use zoom buttons or Ctrl/Cmd + mouse wheel
- Pan: Scroll horizontally with mouse wheel
- Time scale: 100 pixels per second (adjustable with zoom)

## Development Workflow

1. Start backend: `cd backend && uvicorn main:app --reload`
2. Start frontend: `cd frontend && npm start`
3. Frontend fetches MIDI from `http://localhost:8000/generate`
4. MIDI data is parsed using @tonejs/midi
5. Timeline displays parsed MIDI notes visually
6. MidiPlayer uses Tone.js to synthesize audio

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

## Testing Commands
- Backend: No specific test command configured
- Frontend: `npm test` (standard Create React App testing)

## Build Commands
- Backend: No build step required
- Frontend: `npm run build` for production build