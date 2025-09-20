from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from music21 import stream, note, tempo, meter, duration, scale, converter
import json
import os
from pathlib import Path
from scale_utils import get_scale_intervals
import base64
from datetime import datetime
from transformations import MusicTransformer
from pythonosc import udp_client
import logging

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

class SuperColliderExportRequest(BaseModel):
    layers: Dict[str, Any]
    duration_type: str = "absolute"  # "absolute" or "fractional"
    format_type: str = "standard"

class TransformNote(BaseModel):
    midi: int
    time: float
    duration: float
    velocity: float = 0.7

class TransformRequest(BaseModel):
    notes: List[TransformNote]
    scale_type: str
    root_note: str
    # Transform-specific parameters
    style: Optional[str] = None
    interval: Optional[int] = None
    semitones: Optional[int] = None
    axis: Optional[str] = None
    factor: Optional[float] = None
    method: Optional[str] = None

class GestureRequest(BaseModel):
    scale_type: str
    root_note: str
    # Gesture-specific parameters
    gesture_type: str
    note: Optional[int] = None
    note_duration: Optional[float] = None
    interval: Optional[float] = None  # percentage 1-100
    gesture_duration: Optional[float] = None

class MultiLayerGestureLayerConfig(BaseModel):
    layerId: int
    midiNote: int
    durationPercent: float  # 1-100%
    totalDuration: float  # 1-10 seconds
    numNotes: int  # 1-100 notes

class MultiLayerGestureRequest(BaseModel):
    layers: List[MultiLayerGestureLayerConfig]
    scale_type: str
    root_note: str

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

def convert_to_decoupled_format(notes: List[Dict], duration_type: str = "absolute", 
                                root_note: str = "C", scale_type: str = "major") -> Dict:
    """Convert MIDI notes to decoupled format with fractional timing."""
    if not notes:
        return {
            'metadata': {
                'durationType': duration_type,
                'totalDuration': 0,
                'key': root_note,
                'scale': scale_type
            },
            'notes': [],
            'timing': [1.0]
        }
    
    # Sort notes by time
    sorted_notes = sorted(notes, key=lambda n: n['time'])
    
    # Calculate total duration
    total_duration = max(n['time'] + n['duration'] for n in sorted_notes)
    
    # Extract note events
    note_events = []
    for note in sorted_notes:
        event = {
            'midi': note['midi'],
            'vel': note.get('velocity', 0.7),
            'dur': note['duration']  # Keep original duration
        }
        note_events.append(event)
    
    # Calculate normalized inter-onset intervals
    timing = []
    
    # Initial delay
    if sorted_notes[0]['time'] > 0:
        timing.append(sorted_notes[0]['time'] / total_duration)
    else:
        timing.append(0.0)
    
    # Inter-note intervals
    for i in range(1, len(sorted_notes)):
        interval = (sorted_notes[i]['time'] - sorted_notes[i-1]['time']) / total_duration
        timing.append(interval)
    
    # Final padding
    last_note_start = sorted_notes[-1]['time']
    final_padding = (total_duration - last_note_start) / total_duration
    timing.append(final_padding)
    
    # Convert durations if fractional type
    if duration_type == "fractional":
        for i, note in enumerate(note_events):
            # Calculate available time until next note
            if i < len(note_events) - 1:
                available_time = timing[i+1] * total_duration
            else:
                available_time = timing[-1] * total_duration
            
            # Convert to fraction
            if available_time > 0:
                note['dur'] = min(1.0, note['dur'] / available_time)
            else:
                note['dur'] = 1.0
    
    return {
        'metadata': {
            'durationType': duration_type,
            'totalDuration': total_duration,
            'key': root_note,
            'scale': scale_type
        },
        'notes': note_events,
        'timing': timing
    }

def generate_supercollider_json(layers_data: Dict, format_type: str = "standard") -> str:
    """Generate JSON data for SuperCollider from layer data."""
    export_data = {
        "metadata": {
            "exportDate": datetime.now().strftime('%Y-%m-%d'),
            "exportTime": datetime.now().strftime('%H:%M:%S'),
            "source": "MIDI Editor",
            "format": "decoupled-timing"
        },
        "layers": {}
    }
    
    # Add each layer's data
    for layer_name, layer_data in layers_data.items():
        if not layer_data['notes']:
            continue
            
        export_data["layers"][layer_name] = {
            "metadata": layer_data['metadata'],
            "notes": layer_data['notes'],
            "timing": layer_data['timing']
        }
    
    return json.dumps(export_data, indent=2)

