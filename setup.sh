#!/bin/bash

echo "Setting up MIDI Editor App..."

# Setup backend
echo "Setting up Python backend..."
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

# Setup frontend
echo "Setting up React frontend..."
cd frontend
npm install
cd ..

echo "Setup complete!"
echo ""
echo "To run the application:"
echo "1. Start backend: cd backend && source venv/bin/activate && uvicorn main:app --reload"
echo "2. Start frontend: cd frontend && npm start"
echo "3. Open http://localhost:3000"