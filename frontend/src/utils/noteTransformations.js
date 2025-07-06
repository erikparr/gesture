// Note transformation functions for viewport-based editing

export const evenlySpaceNotes = (notes, viewportStart, viewportDuration) => {
  if (!notes || notes.length <= 1) return notes;
  
  const sortedNotes = [...notes].sort((a, b) => a.time - b.time);
  const spacing = viewportDuration / (notes.length - 1);
  
  return sortedNotes.map((note, index) => ({
    ...note,
    time: viewportStart + (index * spacing)
  }));
};

export const quantizeNotes = (notes, gridInterval) => {
  return notes.map(note => ({
    ...note,
    time: Math.round(note.time / gridInterval) * gridInterval
  }));
};

export const scaleNotePositions = (notes, scaleFactor, viewportStart, viewportDuration) => {
  const viewportCenter = viewportStart + viewportDuration / 2;
  
  return notes.map(note => {
    const offsetFromCenter = note.time - viewportCenter;
    return {
      ...note,
      time: viewportCenter + (offsetFromCenter * scaleFactor)
    };
  });
};

export const shiftNotes = (notes, shiftAmount) => {
  return notes.map(note => ({
    ...note,
    time: Math.max(0, note.time + shiftAmount)
  }));
};

export const reverseNotes = (notes, viewportStart, viewportDuration) => {
  const viewportEnd = viewportStart + viewportDuration;
  
  return notes.map(note => ({
    ...note,
    time: viewportEnd - (note.time - viewportStart)
  }));
};

export const alignNotesToStart = (notes, viewportStart) => {
  if (!notes || notes.length === 0) return notes;
  
  const minTime = Math.min(...notes.map(n => n.time));
  const offset = viewportStart - minTime;
  
  return notes.map(note => ({
    ...note,
    time: note.time + offset
  }));
};

export const transposeNotes = (notes, semitones) => {
  return notes.map(note => ({
    ...note,
    midi: Math.max(0, Math.min(127, note.midi + semitones))
  }));
};

export const invertNotes = (notes) => {
  if (!notes || notes.length === 0) return notes;
  
  const minMidi = Math.min(...notes.map(n => n.midi));
  const maxMidi = Math.max(...notes.map(n => n.midi));
  const centerMidi = (minMidi + maxMidi) / 2;
  
  return notes.map(note => ({
    ...note,
    midi: Math.round(centerMidi - (note.midi - centerMidi))
  }));
};

export const compressToScale = (notes, scaleNotes, rootNote) => {
  // Convert scale notes to MIDI numbers
  const scaleMidiNotes = scaleNotes.map(note => {
    const noteMap = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
    return noteMap[note];
  });
  
  return notes.map(note => {
    const octave = Math.floor(note.midi / 12);
    const noteInOctave = note.midi % 12;
    
    // Find nearest scale note
    let nearestScaleNote = scaleMidiNotes[0];
    let minDistance = Math.abs(noteInOctave - nearestScaleNote);
    
    for (const scaleNote of scaleMidiNotes) {
      const distance = Math.abs(noteInOctave - scaleNote);
      if (distance < minDistance) {
        minDistance = distance;
        nearestScaleNote = scaleNote;
      }
    }
    
    return {
      ...note,
      midi: octave * 12 + nearestScaleNote
    };
  });
};

export const duplicatePattern = (notes, viewportEnd) => {
  if (!notes || notes.length === 0) return notes;
  
  const duration = Math.max(...notes.map(n => n.time + n.duration)) - Math.min(...notes.map(n => n.time));
  const offset = viewportEnd;
  
  const duplicatedNotes = notes.map(note => ({
    ...note,
    time: note.time + offset,
    id: `${note.id}-dup`
  }));
  
  return [...notes, ...duplicatedNotes];
};

export const mirrorPattern = (notes, viewportEnd) => {
  if (!notes || notes.length === 0) return notes;
  
  // Find the actual end time of the pattern (last note end time)
  const patternEnd = Math.max(...notes.map(n => n.time + n.duration));
  const patternStart = Math.min(...notes.map(n => n.time));
  const patternDuration = patternEnd - patternStart;
  
  // Create mirrored notes by reversing the time within the pattern
  const mirroredNotes = notes.map((note, index) => {
    // Calculate reversed time: for each note, mirror it around the pattern center
    const relativeTime = note.time - patternStart;
    const mirroredRelativeTime = patternDuration - relativeTime - note.duration;
    const mirroredTime = patternEnd + mirroredRelativeTime;
    
    return {
      ...note,
      time: mirroredTime,
      id: `${note.id}-mirror-${index}`
    };
  }).reverse(); // Reverse the array order to get proper mirror sequence
  
  return [...notes, ...mirroredNotes];
};

export const humanizeNotes = (notes, maxVariation = 0.05) => {
  return notes.map(note => ({
    ...note,
    time: note.time + (Math.random() - 0.5) * 2 * maxVariation,
    velocity: Math.max(0.1, Math.min(1, note.velocity + (Math.random() - 0.5) * 0.2))
  }));
};

// Helper function to get notes within viewport
export const getNotesInViewport = (notes, viewportStart, viewportEnd) => {
  return notes.filter(note => 
    note.time >= viewportStart && 
    note.time <= viewportEnd
  );
};

// Helper function to apply transformation only to specific notes
export const applyToNotes = (allNotes, targetNotes, transformFn) => {
  const targetIds = new Set(targetNotes.map(n => n.id));
  const transformedMap = new Map();
  
  // Create a map of transformed notes
  transformFn.forEach((transformedNote, index) => {
    if (targetNotes[index] && targetNotes[index].id) {
      transformedMap.set(targetNotes[index].id, transformedNote);
    }
  });
  
  return allNotes.map(note => {
    if (targetIds.has(note.id) && transformedMap.has(note.id)) {
      return transformedMap.get(note.id);
    }
    return note;
  });
};