@app.post("/export-supercollider")
async def export_supercollider(request: SuperColliderExportRequest):
    """Export layer data to SuperCollider format with decoupled timing."""
    try:
        layers_data = {}
        
        # Get current settings for key and scale
        settings = {}
        if SETTINGS_FILE.exists():
            with open(SETTINGS_FILE, 'r') as f:
                settings = json.load(f)
        
        root_note = settings.get('rootNote', 'C')
        scale_type = settings.get('selectedScale', 'major')
        
        # Process each layer
        for layer_id, layer_data in request.layers.items():
            if not layer_data.get('parsedMidi'):
                continue
            
            # Extract notes from parsed MIDI
            notes = []
            parsed_midi = layer_data['parsedMidi']
            
            if 'tracks' in parsed_midi:
                for track in parsed_midi['tracks']:
                    if 'notes' in track:
                        for note in track['notes']:
                            notes.append({
                                'midi': note['midi'],
                                'time': note['time'],
                                'duration': note['duration'],
                                'velocity': note.get('velocity', 0.7)
                            })
            
            if notes:
                # Convert to decoupled format
                melody_data = convert_to_decoupled_format(
                    notes,
                    duration_type=request.duration_type,
                    root_note=root_note,
                    scale_type=scale_type
                )
                
                layers_data[f"layer{layer_id}"] = melody_data
        
        if not layers_data:
            return {"error": "No valid layer data to export"}
        
        # Generate JSON for SuperCollider
        json_content = generate_supercollider_json(layers_data, request.format_type)
        
        # Return as downloadable JSON file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"sc_export_{timestamp}.json"
        
        return Response(
            content=json_content,
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        print(f"Error exporting to SuperCollider: {str(e)}")
        return {"error": str(e)}

@app.post("/send-to-osc")
async def send_to_osc(request: SuperColliderExportRequest):
    """Send layer data to SuperCollider via OSC in real-time."""
    try:
        # Create OSC client
        osc_client = udp_client.SimpleUDPClient("127.0.0.1", 57120)
        
        # Get current settings for key and scale
        settings = {}
        if SETTINGS_FILE.exists():
            with open(SETTINGS_FILE, 'r') as f:
                settings = json.load(f)
        
        root_note = settings.get('rootNote', 'C')
        scale_type = settings.get('selectedScale', 'major')
        
        # Layer name mapping (frontend to SuperCollider)
        layer_mapping = {
            "0": "layer1",
            "1": "layer2",
            "2": "layer3"
        }
        
        sent_layers = []
        
        # Process each layer
        for layer_id, layer_data in request.layers.items():
            if not layer_data.get('parsedMidi'):
                continue
            
            # Get the SuperCollider layer name
            sc_layer_name = layer_mapping.get(str(layer_id), f"layer{int(layer_id)+1}")
            
            # Extract notes from parsed MIDI
            notes = []
            parsed_midi = layer_data['parsedMidi']
            
            if 'tracks' in parsed_midi:
                for track in parsed_midi['tracks']:
                    if 'notes' in track:
                        for note in track['notes']:
                            notes.append({
                                'midi': note['midi'],
                                'time': note['time'],
                                'duration': note['duration'],
                                'velocity': note.get('velocity', 0.7)
                            })
            
            if notes:
                # Sort notes by time
                notes.sort(key=lambda n: n['time'])
                
                # Convert to SuperCollider format
                sc_notes = []
                for note in notes:
                    sc_notes.append({
                        'midi': note['midi'],
                        'vel': note['velocity'] / 127.0 if note['velocity'] > 1 else note['velocity'],  # Convert to 0-1 range
                        'dur': note['duration']
                    })
                
                # Calculate timing array
                timing = []
                if notes:
                    # Initial delay (time before first note)
                    timing.append(notes[0]['time'] if notes[0]['time'] > 0 else 0.0)
                    
                    # Inter-onset intervals
                    for i in range(1, len(notes)):
                        interval = notes[i]['time'] - notes[i-1]['time']
                        timing.append(interval if interval > 0 else 0.0)
                    
                    # Final wait (arbitrary, use 0.2 of total duration)
                    total_duration = max(n['time'] + n['duration'] for n in notes)
                    timing.append(total_duration * 0.2)
                    
                    # Normalize timing to sum to 1.0
                    timing_sum = sum(timing)
                    if timing_sum > 0:
                        timing = [t / timing_sum for t in timing]
                    else:
                        # Fallback: evenly distribute
                        timing = [1.0 / (len(notes) + 1)] * (len(notes) + 1)
                
                # Create OSC message
                osc_data = {
                    "notes": sc_notes,
                    "timing": timing,
                    "metadata": {
                        "durationType": request.duration_type,
                        "totalDuration": max(n['time'] + n['duration'] for n in notes) if notes else 0,
                        "key": root_note,
                        "scale": scale_type
                    }
                }
                
                # Send OSC message
                osc_path = f"/liveMelody/update/{sc_layer_name}"
                osc_client.send_message(osc_path, json.dumps(osc_data))
                sent_layers.append(sc_layer_name)
                
                logging.info(f"Sent OSC message to {osc_path}")
        
        if not sent_layers:
            return {"error": "No valid layer data to send"}
        
        return {
            "success": True,
            "message": f"Successfully sent {len(sent_layers)} layers to SuperCollider",
            "layers": sent_layers
        }
        
    except Exception as e:
        logging.error(f"Error sending to OSC: {str(e)}")
        return {"error": str(e)}

# Transformation endpoints
@app.post("/transform/analyze")
def analyze_melody(request: TransformRequest):
    """Analyze melody structure and patterns"""
    try:
        transformer = MusicTransformer(request.scale_type, request.root_note)
        notes_data = [note.dict() for note in request.notes]
        analysis = transformer.analyze_melody(notes_data)
        return analysis
    except Exception as e:
        print(f"Error analyzing melody: {str(e)}")
        return {"error": str(e)}

@app.post("/transform/counter-melody")
def transform_counter_melody(request: TransformRequest):
    """Generate counter melody"""
    try:
        transformer = MusicTransformer(request.scale_type, request.root_note)
        notes_data = [note.dict() for note in request.notes]
        
        transformed = transformer.counter_melody(
            notes_data, 
            style=request.style or "contrary"
        )
        
        return create_midi_response(transformed, "counter-melody")
    except Exception as e:
        print(f"Error creating counter melody: {str(e)}")
        return {"error": str(e)}

@app.post("/transform/harmonize")
def transform_harmonize(request: TransformRequest):
    """Create harmony line at interval"""
    try:
        transformer = MusicTransformer(request.scale_type, request.root_note)
        notes_data = [note.dict() for note in request.notes]
        
        transformed = transformer.harmonize(
            notes_data,
            interval_degree=request.interval or 3
        )
        
        return create_midi_response(transformed, "harmony")
    except Exception as e:
        print(f"Error harmonizing: {str(e)}")
        return {"error": str(e)}

@app.post("/transform/transpose")
def transform_transpose(request: TransformRequest):
    """Transpose melody by semitones"""
    try:
        transformer = MusicTransformer(request.scale_type, request.root_note)
        notes_data = [note.dict() for note in request.notes]
        
        transformed = transformer.transpose(
            notes_data,
            semitones=request.semitones or 0
        )
        
        return create_midi_response(transformed, "transposed")
    except Exception as e:
        print(f"Error transposing: {str(e)}")
        return {"error": str(e)}

@app.post("/transform/transpose-diatonic")
def transform_transpose_diatonic(request: TransformRequest):
    """Transpose melody by scale degrees (diatonic)"""
    try:
        transformer = MusicTransformer(request.scale_type, request.root_note)
        notes_data = [note.dict() for note in request.notes]
        
        # Use semitones field to pass scale steps
        scale_steps = request.semitones or 0
        
        transformed = transformer.transpose_diatonic(
            notes_data,
            scale_steps=scale_steps
        )
        
        return create_midi_response(transformed, "diatonic-transposed")
    except Exception as e:
        print(f"Error diatonic transposing: {str(e)}")
        return {"error": str(e)}

@app.post("/transform/invert")
def transform_invert(request: TransformRequest):
    """Invert melody around axis"""
    try:
        transformer = MusicTransformer(request.scale_type, request.root_note)
        notes_data = [note.dict() for note in request.notes]
        
        transformed = transformer.invert(
            notes_data,
            axis=request.axis or "center"
        )
        
        return create_midi_response(transformed, "inverted")
    except Exception as e:
        print(f"Error inverting: {str(e)}")
        return {"error": str(e)}

@app.post("/transform/augment")
def transform_augment(request: TransformRequest):
    """Augment (stretch) timing"""
    try:
        transformer = MusicTransformer(request.scale_type, request.root_note)
        notes_data = [note.dict() for note in request.notes]
        
        transformed = transformer.augment(
            notes_data,
            factor=request.factor or 2.0
        )
        
        return create_midi_response(transformed, "augmented")
    except Exception as e:
        print(f"Error augmenting: {str(e)}")
        return {"error": str(e)}

@app.post("/transform/diminish")
def transform_diminish(request: TransformRequest):
    """Diminish (compress) timing"""
    try:
        transformer = MusicTransformer(request.scale_type, request.root_note)
        notes_data = [note.dict() for note in request.notes]
        
        transformed = transformer.diminish(
            notes_data,
            factor=request.factor or 0.5
        )
        
        return create_midi_response(transformed, "diminished")
    except Exception as e:
        print(f"Error diminishing: {str(e)}")
        return {"error": str(e)}

@app.post("/transform/ornament")
def transform_ornament(request: TransformRequest):
    """Add ornamentations"""
    try:
        transformer = MusicTransformer(request.scale_type, request.root_note)
        notes_data = [note.dict() for note in request.notes]
        
        transformed = transformer.ornament(
            notes_data,
            style=request.style or "classical"
        )
        
        return create_midi_response(transformed, "ornamented")
    except Exception as e:
        print(f"Error ornamenting: {str(e)}")
        return {"error": str(e)}

@app.post("/transform/develop")
def transform_develop(request: TransformRequest):
    """Apply melodic development"""
    try:
        transformer = MusicTransformer(request.scale_type, request.root_note)
        notes_data = [note.dict() for note in request.notes]
        
        transformed = transformer.develop(
            notes_data,
            method=request.method or "sequence"
        )
        
        return create_midi_response(transformed, "developed")
    except Exception as e:
        print(f"Error developing melody: {str(e)}")
        return {"error": str(e)}

def create_midi_response(notes: List[Dict], transformation_name: str) -> Response:
    """Helper to create MIDI file from transformed notes"""
    # Create a new stream
    s = stream.Stream()
    s.append(tempo.TempoIndication(number=120))
    s.append(meter.TimeSignature('4/4'))
    
    # Sort notes by time
    sorted_notes = sorted(notes, key=lambda n: n['time'])
    
    # Add notes to stream
    for note_data in sorted_notes:
        n = note.Note(note_data['midi'])
        n.duration = duration.Duration(quarterLength=note_data['duration'] * 2)  # Assuming 120 BPM
        n.offset = note_data['time'] * 2  # Convert to quarter note offsets
        n.volume.velocity = int(note_data.get('velocity', 0.7) * 127)  # Convert to MIDI velocity
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
        headers={"Content-Disposition": f"attachment; filename={transformation_name}.mid"}
    )

