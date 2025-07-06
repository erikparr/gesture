from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse
from pydantic import BaseModel
from typing import List, Optional
from music21 import stream, note, tempo, meter, duration, scale
import io
import json
import os
from pathlib import Path
from scale_utils import get_scale_intervals

class MidiEvent(BaseModel):
    type: str  # 'noteOn' or 'noteOff'
    note: int
    velocity: int
    timestamp: float
    channel: int

class RecordingData(BaseModel):
    events: List[MidiEvent]
    duration: float

class SaveNote(BaseModel):
    midi: int
    time: float
    duration: float
    velocity: float

class SaveMidiData(BaseModel):
    notes: List[SaveNote]

class GenerateParams(BaseModel):
    scale_type: str = "major"
    root_note: str = "C"
    octave: int = 4
    num_notes: int = 8

class Settings(BaseModel):
    selectedScale: str = "major"
    rootNote: str = "C"
    octave: int = 4
    zoomLevel: float = 100
    editMode: bool = False
    lastMidiData: Optional[str] = None

app = FastAPI()

# Settings file path
SETTINGS_FILE = Path("./settings.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "MIDI Editor Backend"}

@app.post("/generate")
def generate_midi(params: GenerateParams):
    try:
        # Create a simple melody
        s = stream.Stream()
        s.append(tempo.TempoIndication(number=120))
        s.append(meter.TimeSignature('4/4'))
        
        # Get scale intervals from our utility module
        intervals = get_scale_intervals(params.scale_type)
        
        # Convert root note to MIDI number
        root_note_obj = note.Note(f"{params.root_note}{params.octave}")
        root_midi = root_note_obj.pitch.midi
        
        # Generate ascending notes
        for i in range(params.num_notes):
            scale_degree = i % len(intervals)
            octave_offset = i // len(intervals)
            
            midi_note = root_midi + intervals[scale_degree] + (octave_offset * 12)
            n = note.Note(midi=midi_note)
            n.duration = duration.Duration(0.5)  # Half note
            s.append(n)
        
        # Convert to MIDI bytes
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.mid', delete=False) as tmp_file:
            s.write('midi', fp=tmp_file.name)
            tmp_file.flush()
            with open(tmp_file.name, 'rb') as f:
                midi_bytes = f.read()
            os.unlink(tmp_file.name)
        
        return Response(
            content=midi_bytes,
            media_type="audio/midi",
            headers={"Content-Disposition": "attachment; filename=generated.mid"}
        )
    except Exception as e:
        print(f"Error generating MIDI: {str(e)}")
        return {"error": str(e)}

@app.post("/convert-recording")
def convert_recording(recording_data: RecordingData):
    try:
        # Create a new stream
        s = stream.Stream()
        s.append(tempo.TempoIndication(number=120))
        s.append(meter.TimeSignature('4/4'))
        
        # Group events by note to match note on/off pairs
        note_states = {}  # note_number -> {'start_time': float, 'velocity': int}
        
        # Sort events by timestamp
        sorted_events = sorted(recording_data.events, key=lambda e: e.timestamp)
        
        # Process events to create notes
        notes_to_add = []
        
        for event in sorted_events:
            if event.type == 'noteOn' and event.velocity > 0:
                # Note on event
                note_states[event.note] = {
                    'start_time': event.timestamp / 1000.0,  # Convert ms to seconds
                    'velocity': event.velocity
                }
            elif event.type == 'noteOff' or (event.type == 'noteOn' and event.velocity == 0):
                # Note off event
                if event.note in note_states:
                    start_time = note_states[event.note]['start_time']
                    end_time = event.timestamp / 1000.0
                    note_duration = end_time - start_time
                    
                    if note_duration > 0:
                        # Create a note
                        n = note.Note(event.note)
                        n.duration = duration.Duration(quarterLength=note_duration * 2)  # Assuming 120 BPM
                        n.offset = start_time * 2  # Convert to quarter note offsets
                        n.volume.velocity = note_states[event.note]['velocity']
                        notes_to_add.append(n)
                    
                    del note_states[event.note]
        
        # Handle any notes that didn't receive a note off (use recording duration)
        for note_num, note_info in note_states.items():
            start_time = note_info['start_time']
            end_time = recording_data.duration / 1000.0
            note_duration = end_time - start_time
            
            if note_duration > 0:
                n = note.Note(note_num)
                n.duration = duration.Duration(quarterLength=note_duration * 2)
                n.offset = start_time * 2
                n.volume.velocity = note_info['velocity']
                notes_to_add.append(n)
        
        # Sort notes by offset and add to stream
        notes_to_add.sort(key=lambda n: n.offset)
        for n in notes_to_add:
            s.insert(n.offset, n)
        
        # Convert to MIDI bytes
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.mid', delete=False) as tmp_file:
            s.write('midi', fp=tmp_file.name)
            tmp_file.flush()
            with open(tmp_file.name, 'rb') as f:
                midi_bytes = f.read()
            import os
            os.unlink(tmp_file.name)
        
        return Response(
            content=midi_bytes,
            media_type="audio/midi",
            headers={"Content-Disposition": "attachment; filename=recorded.mid"}
        )
    except Exception as e:
        print(f"Error converting recording: {str(e)}")
        return {"error": str(e)}

@app.post("/save-midi")
def save_midi(save_data: SaveMidiData):
    try:
        # Create a new stream
        s = stream.Stream()
        s.append(tempo.TempoIndication(number=120))
        s.append(meter.TimeSignature('4/4'))
        
        # Sort notes by time
        sorted_notes = sorted(save_data.notes, key=lambda n: n.time)
        
        # Add notes to stream
        for note_data in sorted_notes:
            n = note.Note(note_data.midi)
            n.duration = duration.Duration(quarterLength=note_data.duration * 2)  # Assuming 120 BPM
            n.offset = note_data.time * 2  # Convert to quarter note offsets
            n.volume.velocity = int(note_data.velocity * 127)  # Convert to MIDI velocity
            s.insert(n.offset, n)
        
        # Convert to MIDI bytes
        import tempfile
        with tempfile.NamedTemporaryFile(suffix='.mid', delete=False) as tmp_file:
            s.write('midi', fp=tmp_file.name)
            tmp_file.flush()
            with open(tmp_file.name, 'rb') as f:
                midi_bytes = f.read()
            import os
            os.unlink(tmp_file.name)
        
        return Response(
            content=midi_bytes,
            media_type="audio/midi",
            headers={"Content-Disposition": "attachment; filename=edited-midi.mid"}
        )
    except Exception as e:
        print(f"Error saving MIDI: {str(e)}")
        return {"error": str(e)}

@app.get("/settings")
def get_settings():
    try:
        if SETTINGS_FILE.exists():
            with open(SETTINGS_FILE, 'r') as f:
                return json.load(f)
        else:
            # Return default settings
            return Settings().dict()
    except Exception as e:
        print(f"Error loading settings: {str(e)}")
        return Settings().dict()

@app.post("/settings")
def save_settings(settings: Settings):
    try:
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(settings.dict(), f, indent=2)
        return {"message": "Settings saved successfully"}
    except Exception as e:
        print(f"Error saving settings: {str(e)}")
        return {"error": str(e)}

@app.post("/settings/upload")
async def upload_settings(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        settings_data = json.loads(contents)
        
        # Validate the settings
        settings = Settings(**settings_data)
        
        # Save to file
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(settings.dict(), f, indent=2)
        
        return {"message": "Settings uploaded successfully", "settings": settings.dict()}
    except Exception as e:
        print(f"Error uploading settings: {str(e)}")
        return {"error": str(e)}

@app.get("/settings/download")
def download_settings():
    try:
        if not SETTINGS_FILE.exists():
            # Create default settings file
            default_settings = Settings()
            with open(SETTINGS_FILE, 'w') as f:
                json.dump(default_settings.dict(), f, indent=2)
        
        return FileResponse(
            path=SETTINGS_FILE,
            media_type="application/json",
            filename="gesture-edit-settings.json"
        )
    except Exception as e:
        print(f"Error downloading settings: {str(e)}")
        return {"error": str(e)}