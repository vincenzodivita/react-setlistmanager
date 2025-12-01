import { useState, useEffect, useRef } from 'react';
import './MetronomePage.css';

export default function MetronomePage() {
  const [bpm, setBpm] = useState(120);
  const [timeSignature, setTimeSignature] = useState(4);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(1);
  
  const intervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playClick = (isAccent: boolean) => {
    if (!audioContextRef.current) return;

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    oscillator.frequency.value = isAccent ? 1200 : 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.1);

    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + 0.1);
  };

  const startMetronome = () => {
    initAudioContext();
    
    const interval = (60 / bpm) * 1000;
    setIsPlaying(true);
    setCurrentBeat(1);
    playClick(true);

    intervalRef.current = setInterval(() => {
      setCurrentBeat((prev) => {
        const nextBeat = prev >= timeSignature ? 1 : prev + 1;
        playClick(nextBeat === 1);
        return nextBeat;
      });
    }, interval);
  };

  const stopMetronome = () => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCurrentBeat(1);
  };

  const toggleMetronome = () => {
    if (isPlaying) {
      stopMetronome();
    } else {
      startMetronome();
    }
  };

  const adjustBpm = (delta: number) => {
    const newBpm = Math.max(30, Math.min(300, bpm + delta));
    setBpm(newBpm);
    
    if (isPlaying) {
      stopMetronome();
      setTimeout(() => startMetronome(), 100);
    }
  };

  const handleBpmChange = (value: number) => {
    if (value >= 30 && value <= 300) {
      setBpm(value);
      
      if (isPlaying) {
        stopMetronome();
        setTimeout(() => startMetronome(), 100);
      }
    }
  };

  const handleTimeSignatureChange = (value: number) => {
    setTimeSignature(value);
    if (isPlaying) {
      stopMetronome();
      setTimeout(() => startMetronome(), 100);
    }
  };

  return (
    <div className="metronome-page">
      <h2>Metronomo</h2>

      <div className="metronome-display">
        <div className="metronome-beats">
          {Array.from({ length: timeSignature }, (_, i) => (
            <div
              key={i}
              className={`beat-indicator ${currentBeat === i + 1 && isPlaying ? 'active' : ''} ${
                currentBeat === i + 1 && i === 0 && isPlaying ? 'accent' : ''
              }`}
            >
              <span className="beat-number">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="metronome-controls">
        <div className="control-group">
          <label>BPM</label>
          <div className="bpm-control">
            <button onClick={() => adjustBpm(-1)} className="btn btn-secondary">
              −
            </button>
            <input
              type="number"
              value={bpm}
              onChange={(e) => handleBpmChange(Number(e.target.value))}
              min="30"
              max="300"
              className="bpm-input"
            />
            <button onClick={() => adjustBpm(1)} className="btn btn-secondary">
              +
            </button>
          </div>
          <input
            type="range"
            value={bpm}
            onChange={(e) => handleBpmChange(Number(e.target.value))}
            min="30"
            max="300"
            className="bpm-slider"
          />
        </div>

        <div className="control-group">
          <label>Tempo</label>
          <select
            value={timeSignature}
            onChange={(e) => handleTimeSignatureChange(Number(e.target.value))}
          >
            <option value="2">2/4</option>
            <option value="3">3/4</option>
            <option value="4">4/4</option>
            <option value="5">5/4</option>
            <option value="6">6/8</option>
            <option value="7">7/8</option>
          </select>
        </div>

        <button
          onClick={toggleMetronome}
          className={`btn ${isPlaying ? 'btn-danger' : 'btn-primary'}`}
        >
          {isPlaying ? '⏸ Stop' : '▶ Start'}
        </button>
      </div>
    </div>
  );
}