@app.post("/gesture/simple-rhythm")
def generate_simple_rhythm(request: GestureRequest):
    """Generate a simple rhythmic pattern"""
    try:
        # Extract parameters with defaults
        midi_note = request.note or 60  # Default to C4
        note_duration = request.note_duration or 0.5  # Default 0.5 seconds
        interval_percent = request.interval or 50  # Default 50%
        gesture_duration = request.gesture_duration or 4  # Default 4 seconds
        
        # Calculate rest interval in seconds (percentage of note duration)
        rest_interval = note_duration * (interval_percent / 100.0)
        
        # Calculate total time per note cycle (note + rest)
        cycle_duration = note_duration + rest_interval
        
        # Create notes array
        notes = []
        current_time = 0
        
        while current_time < gesture_duration:
            # Check if note would extend beyond gesture duration
            if current_time + note_duration > gesture_duration:
                # Trim the last note duration if needed
                actual_duration = gesture_duration - current_time
                if actual_duration > 0:
                    notes.append({
                        'midi': midi_note,
                        'time': current_time,
                        'duration': actual_duration,
                        'velocity': 0.7
                    })
                break
            
            # Add the note
            notes.append({
                'midi': midi_note,
                'time': current_time,
                'duration': note_duration,
                'velocity': 0.7
            })
            
            # Move to next note start time (after note + rest)
            current_time += cycle_duration
            
            # Break if the next note would start beyond gesture duration
            if current_time >= gesture_duration:
                break
        
        return create_midi_response(notes, "simple-rhythm")
    except Exception as e:
        print(f"Error generating simple rhythm: {str(e)}")
        return {"error": str(e)}

