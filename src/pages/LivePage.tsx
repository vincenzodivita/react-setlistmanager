import React, { useState, useEffect, useRef } from 'react';

// Tipi
interface Section {
  name: string;
  bars: number;
}

interface Song {
  id: string;
  name: string;
  bpm: number;
  timeSignature: number;
  sections?: Section[];
}

interface Setlist {
  id: string;
  name: string;
  songs: string[];
}

// Props
interface LivePageProps {
  setlists: Setlist[];
  songs: Song[];
  currentSetlistId: string;
  api: any; // oggetti API per update/reorder
}

const LivePage: React.FC<LivePageProps> = ({ setlists, songs, currentSetlistId, api }) => {
  const [currentSetlist, setCurrentSetlist] = useState<Setlist | null>(null);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentBar, setCurrentBar] = useState(0); // barre completate
  const [currentBeat, setCurrentBeat] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPrecount, setIsPrecount] = useState(false);
  const [precountBars, setPrecountBars] = useState(0);

  const [progress, setProgress] = useState(0); // valore slider
  const audioContextRef = useRef<AudioContext | null>(null);
const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load setlist e song corrente
  useEffect(() => {
    const setlist = setlists.find(s => s.id === currentSetlistId) || null;
    setCurrentSetlist(setlist);
    if (setlist && setlist.songs.length > 0) {
      setCurrentSongIndex(0);
      const song = songs.find(s => s.id === setlist.songs[0]) || null;
      setCurrentSong(song);
    }
  }, [currentSetlistId, setlists, songs]);

  // Init AudioContext
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playClick = (isAccent: boolean) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.value = isAccent ? 1200 : 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
  };

  const startMetronome = () => {
    if (!currentSong) return;
    initAudioContext();
    const interval = (60 / currentSong.bpm) * 1000;

    // Precount
    const precountEnabled = true; // o checkbox
    setIsPrecount(precountEnabled);
    setPrecountBars(precountEnabled ? 2 : 0);

    setCurrentBeat(1);
    setIsPlaying(true);

    intervalRef.current = setInterval(() => {
      // fine battuta
      const isNewBar = currentBeat === currentSong.timeSignature;
      if (isPrecount) {
        if (isNewBar) {
          setPrecountBars(prev => {
            const remaining = prev - 1;
            if (remaining <= 0) setIsPrecount(false);
            return remaining;
          });
        }
        playClick(currentBeat === 1);
      } else {
        if (isNewBar) setCurrentBar(prev => prev + 1);
        playClick(currentBeat === 1);
        // Aggiorna progress
        if (currentSong.sections && currentSong.sections.length > 0) {
          const totalBars = currentSong.sections.reduce((sum, s) => sum + s.bars, 0);
          setProgress(prev => Math.min(prev + (isNewBar ? 1 : 0), totalBars));
        }
      }

      setCurrentBeat(prev => (prev >= currentSong.timeSignature ? 1 : prev + 1));
    }, interval);
  };

  const stopMetronome = () => {
    setIsPlaying(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const nextSong = () => {
    if (!currentSetlist) return;
    const nextIndex = currentSongIndex + 1;
    if (nextIndex < currentSetlist.songs.length) {
      const song = songs.find(s => s.id === currentSetlist.songs[nextIndex]) || null;
      setCurrentSongIndex(nextIndex);
      setCurrentSong(song);
      setCurrentSectionIndex(0);
      setCurrentBar(0);
      setProgress(0);
      stopMetronome();
    }
  };

  const prevSong = () => {
    if (!currentSetlist) return;
    const prevIndex = currentSongIndex - 1;
    if (prevIndex >= 0) {
      const song = songs.find(s => s.id === currentSetlist.songs[prevIndex]) || null;
      setCurrentSongIndex(prevIndex);
      setCurrentSong(song);
      setCurrentSectionIndex(0);
      setCurrentBar(0);
      setProgress(0);
      stopMetronome();
    }
  };

  const jumpToSection = (index: number) => {
    if (!currentSong || !currentSong.sections) return;
    let bars = 0;
    for (let i = 0; i < index; i++) {
      bars += currentSong.sections[i].bars;
    }
    setCurrentSectionIndex(index);
    setCurrentBar(bars);
    setProgress(bars);
    setCurrentBeat(1);
  };

  return (
    <div className="live-page">
      <h2>Live Mode</h2>
      <div className="current-song">
        <h3>{currentSong?.name}</h3>
        <p>{currentSong?.bpm} BPM • {currentSong?.timeSignature}/4</p>
      </div>

      <div className="sections">
        {currentSong?.sections?.map((s, idx) => (
          <div
            key={idx}
            className={`section-item ${idx === currentSectionIndex ? 'active' : ''}`}
            onClick={() => jumpToSection(idx)}
          >
            <span>{s.name} ({s.bars} batt.)</span>
          </div>
        ))}
      </div>

      <div className="controls">
        <button onClick={prevSong}>⏮ Prev</button>
        {isPlaying ? (
          <button onClick={stopMetronome}>⏸ Pause</button>
        ) : (
          <button onClick={startMetronome}>▶ Play</button>
        )}
        <button onClick={nextSong}>⏭ Next</button>
      </div>

      <div className="progress">
        <span>Bar: {isPrecount ? 'PRE' : currentBar + 1}</span>
        <input
          type="range"
          min={0}
          max={currentSong?.sections?.reduce((sum, s) => sum + s.bars, 0) || 0}
          value={progress}
          readOnly
        />
      </div>

      <div className="metronome-beats">
        {Array.from({ length: currentSong?.timeSignature || 4 }, (_, i) => (
          <span key={i} className={`beat ${currentBeat === i + 1 ? (isPrecount ? 'precount' : 'accent') : ''}`}>
            {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
};

export default LivePage;
