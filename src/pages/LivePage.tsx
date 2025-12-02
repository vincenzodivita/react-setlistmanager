import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import type { Setlist, Song } from '@/types';
import './LivePage.css';

export default function LivePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { songs } = useAppStore();

  // Stato corrente
  const [currentSetlist, setCurrentSetlist] = useState<Setlist | null>(
    location.state?.setlist || null
  );
  const [currentSongIndex, setCurrentSongIndex] = useState(0);

  // Metronome state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(1);
  const [currentBar, setCurrentBar] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [precountEnabled, setPrecountEnabled] = useState(true);
  const [isPrecount, setIsPrecount] = useState(false);
  const [precountBars, setPrecountBars] = useState(0);

  // Refs
  const intervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Canzone corrente
  const currentSong = currentSetlist
    ? songs.find((s) => s.id === currentSetlist.songs[currentSongIndex])
    : null;

  const totalBars = currentSong?.sections?.reduce((sum, s) => sum + s.bars, 0) || 0;

  // Cleanup su unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Init audio context
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  // Suono click metronomo
  const playClick = (isAccent: boolean) => {
    if (!audioContextRef.current) return;

    const osc = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();
    osc.connect(gain);
    gain.connect(audioContextRef.current.destination);

    osc.type = 'sine';
    osc.frequency.value = isAccent ? 1200 : 800;

    gain.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.1);

    osc.start(audioContextRef.current.currentTime);
    osc.stop(audioContextRef.current.currentTime + 0.1);
  };

  // Aggiorna indice sezione
  const updateSectionProgress = (barNumber?: number) => {
    if (!currentSong?.sections) return;
    const bar = barNumber !== undefined ? barNumber : currentBar;
    let accBars = 0;

    for (let i = 0; i < currentSong.sections.length; i++) {
      if (bar < accBars + currentSong.sections[i].bars) {
        setCurrentSectionIndex(i);
        return;
      }
      accBars += currentSong.sections[i].bars;
    }

    // Se finito, reset
    if (bar >= totalBars) {
      setCurrentBar(-1);
      setCurrentSectionIndex(0);
    } else {
      setCurrentSectionIndex(currentSong.sections.length - 1);
    }
  };

  // Start metronomo
  const startMetronome = () => {
    if (!currentSong) return;
    initAudioContext();

    const bpm = currentSong.bpm;
    const interval = (60 / bpm) * 1000;

    setIsPlaying(true);
    setCurrentBeat(1);

    if (precountEnabled) {
      setIsPrecount(true);
      setPrecountBars(2);
    } else {
      setIsPrecount(false);
      setPrecountBars(0);
    }

    playClick(true); // primo click subito

    intervalRef.current = window.setInterval(() => {
      setCurrentBeat((prevBeat) => {
        const nextBeat = prevBeat >= currentSong.timeSignature ? 1 : prevBeat + 1;

        if (isPrecount) {
          setPrecountBars((prev) => {
            const remaining = prev - (nextBeat === 1 ? 1 : 0);
            if (remaining <= 0) setIsPrecount(false);
            return remaining;
          });
        } else {
          if (nextBeat === 1) {
            setCurrentBar((prevBar) => prevBar + 1);
            updateSectionProgress();
          }
        }

        playClick(nextBeat === 1 && !isPrecount);
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
  };

  const toggleMetronome = () => (isPlaying ? stopMetronome() : startMetronome());

  const handleStop = () => {
    stopMetronome();
    setCurrentBar(0);
    setCurrentBeat(1);
    setCurrentSectionIndex(0);
    setIsPrecount(false);
    setPrecountBars(0);
  };

  // Navigazione brani
  const handlePrevSong = () => {
    if (currentSongIndex > 0) {
      handleStop();
      setCurrentSongIndex(currentSongIndex - 1);
    }
  };

  const handleNextSong = () => {
    if (currentSetlist && currentSongIndex < currentSetlist.songs.length - 1) {
      handleStop();
      setCurrentSongIndex(currentSongIndex + 1);
    }
  };

  const handleSelectSong = (index: number) => {
    handleStop();
    setCurrentSongIndex(index);
  };

  const handleJumpToSection = (sectionIndex: number) => {
    if (!currentSong?.sections) return;
    if (isPlaying) return;

    let targetBar = 0;
    for (let i = 0; i < sectionIndex; i++) {
      targetBar += currentSong.sections[i].bars;
    }

    setCurrentBar(targetBar);
    setCurrentSectionIndex(sectionIndex);
    setCurrentBeat(1);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    if (!currentSong?.sections) return;

    let accumulated = 0;
    let sectionIndex = 0;
    for (let i = 0; i < currentSong.sections.length; i++) {
      if (val < accumulated + currentSong.sections[i].bars) {
        sectionIndex = i;
        break;
      }
      accumulated += currentSong.sections[i].bars;
      sectionIndex = i;
    }

    setCurrentBar(val);
    setCurrentSectionIndex(sectionIndex);
    setCurrentBeat(1);
  };

  const getSectionInfo = () => {
    if (!currentSong?.sections) return null;
    let acc = 0;
    for (let i = 0; i < currentSectionIndex && i < currentSong.sections.length; i++) {
      acc += currentSong.sections[i].bars;
    }
    const barsInSection = isPrecount ? 0 : currentBar - acc;
    return { currentBarInSection: barsInSection + 1 };
  };

  const sectionInfo = getSectionInfo();

  // Stato vuoto
  if (!currentSetlist) {
    return (
      <div className="page">
        <h2>Modalità Live</h2>
        <p>Nessuna setlist caricata</p>
        <button onClick={() => navigate('/setlists')}>Vai alle setlist</button>
      </div>
    );
  }

  if (!currentSong) {
    return (
      <div className="page">
        <h2>Modalità Live</h2>
        <p>Brano non trovato</p>
      </div>
    );
  }

  // Render principale
  return (
    <div className="live-page">
      <div className="live-sidebar">
        <h3>Setlist</h3>
        <div>{currentSetlist.name}</div>
        <div>Brano {currentSongIndex + 1} di {currentSetlist.songs.length}</div>
        {currentSetlist.songs.map((songId, idx) => {
          const song = songs.find((s) => s.id === songId);
          if (!song) return null;
          return (
            <div
              key={songId}
              className={`track-item ${idx === currentSongIndex ? 'active' : ''}`}
              onClick={() => handleSelectSong(idx)}
            >
              {idx + 1}. {song.name}
            </div>
          );
        })}
      </div>

      <div className="live-main">
        <h2>{currentSong.name}</h2>
        <div>
          {currentSong.bpm} BPM • {currentSong.timeSignature}/4
        </div>

        {/* Metronomo */}
        <div className="metronome-beats">
          {Array.from({ length: currentSong.timeSignature }, (_, i) => (
            <span
              key={i}
              className={`beat ${currentBeat === i + 1 ? (isPrecount ? 'precount' : 'accent') : ''}`}
            >
              {i + 1}
            </span>
          ))}
        </div>

        {/* Controlli */}
        <div className="controls">
          <button onClick={handlePrevSong} disabled={currentSongIndex === 0}>⏮</button>
          <button onClick={handleStop}>⏹</button>
          <button onClick={toggleMetronome}>{isPlaying ? '⏸' : '▶'}</button>
          <button onClick={handleNextSong} disabled={currentSongIndex === currentSetlist.songs.length - 1}>⏭</button>
        </div>

        {/* Progressione barre */}
        {currentSong.sections && currentSong.sections.length > 0 && (
          <div className="progress-container">
            <span>{isPrecount ? 'PRE' : currentBar + 1} / {totalBars}</span>
            <input
              type="range"
              min={0}
              max={totalBars}
              value={isPrecount ? 0 : currentBar}
              onChange={handleProgressChange}
              disabled={isPlaying}
            />
          </div>
        )}

        {/* Sezioni */}
        {currentSong.sections && currentSong.sections.length > 0 && (
          <div className="sections">
            {currentSong.sections.map((sec, idx) => {
              const isActive = idx === currentSectionIndex && !isPrecount;
              const barsCompleted = isActive && sectionInfo ? sectionInfo.currentBarInSection : 0;
              return (
                <div
                  key={idx}
                  className={`section ${isActive ? 'active' : ''}`}
                  onClick={() => handleJumpToSection(idx)}
                  style={{ pointerEvents: isPlaying ? 'none' : 'auto' }}
                >
                  {sec.name} ({barsCompleted}/{sec.bars})
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
