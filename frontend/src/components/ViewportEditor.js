import React, { useState } from 'react';
import * as transforms from '../utils/noteTransformations';
import './ViewportEditor.css';

const ViewportEditor = ({ 
  notes, 
  viewportStart, 
  viewportDuration, 
  selectedScale,
  rootNote,
  onApplyTransform 
}) => {
  const [selectedFunction, setSelectedFunction] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [subMenuOpen, setSubMenuOpen] = useState('');
  
  // Parameters for different functions
  const [quantizeGrid, setQuantizeGrid] = useState(0.25); // 1/4 note default
  const [scaleFactor, setScaleFactor] = useState(1.0);
  const [shiftAmount, setShiftAmount] = useState(0.5);
  const [transposeAmount, setTransposeAmount] = useState(0);
  const [uniformDur, setUniformDur] = useState(0.25); // Default 1/4 note

  const editFunctions = [
    { id: 'evenly-space', label: 'Evenly Space', hasSubmenu: false },
    { id: 'quantize', label: 'Quantize to Grid', hasSubmenu: true },
    { id: 'scale', label: 'Compress/Expand', hasSubmenu: true },
    { id: 'shift', label: 'Shift Notes', hasSubmenu: true },
    { id: 'reverse', label: 'Reverse', hasSubmenu: false },
    { id: 'align-start', label: 'Align to Start', hasSubmenu: false },
    { id: 'transpose', label: 'Transpose', hasSubmenu: true },
    { id: 'invert', label: 'Invert Pitch', hasSubmenu: false },
    { id: 'uniform-duration', label: 'Uniform Duration', hasSubmenu: true },
    { id: 'humanize', label: 'Humanize', hasSubmenu: false },
    { id: 'counterpoint', label: 'Add Counterpoint', hasSubmenu: false },
    { id: 'mirror', label: 'Mirror Pattern', hasSubmenu: false },
  ];

  const handleApply = async () => {
    if (!selectedFunction || !notes || notes.length === 0) return;
    
    console.log('ViewportEditor handleApply:', {
      viewportStart,
      viewportDuration,
      notesCount: notes.length,
      selectedFunction
    });
    
    const viewportEnd = viewportStart + viewportDuration;
    const viewportNotes = transforms.getNotesInViewport(notes, viewportStart, viewportEnd);
    
    if (viewportNotes.length === 0) {
      alert('No notes in current viewport');
      return;
    }

    let transformedNotes;
    
    switch (selectedFunction) {
      case 'evenly-space':
        transformedNotes = transforms.evenlySpaceNotes(viewportNotes, viewportStart, viewportDuration);
        break;
        
      case 'quantize':
        transformedNotes = transforms.quantizeNotes(viewportNotes, quantizeGrid);
        break;
        
      case 'scale':
        transformedNotes = transforms.scaleNotePositions(viewportNotes, scaleFactor, viewportStart, viewportDuration);
        break;
        
      case 'shift':
        transformedNotes = transforms.shiftNotes(viewportNotes, shiftAmount);
        break;
        
      case 'reverse':
        transformedNotes = transforms.reverseNotes(viewportNotes, viewportStart, viewportDuration);
        break;
        
      case 'align-start':
        transformedNotes = transforms.alignNotesToStart(viewportNotes, viewportStart);
        break;
        
      case 'transpose':
        transformedNotes = transforms.transposeNotes(viewportNotes, transposeAmount);
        break;
        
      case 'invert':
        transformedNotes = transforms.invertNotes(viewportNotes);
        break;
        
      case 'uniform-duration':
        transformedNotes = transforms.uniformDuration(viewportNotes, uniformDur);
        break;
        
      case 'humanize':
        transformedNotes = transforms.humanizeNotes(viewportNotes);
        break;
        
      case 'mirror':
        // Mirror creates new notes (doubled pattern), so handle it specially
        const mirroredNotes = transforms.mirrorPattern(viewportNotes, viewportStart + viewportDuration);
        // Replace only the viewport notes with the mirrored pattern
        const notesOutsideViewport = notes.filter(n => {
          return n.time < viewportStart || n.time >= viewportStart + viewportDuration;
        });
        onApplyTransform([...notesOutsideViewport, ...mirroredNotes]);
        setShowDropdown(false);
        setSubMenuOpen('');
        return;
        
      case 'counterpoint':
        try {
          const response = await fetch('http://localhost:8000/generate_counterpoint', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              notes: viewportNotes.map(n => ({
                midi: n.midi,
                time: n.time,
                duration: n.duration,
                velocity: n.velocity || 0.7
              })),
              key: rootNote,
              scale_type: selectedScale
            })
          });
          
          if (!response.ok) {
            throw new Error('Failed to generate counterpoint');
          }
          
          const data = await response.json();
          if (data.error) {
            alert('Error generating counterpoint: ' + data.error);
            return;
          }
          
          // The API now returns ALL notes (original + counterpoint) with proper timing
          // Each note already has an ID from the backend
          const allNotesWithTimeline = data.counterpoint;
          
          // Replace all notes with the new alternating timeline
          onApplyTransform(allNotesWithTimeline);
          setShowDropdown(false);
          setSubMenuOpen('');
          return;
        } catch (error) {
          console.error('Error calling counterpoint API:', error);
          alert('Failed to generate counterpoint');
          return;
        }
        
      default:
        return;
    }
    
    // Apply transformation
    // Create a map of old to new notes
    const transformMap = new Map();
    viewportNotes.forEach((note, index) => {
      if (transformedNotes[index]) {
        transformMap.set(note.id, transformedNotes[index]);
      }
    });
    
    // Update all notes, replacing viewport notes with transformed versions
    const updatedNotes = notes.map(note => {
      if (transformMap.has(note.id)) {
        return { ...transformMap.get(note.id), id: note.id };
      }
      return note;
    });
    
    onApplyTransform(updatedNotes);
    
    // Reset UI
    setShowDropdown(false);
    setSubMenuOpen('');
  };

  const renderSubmenu = (functionId) => {
    switch (functionId) {
      case 'quantize':
        return (
          <div className="submenu">
            <label>Grid:</label>
            <select value={quantizeGrid} onChange={(e) => setQuantizeGrid(parseFloat(e.target.value))}>
              <option value={1}>1 beat</option>
              <option value={0.5}>1/2 beat</option>
              <option value={0.25}>1/4 beat</option>
              <option value={0.125}>1/8 beat</option>
              <option value={0.0625}>1/16 beat</option>
            </select>
          </div>
        );
        
      case 'scale':
        return (
          <div className="submenu">
            <label>Scale:</label>
            <select value={scaleFactor} onChange={(e) => setScaleFactor(parseFloat(e.target.value))}>
              <option value={0.5}>50%</option>
              <option value={0.75}>75%</option>
              <option value={1.25}>125%</option>
              <option value={1.5}>150%</option>
              <option value={2.0}>200%</option>
            </select>
          </div>
        );
        
      case 'shift':
        return (
          <div className="submenu">
            <label>Amount:</label>
            <select value={shiftAmount} onChange={(e) => setShiftAmount(parseFloat(e.target.value))}>
              <option value={-1}>-1s</option>
              <option value={-0.5}>-0.5s</option>
              <option value={-0.25}>-0.25s</option>
              <option value={0.25}>+0.25s</option>
              <option value={0.5}>+0.5s</option>
              <option value={1}>+1s</option>
            </select>
          </div>
        );
        
      case 'transpose':
        return (
          <div className="submenu">
            <label>Semitones:</label>
            <input 
              type="number" 
              value={transposeAmount} 
              onChange={(e) => setTransposeAmount(parseInt(e.target.value) || 0)}
              min={-12}
              max={12}
            />
          </div>
        );
        
      case 'uniform-duration':
        return (
          <div className="submenu">
            <label>Duration:</label>
            <select value={uniformDur} onChange={(e) => setUniformDur(parseFloat(e.target.value))}>
              <option value={2}>2 beats</option>
              <option value={1}>1 beat</option>
              <option value={0.5}>1/2 beat</option>
              <option value={0.25}>1/4 beat</option>
              <option value={0.125}>1/8 beat</option>
              <option value={0.0625}>1/16 beat</option>
            </select>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="viewport-editor">
      <div className="dropdown-container">
        <button 
          className="dropdown-trigger"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          Edit Functions ▼
        </button>
        
        {showDropdown && (
          <div className="dropdown-menu">
            {editFunctions.map(func => (
              <div 
                key={func.id}
                className="dropdown-item"
                onClick={() => {
                  setSelectedFunction(func.id);
                  if (!func.hasSubmenu) {
                    setSubMenuOpen('');
                  }
                }}
                onMouseEnter={() => func.hasSubmenu && setSubMenuOpen(func.id)}
              >
                {func.label}
                {func.hasSubmenu && ' ▶'}
                {func.hasSubmenu && subMenuOpen === func.id && renderSubmenu(func.id)}
              </div>
            ))}
          </div>
        )}
      </div>
      
      <button 
        className="apply-button"
        onClick={handleApply}
        disabled={!selectedFunction}
      >
        Apply
      </button>
      
      {selectedFunction && (
        <span className="selected-function">
          {editFunctions.find(f => f.id === selectedFunction)?.label}
        </span>
      )}
    </div>
  );
};

export default ViewportEditor;