from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse
from pydantic import BaseModel
from typing import List, Optional
from music21 import stream, note, tempo, meter, duration, scale
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

class CounterpointNote(BaseModel):
    midi: int
    time: float
    duration: float
    velocity: float

class CounterpointRequest(BaseModel):
    notes: List[CounterpointNote]
    key: str
    scale_type: str

class JsonMelodyData(BaseModel):
    melody_index: int = 0

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

@app.post("/generate_counterpoint")
def generate_counterpoint(request: CounterpointRequest):
    try:
        # Get scale notes for the given key
        if request.scale_type == "major":
            s = scale.MajorScale(request.key)
        elif request.scale_type == "minor":
            s = scale.MinorScale(request.key)
        else:
            # Default to major if unknown scale type
            s = scale.MajorScale(request.key)
        
        scale_pitches = [p.midi for p in s.pitches]
        
        # Generate interspaced counterpoint using alternating timeline approach
        # This creates a new timeline where original and counterpoint notes alternate
        alternating_notes = []
        
        for i, original_note in enumerate(request.notes):
            # Step 1: Recalculate original note timing (double-spaced)
            new_original_time = i * (original_note.duration * 2)
            
            # Add re-timed original note
            alternating_notes.append({
                "midi": original_note.midi,
                "time": new_original_time,
                "duration": original_note.duration,
                "velocity": original_note.velocity,
                "id": f"orig-{i}"
            })
            
            # Step 2: Calculate counterpoint note timing and pitch
            cp_time = new_original_time + original_note.duration
            cp_duration = original_note.duration
            
            # Determine motion direction for pitch
            prefer_direction = -1  # Default: start below
            if i > 0:
                motion = original_note.midi - request.notes[i-1].midi
                prefer_direction = -1 if motion > 0 else 1  # Contrary motion
            
            # Try intervals in order of preference [3rd, 6th, 5th, octave]
            intervals = [4, 9, 7, 12]  # Semitones
            
            found_valid_note = False
            for interval in intervals:
                candidate = original_note.midi + (interval * prefer_direction)
                
                # Check if in reasonable range (C3 to C6)
                if 48 <= candidate <= 84:
                    # Snap to scale
                    candidate = snap_to_scale(candidate, scale_pitches)
                    
                    alternating_notes.append({
                        "midi": candidate,
                        "time": cp_time,
                        "duration": cp_duration,
                        "velocity": original_note.velocity * 0.7,
                        "id": f"cp-{i}"
                    })
                    found_valid_note = True
                    break
            
            # Fallback: use a 3rd above if nothing else worked
            if not found_valid_note:
                candidate = original_note.midi + 4
                candidate = snap_to_scale(candidate, scale_pitches)
                alternating_notes.append({
                    "midi": candidate,
                    "time": cp_time,
                    "duration": cp_duration,
                    "velocity": original_note.velocity * 0.7,
                    "id": f"cp-{i}"
                })
        
        # Return ALL notes (both re-timed originals and counterpoint)
        return {"counterpoint": alternating_notes}
        
    except Exception as e:
        print(f"Error generating counterpoint: {str(e)}")
        return {"error": str(e)}

def snap_to_scale(midi_note, scale_pitches):
    """Snap a MIDI note to the nearest note in the scale."""
    # Get the note within an octave (0-11)
    note_class = midi_note % 12
    octave = midi_note // 12
    
    # Find scale degrees within the octave
    scale_degrees = [p % 12 for p in scale_pitches]
    scale_degrees = sorted(list(set(scale_degrees)))  # Remove duplicates and sort
    
    # Find the closest scale degree
    closest_degree = min(scale_degrees, key=lambda x: abs(x - note_class))
    
    # Reconstruct the MIDI note
    result = octave * 12 + closest_degree
    
    # Handle edge cases where snapping might have moved us too far
    if abs(result - midi_note) > 6:  # More than a tritone away
        # Try the next octave
        if result < midi_note:
            result += 12
        else:
            result -= 12
    
    return result

