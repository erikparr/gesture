class SettingsManager {
  static async loadSettings() {
    try {
      const response = await fetch('http://localhost:8000/settings');
      if (!response.ok) {
        throw new Error('Failed to load settings');
      }
      const settings = await response.json();
      return settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      return this.getDefaultSettings();
    }
  }

  static async saveSettings(settings) {
    try {
      const response = await fetch('http://localhost:8000/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  static async uploadSettings(file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('http://localhost:8000/settings/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload settings');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error uploading settings:', error);
      throw error;
    }
  }

  static async downloadSettings() {
    try {
      const response = await fetch('http://localhost:8000/settings/download');
      
      if (!response.ok) {
        throw new Error('Failed to download settings');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gesture-edit-settings.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading settings:', error);
      throw error;
    }
  }

  static getDefaultSettings() {
    return {
      selectedScale: 'major',
      rootNote: 'C',
      octave: 4,
      zoomLevel: 100,
      editMode: false,
      lastMidiData: null
    };
  }

  static serializeMidiData(parsedMidi) {
    if (!parsedMidi || !parsedMidi.tracks) return null;
    
    try {
      // Extract only the necessary data
      const serializedTracks = parsedMidi.tracks.map(track => ({
        notes: track.notes.map(note => ({
          time: note.time,
          midi: note.midi,
          duration: note.duration,
          velocity: note.velocity
        }))
      }));
      
      return JSON.stringify({
        tracks: serializedTracks,
        duration: parsedMidi.duration
      });
    } catch (error) {
      console.error('Error serializing MIDI data:', error);
      return null;
    }
  }

  static deserializeMidiData(serializedData) {
    if (!serializedData) return null;
    
    try {
      return JSON.parse(serializedData);
    } catch (error) {
      console.error('Error deserializing MIDI data:', error);
      return null;
    }
  }
}

export default SettingsManager;