def calculate_symmetric_positions(num_notes: int, total_duration: float) -> List[float]:
    """Calculate symmetric note positions using equal time segments."""
    if num_notes <= 0 or total_duration <= 0:
        return []
    
    # Divide time into equal segments, place each note at center of its segment
    segment_duration = total_duration / num_notes
    positions = []
    for i in range(num_notes):
        # Center of segment i: (i + 0.5) * segment_duration
        center_position = (i + 0.5) * segment_duration
        positions.append(center_position)
    
    return positions

def generate_layer_midi(midi_note: int, center_positions: List[float], duration_percent: float, total_duration: float, num_notes: int) -> bytes:
    """Generate MIDI bytes for a single layer using symmetric positions with pure mathematical timing."""
    import mido
    import tempfile
    import os
    
    # Calculate maximum possible duration (99% of each note's time segment)
    segment_duration = total_duration / num_notes
    max_duration = segment_duration * 0.99
    
    # Calculate actual note duration from percentage of maximum possible
    note_duration = max_duration * (duration_percent / 100.0)
    
    print(f"  Generating MIDI: center_positions={center_positions}, note_duration={note_duration}")
    
    # Create MIDI file with pure mathematical timing
    mid = mido.MidiFile(ticks_per_beat=1000)  # High resolution for precise timing
    track = mido.MidiTrack()
    mid.tracks.append(track)
    
    # Direct mathematical conversion: 1000 ticks = 1 second (ignoring musical timing)
    ticks_per_second = 1000
    
    # Convert center positions to start times and create note events
    note_events = []
    for center_pos in center_positions:
        # Calculate start time: center - (duration / 2)
        start_time = center_pos - (note_duration / 2)
        end_time = start_time + note_duration
        
        note_on_time = int(start_time * ticks_per_second)
        note_off_time = int(end_time * ticks_per_second)
        note_events.append(('note_on', note_on_time, midi_note))
        note_events.append(('note_off', note_off_time, midi_note))
    
    # Sort all events by time
    note_events.sort(key=lambda x: x[1])
    
    # Convert absolute times to delta times and create MIDI messages
    current_time = 0
    for event_type, abs_time, note in note_events:
        delta_time = abs_time - current_time
        current_time = abs_time
        
        if event_type == 'note_on':
            msg = mido.Message('note_on', channel=0, note=note, velocity=80, time=delta_time)
            print(f"  Note ON: {note} at {abs_time} ticks (delta: {delta_time})")
        else:
            msg = mido.Message('note_off', channel=0, note=note, velocity=0, time=delta_time)
            print(f"  Note OFF: {note} at {abs_time} ticks (delta: {delta_time})")
        
        track.append(msg)
    
    # Write to temporary file and read bytes
    with tempfile.NamedTemporaryFile(suffix='.mid', delete=False) as tmp_file:
        mid.save(tmp_file.name)
        
        with open(tmp_file.name, 'rb') as f:
            midi_bytes = f.read()
        os.unlink(tmp_file.name)
    
    return midi_bytes