@app.post("/load-json-melody")
async def load_json_melody(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        melody_data = json.loads(contents)
        
        # Validate JSON structure
        if "melodies" not in melody_data or not melody_data["melodies"]:
            return {"error": "Invalid JSON format: missing melodies array"}
        
        # Use the first active melody or first melody if none are active
        selected_melody = None
        for melody in melody_data["melodies"]:
            if melody.get("active", False):
                selected_melody = melody
                break
        
        if not selected_melody:
            selected_melody = melody_data["melodies"][0]
        
        # Validate melody structure
        if "pattern" not in selected_melody:
            return {"error": "Invalid melody format: missing pattern"}
        
        pattern = selected_melody["pattern"]
        velocity_first = selected_melody.get("velocityFirst", 1.0)
        velocity_last = selected_melody.get("velocityLast", 1.0)
        
        # Create a new stream
        s = stream.Stream()
        s.append(tempo.TempoIndication(number=120))
        s.append(meter.TimeSignature('4/4'))
        
        # Convert pattern to MIDI notes
        default_duration = 0.5  # Half second per note
        
        for i, midi_note in enumerate(pattern):
            # Calculate velocity interpolation
            if len(pattern) > 1:
                velocity_ratio = i / (len(pattern) - 1)
                velocity = velocity_first + (velocity_last - velocity_first) * velocity_ratio
            else:
                velocity = velocity_first
            
            # Normalize velocity to 0-1 range, then to MIDI range
            velocity = max(0.1, min(1.0, velocity))  # Clamp between 0.1 and 1.0
            
            # Create note
            n = note.Note(midi=midi_note)
            n.duration = duration.Duration(quarterLength=default_duration * 2)  # Assuming 120 BPM
            n.offset = i * default_duration * 2  # Sequential timing
            n.volume.velocity = int(velocity * 127)
            s.insert(n.offset, n)
        
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
            headers={"Content-Disposition": "attachment; filename=json-melody.mid"}
        )
    except json.JSONDecodeError:
        return {"error": "Invalid JSON file"}
    except Exception as e:
        print(f"Error loading JSON melody: {str(e)}")
        return {"error": str(e)}

@app.post("/load-multi-layer-melody")
async def load_multi_layer_melody(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        melody_data = json.loads(contents)
        
        # Validate JSON structure
        if "melodies" not in melody_data or not melody_data["melodies"]:
            return {"error": "Invalid JSON format: missing melodies array"}
        
        # Process each layer
        layer_midis = {}
        
        for melody in melody_data["melodies"]:
            if not melody.get("active", False):
                continue
                
            layer_key = melody.get("key", "")
            if layer_key not in ["layer1", "layer2", "layer3"]:
                continue
                
            pattern = melody.get("pattern", [])
            if not pattern:
                continue
                
            velocity_first = melody.get("velocityFirst", 1.0)
            velocity_last = melody.get("velocityLast", 1.0)
            
            # Create a new stream for this layer
            s = stream.Stream()
            s.append(tempo.TempoIndication(number=120))
            s.append(meter.TimeSignature('4/4'))
            
            # Convert pattern to MIDI notes
            default_duration = 0.5  # Half second per note
            
            for i, midi_note in enumerate(pattern):
                # Calculate velocity interpolation
                if len(pattern) > 1:
                    velocity_ratio = i / (len(pattern) - 1)
                    velocity = velocity_first + (velocity_last - velocity_first) * velocity_ratio
                else:
                    velocity = velocity_first
                
                # Normalize velocity to 0-1 range, then to MIDI range
                velocity = max(0.1, min(1.0, velocity))  # Clamp between 0.1 and 1.0
                
                # Create note
                n = note.Note(midi=midi_note)
                n.duration = duration.Duration(quarterLength=default_duration * 2)  # Assuming 120 BPM
                n.offset = i * default_duration * 2  # Sequential timing
                n.volume.velocity = int(velocity * 127)
                s.insert(n.offset, n)
            
            # Convert to MIDI bytes
            import tempfile
            with tempfile.NamedTemporaryFile(suffix='.mid', delete=False) as tmp_file:
                s.write('midi', fp=tmp_file.name)
                tmp_file.flush()
                with open(tmp_file.name, 'rb') as f:
                    midi_bytes = f.read()
                os.unlink(tmp_file.name)
            
            # Map layer key to layer index
            layer_index = int(layer_key[-1]) - 1  # layer1 -> 0, layer2 -> 1, layer3 -> 2
            layer_midis[layer_index] = midi_bytes
        
        # Return the MIDI files as a multipart response
        import base64
        response_data = {}
        for layer_index, midi_bytes in layer_midis.items():
            response_data[f"layer{layer_index}"] = base64.b64encode(midi_bytes).decode('utf-8')
        
        return {"layers": response_data}
        
    except json.JSONDecodeError:
        return {"error": "Invalid JSON file"}
    except Exception as e:
        print(f"Error loading multi-layer melody: {str(e)}")
        return {"error": str(e)}