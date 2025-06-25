# MIDI Editor App

A minimal MIDI editing application with React frontend and Python FastAPI backend.

## Features

- Generate MIDI files using Python music21
- Play MIDI files in browser using Tone.js
- Simple REST API communication

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

1. Start both backend and frontend servers
2. Open http://localhost:3000 in your browser
3. Click "Generate MIDI" to create a simple C major scale
4. Click "Play MIDI" to hear the generated music

## API Endpoints

- `GET /` - Health check
- `GET /generate` - Generate and return MIDI file