from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from music21 import stream, note, tempo, meter, duration
import io

app = FastAPI()

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

@app.get("/generate")
def generate_midi():
    try:
        # Create a simple melody
        s = stream.Stream()
        s.append(tempo.TempoIndication(number=120))
        s.append(meter.TimeSignature('4/4'))
        
        # Add some notes (C major scale)
        notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']
        for note_name in notes:
            n = note.Note(note_name)
            n.duration = duration.Duration(0.5)  # Half note
            s.append(n)
        
        # Convert to MIDI bytes
        midi_data = io.BytesIO()
        # Write to a temporary file first, then read it
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
            headers={"Content-Disposition": "attachment; filename=generated.mid"}
        )
    except Exception as e:
        print(f"Error generating MIDI: {str(e)}")
        return {"error": str(e)}