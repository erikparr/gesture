import * as Tone from 'tone';

class MultiLayerPlayer {
  constructor() {
    this.synths = new Map(); // Map of layerId to synth
    this.scheduledNotes = new Map(); // Map of layerId to scheduled note IDs
    this.isPlaying = false;
    this.startTime = null;
    this.layerStates = new Map(); // Map of layerId to { muted: boolean, volume: number }
  }

  initialize(layers) {
    // Create a synth for each layer
    layers.forEach(layer => {
      if (!this.synths.has(layer.id)) {
        const synth = new Tone.PolySynth(Tone.Synth, {
          maxPolyphony: 32,
          voice: Tone.Synth
        }).toDestination();
        
        this.synths.set(layer.id, synth);
        this.layerStates.set(layer.id, {
          muted: false,
          volume: 0 // dB
        });
      }
    });
  }

  async playAll(layers, onProgress) {
    if (this.isPlaying) return;

    try {
      // Start the audio context
      await Tone.start();
      
      // Initialize synths if needed
      this.initialize(layers);
      
      this.isPlaying = true;
      this.startTime = Tone.now();
      
      // Schedule notes for each layer
      layers.forEach(layer => {
        if (!layer.parsedMidi || !layer.parsedMidi.tracks || layer.parsedMidi.tracks.length === 0) {
          return;
        }

        const synth = this.synths.get(layer.id);
        const layerState = this.layerStates.get(layer.id);
        const scheduledIds = [];
        
        // Set volume
        synth.volume.value = layerState.muted ? -Infinity : layerState.volume;
        
        // Get all notes from all tracks
        const allNotes = [];
        layer.parsedMidi.tracks.forEach(track => {
          track.notes.forEach(note => {
            allNotes.push({
              time: note.time,
              midi: note.midi,
              duration: note.duration,
              velocity: note.velocity || 0.7
            });
          });
        });
        
        // Sort by time
        allNotes.sort((a, b) => a.time - b.time);
        
        // Schedule all notes
        allNotes.forEach(note => {
          const id = Tone.Transport.scheduleOnce((time) => {
            synth.triggerAttackRelease(
              Tone.Frequency(note.midi, "midi"),
              note.duration,
              time,
              note.velocity
            );
          }, this.startTime + note.time);
          
          scheduledIds.push(id);
        });
        
        this.scheduledNotes.set(layer.id, scheduledIds);
      });
      
      // Start transport if not already started
      if (Tone.Transport.state !== "started") {
        Tone.Transport.start();
      }
      
      // Set up progress tracking
      if (onProgress) {
        this.progressInterval = setInterval(() => {
          if (this.isPlaying) {
            const elapsed = Tone.now() - this.startTime;
            onProgress(elapsed);
          }
        }, 50); // Update every 50ms
      }
      
      // Find the longest duration
      let maxDuration = 0;
      layers.forEach(layer => {
        if (layer.parsedMidi && layer.parsedMidi.tracks) {
          layer.parsedMidi.tracks.forEach(track => {
            track.notes.forEach(note => {
              const endTime = note.time + note.duration;
              if (endTime > maxDuration) {
                maxDuration = endTime;
              }
            });
          });
        }
      });
      
      // Schedule stop
      if (maxDuration > 0) {
        setTimeout(() => {
          this.stopAll();
        }, maxDuration * 1000 + 500); // Add 500ms buffer
      }
      
    } catch (error) {
      console.error('Error playing all layers:', error);
      this.stopAll();
    }
  }

  stopAll() {
    if (!this.isPlaying) return;
    
    // Clear all scheduled notes
    this.scheduledNotes.forEach((ids, layerId) => {
      ids.forEach(id => Tone.Transport.clear(id));
    });
    this.scheduledNotes.clear();
    
    // Stop all synths
    this.synths.forEach(synth => {
      synth.releaseAll();
    });
    
    // Clear progress interval
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    
    this.isPlaying = false;
    this.startTime = null;
  }

  muteLayer(layerId, muted) {
    const layerState = this.layerStates.get(layerId);
    if (layerState) {
      layerState.muted = muted;
      const synth = this.synths.get(layerId);
      if (synth) {
        synth.volume.value = muted ? -Infinity : layerState.volume;
      }
    }
  }

  setLayerVolume(layerId, volumeDb) {
    const layerState = this.layerStates.get(layerId);
    if (layerState) {
      layerState.volume = volumeDb;
      const synth = this.synths.get(layerId);
      if (synth && !layerState.muted) {
        synth.volume.value = volumeDb;
      }
    }
  }

  isLayerMuted(layerId) {
    const layerState = this.layerStates.get(layerId);
    return layerState ? layerState.muted : false;
  }

  dispose() {
    this.stopAll();
    this.synths.forEach(synth => synth.dispose());
    this.synths.clear();
    this.layerStates.clear();
  }
}

export default MultiLayerPlayer;