@app.post("/gesture/multi-layer")
def generate_multi_layer_gesture(request: MultiLayerGestureRequest):
    """Generate symmetric gestures for multiple layers simultaneously."""
    try:
        result_layers = {}
        
        for layer_config in request.layers:
            # Validate parameters
            if not (0 <= layer_config.midiNote <= 127):
                return {"error": f"Invalid MIDI note {layer_config.midiNote} for layer {layer_config.layerId}. Must be 0-127."}
            
            if not (1 <= layer_config.durationPercent <= 100):
                return {"error": f"Invalid duration percent {layer_config.durationPercent} for layer {layer_config.layerId}. Must be 1-100."}
            
            if not (1 <= layer_config.totalDuration <= 10):
                return {"error": f"Invalid total duration {layer_config.totalDuration} for layer {layer_config.layerId}. Must be 1-10 seconds."}
            
            if not (1 <= layer_config.numNotes <= 100):
                return {"error": f"Invalid number of notes {layer_config.numNotes} for layer {layer_config.layerId}. Must be 1-100."}
            
            # Calculate symmetric positions
            center_positions = calculate_symmetric_positions(layer_config.numNotes, layer_config.totalDuration)
            print(f"Layer {layer_config.layerId}: center_positions = {center_positions}")
            
            # Generate MIDI for this layer
            midi_bytes = generate_layer_midi(
                layer_config.midiNote,
                center_positions,
                layer_config.durationPercent,
                layer_config.totalDuration,
                layer_config.numNotes
            )
            
            # Convert to base64 for response
            import base64
            result_layers[str(layer_config.layerId)] = base64.b64encode(midi_bytes).decode('utf-8')
        
        return {
            "success": True,
            "layers": result_layers
        }
        
    except Exception as e:
        print(f"Error generating multi-layer gesture: {str(e)}")
        return {"error": str(e)}

