class MidiRecorder {
  constructor() {
    this.midiAccess = null;
    this.activeInputs = [];
    this.isRecording = false;
    this.recordingStartTime = null;
    this.recordedEvents = [];
    this.onStateChange = null;
    this.onProgress = null;
    this.onDeviceChange = null;
    this.onLiveNote = null;
    this.recordingTimer = null;
    this.maxRecordingTime = 10000; // 10 seconds in ms
    this.activeNotes = new Map(); // Track currently pressed notes
  }

  async initialize() {
    if (!navigator.requestMIDIAccess) {
      throw new Error('Web MIDI API is not supported in this browser');
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess();
      this.connectAllDevices();
      
      // Listen for device changes
      this.midiAccess.onstatechange = (e) => {
        console.log('MIDI device state changed:', e.port.name, e.port.state);
        if (e.port.type === 'input') {
          if (e.port.state === 'connected') {
            this.connectDevice(e.port);
          } else if (e.port.state === 'disconnected') {
            this.disconnectDevice(e.port);
          }
          if (this.onDeviceChange) {
            this.onDeviceChange(this.getConnectedDevices());
          }
        }
      };

      return true;
    } catch (error) {
      console.error('Failed to access MIDI devices:', error);
      throw error;
    }
  }

  connectAllDevices() {
    this.activeInputs = [];
    for (let input of this.midiAccess.inputs.values()) {
      this.connectDevice(input);
    }
  }

  connectDevice(input) {
    console.log('Connecting MIDI device:', input.name);
    input.onmidimessage = this.handleMidiMessage.bind(this);
    this.activeInputs.push(input);
  }

  disconnectDevice(input) {
    console.log('Disconnecting MIDI device:', input.name);
    input.onmidimessage = null;
    this.activeInputs = this.activeInputs.filter(i => i.id !== input.id);
  }

  getConnectedDevices() {
    return this.activeInputs.map(input => ({
      id: input.id,
      name: input.name,
      manufacturer: input.manufacturer,
      state: input.state
    }));
  }

  handleMidiMessage(event) {
    const [status, note, velocity] = event.data;
    
    // Only handle note on (144) and note off (128) messages
    if (status === 144 || status === 128) {
      const isNoteOn = status === 144 && velocity > 0;
      const currentTime = performance.now();
      
      if (this.isRecording) {
        const timestamp = currentTime - this.recordingStartTime;
        const midiEvent = {
          type: isNoteOn ? 'noteOn' : 'noteOff',
          note: note,
          velocity: velocity,
          timestamp: timestamp,
          channel: status & 0x0F
        };
        
        this.recordedEvents.push(midiEvent);
        console.log('Recorded MIDI event:', midiEvent);
      }
      
      // Handle live note visualization
      if (this.onLiveNote) {
        if (isNoteOn) {
          // Note pressed
          const liveNote = {
            id: `live-${note}-${currentTime}`,
            midi: note,
            velocity: velocity,
            startTime: this.isRecording ? currentTime - this.recordingStartTime : 0,
            isActive: true
          };
          this.activeNotes.set(note, liveNote);
          this.onLiveNote('noteOn', liveNote);
        } else {
          // Note released
          const activeNote = this.activeNotes.get(note);
          if (activeNote) {
            const endTime = this.isRecording ? currentTime - this.recordingStartTime : 0;
            const completedNote = {
              ...activeNote,
              duration: Math.max(0.1, (endTime - activeNote.startTime) / 1000), // Convert to seconds
              isActive: false
            };
            this.activeNotes.delete(note);
            this.onLiveNote('noteOff', completedNote);
          }
        }
      }
    }
  }

  startRecording() {
    if (this.isRecording) return;
    
    if (this.activeInputs.length === 0) {
      throw new Error('No MIDI devices connected');
    }

    this.isRecording = true;
    this.recordingStartTime = performance.now();
    this.recordedEvents = [];

    // Start progress timer
    const updateInterval = 100; // Update every 100ms
    this.recordingTimer = setInterval(() => {
      const elapsed = performance.now() - this.recordingStartTime;
      const progress = Math.min((elapsed / this.maxRecordingTime) * 100, 100);
      
      if (this.onProgress) {
        this.onProgress(progress);
      }

      if (elapsed >= this.maxRecordingTime) {
        this.stopRecording();
      }
    }, updateInterval);

    if (this.onStateChange) {
      this.onStateChange('recording');
    }
  }

  stopRecording() {
    if (!this.isRecording) return;

    this.isRecording = false;
    
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }

    // Process recorded events
    const recordingDuration = this.recordedEvents.length > 0 
      ? Math.max(...this.recordedEvents.map(e => e.timestamp))
      : 0;

    const recording = {
      events: this.recordedEvents,
      duration: recordingDuration,
      deviceCount: this.activeInputs.length
    };

    if (this.onStateChange) {
      this.onStateChange('stopped');
    }

    return recording;
  }

  setOnStateChange(callback) {
    this.onStateChange = callback;
  }

  setOnProgress(callback) {
    this.onProgress = callback;
  }

  setOnDeviceChange(callback) {
    this.onDeviceChange = callback;
  }

  setOnLiveNote(callback) {
    this.onLiveNote = callback;
  }

  destroy() {
    this.stopRecording();
    this.activeInputs.forEach(input => {
      input.onmidimessage = null;
    });
    this.activeInputs = [];
    this.midiAccess = null;
  }
}

export default MidiRecorder;