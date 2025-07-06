import React, { useRef, useEffect, useState, useMemo } from 'react';
import ViewportEditor from './components/ViewportEditor';
import './Timeline.css';

const Timeline = ({ midiData, liveNotes = [], isRecording = false, editMode = false, onNotesChange, playbackTime, selectedScale, rootNote }) => {

  
  // Create editable version with IDs when in edit mode
  const displayData = useMemo(() => {
    console.log('useMemo displayData - inputs:', { 
      midiData: midiData ? 'has data' : 'null', 
      hasTracks: midiData?.tracks ? 'yes' : 'no',
      editMode 
    });
    
    if (!midiData || !midiData.tracks) {
      console.log('useMemo returning null - invalid midiData');
      return null;
    }
    
    if (editMode) {
      console.log('useMemo creating edit mode data');
      console.log('Original track 0 notes:', midiData.tracks[0].notes);
      // Add IDs for edit mode
      const result = {
        tracks: midiData.tracks.map((track, trackIndex) => ({
          ...track,
          notes: track.notes.map((note, noteIndex) => {
            const noteWithId = {
              time: note.time,
              midi: note.midi,
              duration: note.duration,
              velocity: note.velocity,
              id: note.id || `note-${trackIndex}-${noteIndex}`
            };
            console.log(`Note ${noteIndex} before:`, note);
            console.log(`Note ${noteIndex} after:`, noteWithId);
            return noteWithId;
          })
        }))
      };
      console.log('useMemo edit mode result:', result);
      return result;
    }
    
    console.log('useMemo returning original midiData');
    return midiData;
  }, [midiData, editMode]);
  
  const canvasRef = useRef(null);
  const [zoom, setZoom] = useState(100);
  const [scrollX, setScrollX] = useState(0);
  const [selectedNotes, setSelectedNotes] = useState(new Set());
  const [dragState, setDragState] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Clear selection when edit mode is disabled
  useEffect(() => {
    if (!editMode) {
      setSelectedNotes(new Set());
      setDragState(null);
    }
  }, [editMode]);
  
  const NOTE_HEIGHT = 10;
  const PIXELS_PER_SECOND = 100;
  const RULER_HEIGHT = 40; // Height of time ruler
  
  // Helper functions
  const midiNoteToY = (noteNumber) => {
    const maxNote = 127;
    const minNote = 0;
    const canvasHeight = 600;
    const padding = 20;
    const usableHeight = canvasHeight - RULER_HEIGHT - (2 * padding);
    const yStart = RULER_HEIGHT + padding;
    return yStart + ((maxNote - noteNumber) / (maxNote - minNote)) * usableHeight;
  };

  const yToMidiNote = (y) => {
    const maxNote = 127;
    const minNote = 0;
    const canvasHeight = 600;
    const padding = 20;
    const usableHeight = canvasHeight - RULER_HEIGHT - (2 * padding);
    const yStart = RULER_HEIGHT + padding;
    const normalizedY = (y - yStart) / usableHeight;
    return Math.round(maxNote - (normalizedY * (maxNote - minNote)));
  };

  const pixelsToTime = (pixels) => {
    return (pixels + scrollX) / (PIXELS_PER_SECOND * zoom / 100);
  };

  const timeToPixels = (time) => {
    return (time * PIXELS_PER_SECOND * zoom / 100) - scrollX;
  };

  const getNoteAt = (x, y) => {
    if (!displayData || !displayData.tracks) return null;
    
    const time = pixelsToTime(x);
    const midi = yToMidiNote(y);
    
    for (let trackIndex = 0; trackIndex < displayData.tracks.length; trackIndex++) {
      const track = displayData.tracks[trackIndex];
      for (let noteIndex = 0; noteIndex < track.notes.length; noteIndex++) {
        const note = track.notes[noteIndex];
        const noteX = timeToPixels(note.time);
        const noteY = midiNoteToY(note.midi);
        const noteWidth = note.duration * PIXELS_PER_SECOND * zoom / 100;
        
        if (x >= noteX && x <= noteX + noteWidth &&
            y >= noteY - NOTE_HEIGHT/2 && y <= noteY + NOTE_HEIGHT/2) {
          return { 
            ...note, 
            trackIndex, 
            noteIndex,
            id: note.id || `note-${trackIndex}-${noteIndex}`
          };
        }
      }
    }
    return null;
  };

  // Mouse event handlers
  const handleMouseDown = (e) => {
    if (!editMode) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const clickedNote = getNoteAt(x, y);
    
    if (clickedNote) {
      if (e.ctrlKey || e.metaKey) {
        // Toggle selection
        const newSelected = new Set(selectedNotes);
        if (newSelected.has(clickedNote.id)) {
          newSelected.delete(clickedNote.id);
        } else {
          newSelected.add(clickedNote.id);
        }
        setSelectedNotes(newSelected);
      } else if (!selectedNotes.has(clickedNote.id)) {
        // Select only this note
        setSelectedNotes(new Set([clickedNote.id]));
      }
      
      // Start drag
      setDragState({
        isDragging: true,
        startX: x,
        startY: y,
        originalNotes: new Map()
      });
    } else {
      // Clear selection
      setSelectedNotes(new Set());
    }
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePos({ x, y });
    
    if (editMode && dragState && dragState.isDragging) {
      const deltaX = x - dragState.startX;
      const deltaY = y - dragState.startY;
      const deltaTime = deltaX / (PIXELS_PER_SECOND * zoom / 100);
      const deltaMidi = yToMidiNote(y) - yToMidiNote(dragState.startY);
      
      // Update drag preview
      setDragState(prev => ({
        ...prev,
        deltaTime,
        deltaMidi,
        currentX: x,
        currentY: y
      }));
    }
  };

  const handleMouseUp = (e) => {
    if (!editMode || !dragState || !dragState.isDragging) return;
    
    const deltaTime = dragState.deltaTime || 0;
    const deltaMidi = dragState.deltaMidi || 0;
    
    if (Math.abs(deltaTime) > 0.01 || Math.abs(deltaMidi) > 0.5) {
      // Apply the drag to selected notes
      const newDisplayData = { ...displayData };
      newDisplayData.tracks = newDisplayData.tracks.map(track => ({
        ...track,
        notes: track.notes.map(note => {
          if (selectedNotes.has(note.id)) {
            const newTime = Math.max(0, note.time + deltaTime);
            const newMidi = Math.max(0, Math.min(127, note.midi + deltaMidi));
            return { ...note, time: newTime, midi: newMidi };
          }
          return note;
        })
      }));
      
      if (onNotesChange) {
        onNotesChange(newDisplayData);
      }
    }
    
    setDragState(null);
  };
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    console.log('Timeline rendering, editMode:', editMode, 'displayData:', displayData);
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const rulerHeight = 40; // Height reserved for time ruler
    
    ctx.clearRect(0, 0, width, height);
    
    // Background
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);
    
    // Time ruler background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, width, rulerHeight);
    
    // Draw time grid and ruler
    const pixelsPerSecond = PIXELS_PER_SECOND * zoom / 100;
    const visibleStartTime = scrollX / pixelsPerSecond;
    const visibleEndTime = (scrollX + width) / pixelsPerSecond;
    
    // Determine grid interval based on zoom
    let gridInterval = 1; // Default 1 second
    if (zoom < 50) gridInterval = 2;
    if (zoom < 25) gridInterval = 5;
    if (zoom > 200) gridInterval = 0.5;
    if (zoom > 400) gridInterval = 0.25;
    
    // Draw vertical time grid lines and labels
    for (let time = Math.floor(visibleStartTime / gridInterval) * gridInterval; 
         time <= visibleEndTime + gridInterval; 
         time += gridInterval) {
      const x = timeToPixels(time);
      
      // Grid line
      ctx.strokeStyle = time % 1 === 0 ? '#444' : '#333'; // Stronger lines for whole seconds
      ctx.lineWidth = time % 1 === 0 ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(x, rulerHeight);
      ctx.lineTo(x, height);
      ctx.stroke();
      
      // Time label
      if (time >= 0) {
        ctx.fillStyle = '#999';
        ctx.font = '12px monospace';
        ctx.fillText(`${time.toFixed(1)}s`, x + 3, 25);
      }
      
      // Tick mark
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, rulerHeight - 10);
      ctx.lineTo(x, rulerHeight);
      ctx.stroke();
    }
    
    // Horizontal grid lines (pitch reference)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    for (let i = rulerHeight + 30; i < height; i += 30) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(width, i);
      ctx.stroke();
    }
    
    // Ruler bottom border
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, rulerHeight);
    ctx.lineTo(width, rulerHeight);
    ctx.stroke();
    
    // Render recorded/generated MIDI notes
    if (displayData && displayData.tracks) {
      console.log('Rendering notes, displayData.tracks:', displayData.tracks.length);
      displayData.tracks.forEach((track, trackIndex) => {
        console.log(`Track ${trackIndex} has ${track.notes.length} notes:`, track.notes);
        track.notes.forEach((note, noteIndex) => {
          let x = (note.time * PIXELS_PER_SECOND * zoom / 100) - scrollX;
          let y = midiNoteToY(note.midi);
          const noteWidth = note.duration * PIXELS_PER_SECOND * zoom / 100;
          
          if (noteIndex === 0) {
            console.log(`Coordinate calculation for note 0:`, {
              'note.time': note.time,
              'PIXELS_PER_SECOND': PIXELS_PER_SECOND,
              'zoom': zoom,
              'scrollX': scrollX,
              'calculation': `(${note.time} * ${PIXELS_PER_SECOND} * ${zoom} / 100) - ${scrollX}`,
              'result_x': x
            });
            console.log(`Note ${noteIndex}:`, {
              time: note.time,
              midi: note.midi,
              duration: note.duration,
              id: note.id,
              x, y, noteWidth,
              visible: x > -noteWidth && x < 1200
            });
          }
          
          const isSelected = editMode && selectedNotes.has(note.id);
          const isDragging = dragState && dragState.isDragging && isSelected;
          
          // Apply drag offset if dragging
          if (isDragging) {
            x += (dragState.deltaTime || 0) * PIXELS_PER_SECOND * zoom / 100;
            y = midiNoteToY(note.midi + (dragState.deltaMidi || 0));
          }
          
          // Choose colors based on state
          if (isSelected) {
            ctx.fillStyle = isDragging ? '#FFB74D' : '#2196F3';
            ctx.strokeStyle = isDragging ? '#FF9800' : '#1976D2';
          } else {
            ctx.fillStyle = '#4CAF50';
            ctx.strokeStyle = '#2E7D32';
          }
          
          ctx.fillRect(x, y - NOTE_HEIGHT/2, noteWidth, NOTE_HEIGHT);
          
          // Thicker stroke for selected notes
          ctx.lineWidth = isSelected ? 2 : 1;
          ctx.strokeRect(x, y - NOTE_HEIGHT/2, noteWidth, NOTE_HEIGHT);
          ctx.lineWidth = 1; // Reset
          
          if (noteIndex === 0) {
            console.log(`Actually drew note at x:${x}, y:${y}, noteWidth:${noteWidth}, height:${NOTE_HEIGHT}`);
            console.log(`Fill color: ${ctx.fillStyle}, Stroke color: ${ctx.strokeStyle}`);
          }
        });
      });
    }
    
    // Render live notes during recording
    if (liveNotes.length > 0) {
      liveNotes.forEach(note => {
        const x = (note.startTime / 1000 * PIXELS_PER_SECOND * zoom / 100) - scrollX;
        const y = midiNoteToY(note.midi);
        
        if (note.isActive) {
          // Active note - just show a starting marker
          ctx.fillStyle = '#FF6B6B';
          ctx.fillRect(x, y - NOTE_HEIGHT/2, 5, NOTE_HEIGHT);
        } else {
          // Completed note - show full duration
          const width = note.duration * PIXELS_PER_SECOND * zoom / 100;
          ctx.fillStyle = '#FF9800';
          ctx.fillRect(x, y - NOTE_HEIGHT/2, width, NOTE_HEIGHT);
          
          ctx.strokeStyle = '#F57C00';
          ctx.strokeRect(x, y - NOTE_HEIGHT/2, width, NOTE_HEIGHT);
        }
      });
    }
    
    // Draw playhead if playing
    if (playbackTime !== null && playbackTime !== undefined) {
      const playheadX = timeToPixels(playbackTime);
      
      // Only draw if visible
      if (playheadX >= 0 && playheadX <= width) {
        ctx.strokeStyle = '#FF5722';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(playheadX, 0);
        ctx.lineTo(playheadX, height);
        ctx.stroke();
        
        // Draw time indicator
        ctx.fillStyle = '#FF5722';
        ctx.font = 'bold 12px monospace';
        const timeText = `${playbackTime.toFixed(2)}s`;
        const textWidth = ctx.measureText(timeText).width;
        ctx.fillRect(playheadX - textWidth/2 - 4, 0, textWidth + 8, 20);
        ctx.fillStyle = 'white';
        ctx.fillText(timeText, playheadX - textWidth/2, 14);
      }
    }
  }, [displayData, liveNotes, zoom, scrollX, isRecording, editMode, selectedNotes, dragState, playbackTime]);
  
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const newZoom = Math.max(10, Math.min(500, zoom + (e.deltaY > 0 ? -10 : 10)));
      setZoom(newZoom);
    } else {
      setScrollX(prevScrollX => Math.max(0, prevScrollX + e.deltaX));
    }
  };
  
  // Calculate viewport information
  const canvasWidth = 1200;
  const pixelsPerSecond = PIXELS_PER_SECOND * zoom / 100;
  const viewportStart = scrollX / pixelsPerSecond;
  const viewportDuration = canvasWidth / pixelsPerSecond;

  const handleTransformNotes = (transformedNotes) => {
    if (!displayData || !displayData.tracks) return;
    
    // Create a new data structure with transformed notes
    const newData = {
      ...displayData,
      tracks: displayData.tracks.map((track, trackIndex) => ({
        ...track,
        notes: transformedNotes
      }))
    };
    
    if (onNotesChange) {
      onNotesChange(newData);
    }
  };

  return (
    <div className="timeline-container">
      {editMode && displayData && displayData.tracks && displayData.tracks[0] && (
        <ViewportEditor
          notes={displayData.tracks[0].notes}
          viewportStart={viewportStart}
          viewportDuration={viewportDuration}
          selectedScale={selectedScale}
          rootNote={rootNote}
          onApplyTransform={handleTransformNotes}
        />
      )}
      <div className="timeline-controls">
        <button onClick={() => setZoom(Math.min(500, zoom + 10))}>Zoom In</button>
        <button onClick={() => setZoom(Math.max(10, zoom - 10))}>Zoom Out</button>
        <span>Zoom: {zoom}%</span>
        {editMode && (
          <span style={{ 
            marginLeft: '16px', 
            color: '#2196F3', 
            fontWeight: 'bold' 
          }}>
            ✏️ Edit Mode Active - Click notes to select, drag to move
          </span>
        )}
      </div>
      <canvas 
        ref={canvasRef}
        width={1200}
        height={600}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="timeline-canvas"
        style={{ cursor: editMode ? 'pointer' : 'default' }}
      />
    </div>
  );
};

export default Timeline;