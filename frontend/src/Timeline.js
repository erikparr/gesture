import React, { useRef, useEffect, useState } from 'react';
import './Timeline.css';

const Timeline = ({ midiData }) => {
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(100);
  const [scrollX, setScrollX] = useState(0);
  
  const NOTE_HEIGHT = 10;
  const PIXELS_PER_SECOND = 100;
  
  const midiNoteToY = (noteNumber) => {
    const maxNote = 127;
    const minNote = 0;
    const canvasHeight = 600;
    const padding = 20;
    const usableHeight = canvasHeight - (2 * padding);
    return padding + ((maxNote - noteNumber) / (maxNote - minNote)) * usableHeight;
  };
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i - scrollX, 0);
      ctx.lineTo(i - scrollX, height);
      ctx.stroke();
    }
    
    for (let i = 0; i < height; i += 30) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }
    
    if (midiData && midiData.tracks) {
      ctx.fillStyle = '#4CAF50';
      
      midiData.tracks.forEach(track => {
        track.notes.forEach(note => {
          const x = (note.time * PIXELS_PER_SECOND * zoom / 100) - scrollX;
          const y = midiNoteToY(note.midi);
          const width = note.duration * PIXELS_PER_SECOND * zoom / 100;
          
          ctx.fillRect(x, y - NOTE_HEIGHT/2, width, NOTE_HEIGHT);
          
          ctx.strokeStyle = '#2E7D32';
          ctx.strokeRect(x, y - NOTE_HEIGHT/2, width, NOTE_HEIGHT);
        });
      });
    }
  }, [midiData, zoom, scrollX]);
  
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const newZoom = Math.max(10, Math.min(500, zoom + (e.deltaY > 0 ? -10 : 10)));
      setZoom(newZoom);
    } else {
      setScrollX(prevScrollX => Math.max(0, prevScrollX + e.deltaX));
    }
  };
  
  return (
    <div className="timeline-container">
      <div className="timeline-controls">
        <button onClick={() => setZoom(Math.min(500, zoom + 10))}>Zoom In</button>
        <button onClick={() => setZoom(Math.max(10, zoom - 10))}>Zoom Out</button>
        <span>Zoom: {zoom}%</span>
      </div>
      <canvas 
        ref={canvasRef}
        width={1200}
        height={600}
        onWheel={handleWheel}
        className="timeline-canvas"
      />
    </div>
  );
};

export default Timeline;