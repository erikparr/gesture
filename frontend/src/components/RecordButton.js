import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';

const RecordButton = forwardRef(({ onRecordComplete, disabled }, ref) => {
  const [recordingState, setRecordingState] = useState('idle'); // idle, countdown, recording, processing
  const [countdown, setCountdown] = useState(3);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (recordingState === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (recordingState === 'countdown' && countdown === 0) {
      setRecordingState('recording');
      if (onRecordComplete) {
        onRecordComplete('start');
      }
    }
  }, [recordingState, countdown, onRecordComplete]);

  const handleClick = () => {
    if (recordingState === 'idle') {
      setError(null);
      setCountdown(3);
      setRecordingState('countdown');
    } else if (recordingState === 'recording') {
      setRecordingState('processing');
      if (onRecordComplete) {
        onRecordComplete('stop');
      }
      setTimeout(() => {
        setRecordingState('idle');
        setProgress(0);
      }, 500);
    }
  };

  const updateProgress = (newProgress) => {
    setProgress(newProgress);
    if (newProgress >= 100) {
      setRecordingState('processing');
      if (onRecordComplete) {
        onRecordComplete('stop');
      }
      setTimeout(() => {
        setRecordingState('idle');
        setProgress(0);
      }, 500);
    }
  };

  // Expose updateProgress method
  useImperativeHandle(ref, () => ({
    updateProgress,
    setError: (err) => {
      setError(err);
      setRecordingState('idle');
      setProgress(0);
    }
  }));

  const getButtonText = () => {
    switch (recordingState) {
      case 'countdown':
        return `Starting in ${countdown}...`;
      case 'recording':
        return 'Stop Recording';
      case 'processing':
        return 'Processing...';
      default:
        return 'Record MIDI';
    }
  };

  const getButtonStyle = () => {
    const baseStyle = {
      padding: '12px 24px',
      fontSize: '16px',
      fontWeight: 'bold',
      border: 'none',
      borderRadius: '8px',
      cursor: disabled || recordingState === 'processing' ? 'not-allowed' : 'pointer',
      transition: 'all 0.3s ease',
      minWidth: '180px'
    };

    switch (recordingState) {
      case 'countdown':
        return {
          ...baseStyle,
          backgroundColor: '#FFA500',
          color: 'white'
        };
      case 'recording':
        return {
          ...baseStyle,
          backgroundColor: '#DC143C',
          color: 'white'
        };
      case 'processing':
        return {
          ...baseStyle,
          backgroundColor: '#6c757d',
          color: 'white'
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: disabled ? '#ccc' : '#FF6347',
          color: 'white'
        };
    }
  };

  return (
    <div style={{ marginTop: '16px' }}>
      <button
        onClick={handleClick}
        disabled={disabled || recordingState === 'processing'}
        style={getButtonStyle()}
      >
        {getButtonText()}
      </button>
      
      {recordingState === 'recording' && (
        <div style={{ marginTop: '16px' }}>
          <div style={{
            width: '300px',
            height: '20px',
            backgroundColor: '#e0e0e0',
            borderRadius: '10px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: '#FF6347',
              transition: 'width 0.1s ease'
            }} />
          </div>
          <p style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
            Recording: {Math.round(progress / 10)}s / 10s
          </p>
        </div>
      )}
      
      {error && (
        <div style={{ color: 'red', marginTop: '8px' }}>
          {error}
        </div>
      )}
    </div>
  );
});

export default RecordButton;