@app.post("/import-midi")
async def import_midi_file(file: UploadFile = File(...)):
    """Import MIDI file and extract up to 3 tracks"""
    try:
        if not file.filename.endswith(('.mid', '.midi')):
            return {"error": "Invalid file type. Please upload a MIDI file."}
        
        # Import mido
        import mido
        import tempfile
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(suffix='.mid', delete=False) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            tmp_file.flush()
            tmp_path = tmp_file.name
        
        try:
            # Parse MIDI file with mido
            mid = mido.MidiFile(tmp_path)
            
            # Get tempo from first track (if available)
            tempo_value = 500000  # Default tempo (120 BPM in microseconds per beat)
            for msg in mid.tracks[0]:
                if msg.type == 'set_tempo':
                    tempo_value = msg.tempo
                    break
            
            # Convert tempo to BPM
            bpm = 60000000 / tempo_value
            
            # Process up to 3 tracks that have notes
            tracks_data = []
            track_count = 0
            
            for track_idx, track in enumerate(mid.tracks):
                if track_count >= 3:
                    break
                
                # Check if track has any note events
                has_notes = any(msg.type in ['note_on', 'note_off'] for msg in track)
                if not has_notes:
                    continue
                
                # Extract notes from track
                notes = []
                active_notes = {}  # pitch -> (start_time, velocity)
                current_time = 0  # in ticks
                
                for msg in track:
                    current_time += msg.time
                    
                    if msg.type == 'note_on' and msg.velocity > 0:
                        # Start of a note
                        active_notes[msg.note] = (current_time, msg.velocity)
                    elif msg.type == 'note_off' or (msg.type == 'note_on' and msg.velocity == 0):
                        # End of a note
                        if msg.note in active_notes:
                            start_time, velocity = active_notes[msg.note]
                            duration_ticks = current_time - start_time
                            
                            # Convert ticks to seconds
                            time_seconds = mido.tick2second(start_time, mid.ticks_per_beat, tempo_value)
                            duration_seconds = mido.tick2second(duration_ticks, mid.ticks_per_beat, tempo_value)
                            
                            notes.append({
                                'midi': msg.note,
                                'time': time_seconds,
                                'duration': duration_seconds,
                                'velocity': velocity / 127.0
                            })
                            del active_notes[msg.note]
                
                # Sort notes by time
                notes.sort(key=lambda n: n['time'])
                
                # Create MIDI file for this track using music21
                track_stream = stream.Stream()
                track_stream.append(tempo.TempoIndication(number=120))
                track_stream.append(meter.TimeSignature('4/4'))
                
                for note_data in notes:
                    n = note.Note(note_data['midi'])
                    # Convert seconds to quarter notes at 120 BPM
                    n.duration = duration.Duration(quarterLength=note_data['duration'] * 2)
                    n.offset = note_data['time'] * 2
                    n.volume.velocity = int(note_data['velocity'] * 127)
                    track_stream.insert(n.offset, n)
                
                # Convert to MIDI bytes
                with tempfile.NamedTemporaryFile(suffix='.mid', delete=False) as tmp_file2:
                    track_stream.write('midi', fp=tmp_file2.name)
                    tmp_file2.flush()
                    with open(tmp_file2.name, 'rb') as f:
                        midi_bytes = f.read()
                    os.unlink(tmp_file2.name)
                
                # Encode as base64 for transport
                midi_base64 = base64.b64encode(midi_bytes).decode('utf-8')
                tracks_data.append({
                    'trackIndex': track_count,
                    'midiData': midi_base64,
                    'noteCount': len(notes),
                    'originalTrackIndex': track_idx,
                    'trackName': track.name if hasattr(track, 'name') else f'Track {track_idx}'
                })
                track_count += 1
            
            # Clean up temp file
            os.unlink(tmp_path)
            
            return {
                'success': True,
                'tracks': tracks_data,
                'totalTracksFound': len(mid.tracks),
                'tracksImported': len(tracks_data),
                'detectedTempo': round(bpm),
                'midiType': mid.type
            }
            
        except Exception as e:
            # Clean up temp file on error
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            raise e
        
    except Exception as e:
        print(f"Error importing MIDI file: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"error": f"Failed to import MIDI file: {str(e)}"}