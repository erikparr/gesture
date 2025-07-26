import React, { useRef, useEffect, useState, useMemo } from 'react';
import ViewportEditor from './components/ViewportEditor';
import GenerateButton from './components/GenerateButton';
import RecordButton from './components/RecordButton';
import EditModeButton from './components/EditModeButton';
import SaveMidiButton from './components/SaveMidiButton';
import MidiPlayer from './components/MidiPlayer';
import TransformationPanel from './components/TransformationPanel';
import GesturePanel from './components/GesturePanel';
import './Timeline.css';

const Timeline = ({ 
  midiData, 
  liveNotes = [], 
  isRecording = false, 
  editMode = false, 
  onNotesChange, 
  playbackTime, 
  selectedScale, 
  rootNote,
  onGenerate,
  onRecordComplete,
  onEditModeToggle,
  loading,
  recordButtonRef,
  midiRecorder,
  onPlaybackProgress,
  height = 600, // Configurable height, default 600px
  layerId = 0,
  layerName = '',
  onTransform,
  onGesture
}) => {

  
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
  const [zoom, setZoom] = useState(300); // Default zoom to show ~4 seconds across canvas
  const [scrollX, setScrollX] = useState(0);
  const [selectedNotes, setSelectedNotes] = useState(new Set());
  const [dragState, setDragState] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [dragSelection, setDragSelection] = useState({
    isDragging: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    modifiers: { shift: false, ctrl: false }
  });
  const [durationScale, setDurationScale] = useState(100); // 100% = normal duration
  const [originalDurations, setOriginalDurations] = useState(new Map()); // Store original durations

  // Clear selection when edit mode is disabled
  useEffect(() => {
    if (!editMode) {
      setSelectedNotes(new Set());
      setDragState(null);
      setDurationScale(100);
      setOriginalDurations(new Map());
    }
  }, [editMode]);
  
  const PIXELS_PER_SECOND = 100;
  const RULER_HEIGHT = 40; // Height of time ruler
  const MIN_NOTE_RANGE = 5; // Minimum number of notes to display
  
  // Calculate the note range from current notes
  const noteRange = useMemo(() => {
    let minNote = 127;
    let maxNote = 0;
    
    // Check all notes in the display data
    if (displayData && displayData.tracks) {
      displayData.tracks.forEach(track => {
        track.notes.forEach(note => {
          if (note.midi < minNote) minNote = note.midi;
          if (note.midi > maxNote) maxNote = note.midi;
        });
      });
    }
    
    // Check live notes
    liveNotes.forEach(note => {
      if (note.midi < minNote) minNote = note.midi;
      if (note.midi > maxNote) maxNote = note.midi;
    });
    
    // If no notes, use default range
    if (minNote > maxNote) {
      minNote = 60; // Middle C
      maxNote = 72; // C5
    }
    
    // Ensure minimum range
    const range = maxNote - minNote;
    if (range < MIN_NOTE_RANGE - 1) {
      const expansion = Math.ceil((MIN_NOTE_RANGE - 1 - range) / 2);
      minNote = Math.max(0, minNote - expansion);
      maxNote = Math.min(127, maxNote + expansion);
    }
    
    // Add some padding
    minNote = Math.max(0, minNote - 2);
    maxNote = Math.min(127, maxNote + 2);
    
    return { minNote, maxNote };
  }, [displayData, liveNotes]);
  
  // Calculate note height based on the visible range
  const NOTE_HEIGHT = useMemo(() => {
    const { minNote, maxNote } = noteRange;
    const padding = 20;
    const usableHeight = height - RULER_HEIGHT - (2 * padding);
    const totalNotes = maxNote - minNote + 1;
    // Make notes fill about 80% of the space between grid lines
    return (usableHeight / totalNotes) * 0.8;
  }, [noteRange, height]);
  
  // Helper functions
  const midiNoteToY = (noteNumber) => {
    const { minNote, maxNote } = noteRange;
    const padding = 20;
    const usableHeight = height - RULER_HEIGHT - (2 * padding);
    const yStart = RULER_HEIGHT + padding;
    return yStart + ((maxNote - noteNumber) / (maxNote - minNote)) * usableHeight;
  };

  const yToMidiNote = (y) => {
    const { minNote, maxNote } = noteRange;
    const padding = 20;
    const usableHeight = height - RULER_HEIGHT - (2 * padding);
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
          // Store original duration if not already stored
          if (!originalDurations.has(clickedNote.id)) {
            setOriginalDurations(prev => new Map(prev).set(clickedNote.id, clickedNote.duration));
          }
        }
        setSelectedNotes(newSelected);
      } else if (!selectedNotes.has(clickedNote.id)) {
        // Select only this note
        setSelectedNotes(new Set([clickedNote.id]));
        // Store original duration if not already stored
        if (!originalDurations.has(clickedNote.id)) {
          setOriginalDurations(prev => new Map(prev).set(clickedNote.id, clickedNote.duration));
        }
      }
      
      // Start drag
      setDragState({
        isDragging: true,
        startX: x,
        startY: y,
        originalNotes: new Map()
      });
    } else {
      // Start drag selection
      setDragSelection({
        isDragging: true,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y,
        modifiers: { shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey }
      });
      
      // Clear selection unless shift is held
      if (!e.shiftKey) {
        setSelectedNotes(new Set());
      }
    }
  };

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePos({ x, y });
    
    if (editMode && dragSelection.isDragging) {
      // Update drag selection box
      setDragSelection(prev => ({
        ...prev,
        currentX: x,
        currentY: y
      }));
    } else if (editMode && dragState && dragState.isDragging) {
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
    if (!editMode) return;
    
    // Handle drag selection
    if (dragSelection.isDragging) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Calculate selection box bounds (handle negative dimensions)
      const x1 = Math.min(dragSelection.startX, x);
      const x2 = Math.max(dragSelection.startX, x);
      const y1 = Math.min(dragSelection.startY, y);
      const y2 = Math.max(dragSelection.startY, y);
      
      // Find all notes in the selection box
      const notesInBox = [];
      if (displayData && displayData.tracks) {
        displayData.tracks.forEach((track, trackIndex) => {
          track.notes.forEach((note, noteIndex) => {
            const noteX = timeToPixels(note.time);
            const noteY = midiNoteToY(note.midi);
            const noteWidth = note.duration * PIXELS_PER_SECOND * zoom / 100;
            const noteId = note.id || `note-${trackIndex}-${noteIndex}`;
            
            // Check if note overlaps with selection box
            if (!(noteX + noteWidth < x1 || noteX > x2 || 
                  noteY + NOTE_HEIGHT/2 < y1 || noteY - NOTE_HEIGHT/2 > y2)) {
              notesInBox.push(noteId);
            }
          });
        });
      }
      
      // Update selection based on modifiers
      if (dragSelection.modifiers.shift) {
        // Add to existing selection
        setSelectedNotes(prev => new Set([...prev, ...notesInBox]));
      } else if (dragSelection.modifiers.ctrl) {
        // Toggle selection
        setSelectedNotes(prev => {
          const newSet = new Set(prev);
          notesInBox.forEach(id => {
            if (newSet.has(id)) {
              newSet.delete(id);
            } else {
              newSet.add(id);
            }
          });
          return newSet;
        });
      } else {
        // Replace selection
        setSelectedNotes(new Set(notesInBox));
      }
      
      // Store original durations for newly selected notes
      const newOriginalDurations = new Map(originalDurations);
      displayData.tracks.forEach(track => {
        track.notes.forEach(note => {
          if (notesInBox.includes(note.id) && !originalDurations.has(note.id)) {
            newOriginalDurations.set(note.id, note.duration);
          }
        });
      });
      setOriginalDurations(newOriginalDurations);
      
      // Clear drag selection
      setDragSelection({
        isDragging: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        modifiers: { shift: false, ctrl: false }
      });
    }
    
    // Handle note dragging
    else if (dragState && dragState.isDragging) {
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
    }
  };
  
  // Handle keyboard events
  const handleKeyDown = (e) => {
    if (!editMode || selectedNotes.size === 0) return;
    
    // Delete key or Backspace
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      
      if (displayData && displayData.tracks) {
        const newDisplayData = { ...displayData };
        newDisplayData.tracks = newDisplayData.tracks.map(track => ({
          ...track,
          notes: track.notes.filter(note => !selectedNotes.has(note.id))
        }));
        
        // Clear selection after deletion
        setSelectedNotes(new Set());
        setOriginalDurations(new Map());
        
        if (onNotesChange) {
          onNotesChange(newDisplayData);
        }
      }
    }
  };

  // Add keyboard event listener
  useEffect(() => {
    if (editMode) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [editMode, selectedNotes, displayData, onNotesChange]);

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
    
    // Horizontal grid lines with note labels (pitch reference)
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const { minNote, maxNote } = noteRange;
    const noteStep = Math.max(1, Math.ceil((maxNote - minNote) / 10)); // Show ~10 lines max
    
    ctx.font = '11px monospace';
    
    for (let midiNote = minNote; midiNote <= maxNote; midiNote += noteStep) {
      const y = midiNoteToY(midiNote);
      
      // Grid line
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      
      // Note label
      const noteName = noteNames[midiNote % 12];
      const octave = Math.floor(midiNote / 12) - 1;
      ctx.fillStyle = '#666';
      ctx.fillText(`${noteName}${octave}`, 5, y - 3);
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
    
    // Draw drag selection box
    if (dragSelection.isDragging) {
      // Calculate box bounds
      const x1 = Math.min(dragSelection.startX, dragSelection.currentX);
      const x2 = Math.max(dragSelection.startX, dragSelection.currentX);
      const y1 = Math.min(dragSelection.startY, dragSelection.currentY);
      const y2 = Math.max(dragSelection.startY, dragSelection.currentY);
      const boxWidth = x2 - x1;
      const boxHeight = y2 - y1;
      
      // Draw selection box
      ctx.fillStyle = 'rgba(33, 150, 243, 0.2)';
      ctx.fillRect(x1, y1, boxWidth, boxHeight);
      
      ctx.strokeStyle = '#2196F3';
      ctx.lineWidth = 1;
      ctx.strokeRect(x1, y1, boxWidth, boxHeight);
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
  }, [displayData, liveNotes, zoom, scrollX, isRecording, editMode, selectedNotes, dragState, playbackTime, dragSelection, noteRange, NOTE_HEIGHT, height]);
  
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
  const viewportDuration = 4; // Fixed 4-second time window

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

  const handleDurationScaleChange = (newScale) => {
    setDurationScale(newScale);
    
    // Apply duration scaling to selected notes
    if (selectedNotes.size > 0 && displayData && displayData.tracks) {
      const scaleFactor = newScale / 100;
      const newDisplayData = { ...displayData };
      newDisplayData.tracks = newDisplayData.tracks.map(track => ({
        ...track,
        notes: track.notes.map(note => {
          if (selectedNotes.has(note.id)) {
            // Use original duration if available, otherwise current duration
            const baseDuration = originalDurations.get(note.id) || note.duration;
            return { ...note, duration: baseDuration * scaleFactor };
          }
          return note;
        })
      }));
      
      if (onNotesChange) {
        onNotesChange(newDisplayData);
      }
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <GenerateButton 
            onGenerate={onGenerate} 
            loading={loading} 
            style={{ 
              padding: '4px 12px', 
              fontSize: '12px',
              height: '28px' 
            }} 
          />
          <RecordButton 
            ref={recordButtonRef}
            onRecordComplete={onRecordComplete} 
            disabled={loading || !midiRecorder}
            style={{ 
              padding: '4px 12px', 
              fontSize: '12px',
              height: '28px' 
            }}
          />
          <EditModeButton 
            editMode={editMode}
            onToggle={onEditModeToggle}
            disabled={loading || isRecording || !midiData}
            style={{ 
              padding: '4px 12px', 
              fontSize: '12px',
              height: '28px' 
            }}
          />
          <SaveMidiButton 
            editableNotes={midiData}
            disabled={loading || isRecording}
            style={{ 
              padding: '4px 12px', 
              fontSize: '12px',
              height: '28px' 
            }}
          />
          <div style={{ display: 'inline-block', height: '28px' }}>
            <MidiPlayer 
              parsedMidi={midiData} 
              onPlaybackProgress={onPlaybackProgress}
              style={{ 
                padding: '4px 12px', 
                fontSize: '12px',
                height: '28px' 
              }}
            />
          </div>
          {onTransform && (
            <TransformationPanel
              layerId={layerId}
              notes={midiData?.tracks?.[0]?.notes || []}
              scale={selectedScale}
              rootNote={rootNote}
              onTransform={onTransform}
              disabled={loading || isRecording || !midiData}
              loading={loading}
            />
          )}
          {onGesture && (
            <GesturePanel
              layerId={layerId}
              notes={midiData?.tracks?.[0]?.notes || []}
              scale={selectedScale}
              rootNote={rootNote}
              onGesture={onGesture}
              disabled={loading || isRecording}
              loading={loading}
            />
          )}
          <div style={{ width: '1px', height: '20px', backgroundColor: '#ccc', margin: '0 8px' }} />
          <button 
            onClick={() => setZoom(Math.min(500, zoom + 10))}
            style={{ padding: '4px 12px', fontSize: '12px', height: '28px' }}
          >
            Zoom In
          </button>
          <button 
            onClick={() => setZoom(Math.max(10, zoom - 10))}
            style={{ padding: '4px 12px', fontSize: '12px', height: '28px' }}
          >
            Zoom Out
          </button>
          <span style={{ fontSize: '12px' }}>Zoom: {zoom}%</span>
        </div>
        {editMode && selectedNotes.size > 0 && (
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            marginLeft: '16px',
            gap: '8px'
          }}>
            <label htmlFor="duration-scale">Duration Scale:</label>
            <input
              id="duration-scale"
              type="range"
              min="1"
              max="150"
              value={durationScale}
              onChange={(e) => handleDurationScaleChange(parseInt(e.target.value))}
              style={{ width: '100px' }}
            />
            <span>{durationScale}%</span>
          </div>
        )}
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
        height={height}
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