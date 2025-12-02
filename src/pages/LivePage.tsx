import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import type { Setlist, Song } from '@/types';
import './LivePage.css';

export default function LivePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { songs } = useAppStore();

  const [currentSetlist, setCurrentSetlist] = useState<Setlist | null>(
    location.state?.setlist || null
  );
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(1);
  const [currentBar, setCurrentBar] = useState(0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [precountEnabled, setPrecountEnabled] = useState(true);
  const [isPrecount, setIsPrecount] = useState(false);
  const [precountBarsRemaining, setPrecountBarsRemaining] = useState(0);
  
  // Progress fluido
  const [smoothProgress, setSmoothProgress] = useState(0);

  const intervalRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedProgressRef = useRef<number>(0);

  // Refs per evitare stale closures
  const isPrecountRef = useRef(false);
  const precountBarsRef = useRef(0);
  const currentBarRef = useRef(0);

  const currentSong = currentSetlist
    ? songs.find((s) => s.id === currentSetlist.songs[currentSongIndex])
    : null;

  const totalBars = currentSong?.sections?.reduce((sum, s) => sum + s.bars, 0) || 0;
  
  // Calcola la durata totale in millisecondi
  const getTotalDurationMs = useCallback(() => {
    if (!currentSong) return 0;
    const beatsPerBar = currentSong.timeSignature;
    const totalBeats = totalBars * beatsPerBar;
    const msPerBeat = (60 / currentSong.bpm) * 1000;
    return totalBeats * msPerBeat;
  }, [currentSong, totalBars]);

  const totalDurationMs = getTotalDurationMs();

  // Sync refs con state
  useEffect(() => {
    isPrecountRef.current = isPrecount;
  }, [isPrecount]);

  useEffect(() => {
    precountBarsRef.current = precountBarsRemaining;
  }, [precountBarsRemaining]);

  useEffect(() => {
    currentBarRef.current = currentBar;
  }, [currentBar]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
  };

  const playClick = useCallback((isAccent: boolean, isPrecount: boolean = false) => {
    if (!audioContextRef.current) return;

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    // Frequenza diversa per precount
    if (isPrecount) {
      oscillator.frequency.value = 1000; // Tono medio per precount
    } else {
      oscillator.frequency.value = isAccent ? 1200 : 800;
    }
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContextRef.current.currentTime + 0.1
    );

    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + 0.1);
  }, []);

  const updateSectionFromBar = useCallback((barNumber: number) => {
    if (!currentSong?.sections) return;

    let accumulatedBars = 0;
    for (let i = 0; i < currentSong.sections.length; i++) {
      const section = currentSong.sections[i];
      if (barNumber < accumulatedBars + section.bars) {
        setCurrentSectionIndex(i);
        return;
      }
      accumulatedBars += section.bars;
    }

    // Se abbiamo superato l'ultima sezione, ferma
    stopMetronome();
    setCurrentBar(0);
    setCurrentSectionIndex(0);
  }, [currentSong]);

  const stopMetronome = useCallback(() => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    // Salva il progresso corrente per eventuale resume
    pausedProgressRef.current = smoothProgress;
  }, [smoothProgress]);

  const startMetronome = useCallback(() => {
    if (!currentSong) return;

    initAudioContext();

    const bpm = currentSong.bpm;
    const timeSignature = currentSong.timeSignature;
    const interval = (60 / bpm) * 1000;

    // Inizializza stato
    setIsPlaying(true);
    setCurrentBeat(1);

    // Setup precount
    if (precountEnabled) {
      setIsPrecount(true);
      setPrecountBarsRemaining(2);
      isPrecountRef.current = true;
      precountBarsRef.current = 2;
    } else {
      setIsPrecount(false);
      setPrecountBarsRemaining(0);
      isPrecountRef.current = false;
      precountBarsRef.current = 0;
    }

    // Primo click
    playClick(true, precountEnabled);

    let beatCounter = 1;

    // Calcola il tempo di inizio per l'animazione fluida
    // Considera il progresso già fatto (se stiamo riprendendo)
    const msPerBeat = interval;
    const beatsPerBar = timeSignature;
    const currentProgressMs = currentBarRef.current * beatsPerBar * msPerBeat;
    startTimeRef.current = performance.now() - currentProgressMs;

    // Funzione per aggiornare il progresso fluido
    const updateSmoothProgress = () => {
      if (!isPrecountRef.current && totalDurationMs > 0) {
        const elapsed = performance.now() - startTimeRef.current;
        const progress = Math.min((elapsed / totalDurationMs) * 100, 100);
        setSmoothProgress(progress);
      }
      animationFrameRef.current = requestAnimationFrame(updateSmoothProgress);
    };

    // Avvia l'animazione fluida dopo il precount
    if (!precountEnabled) {
      animationFrameRef.current = requestAnimationFrame(updateSmoothProgress);
    }

    intervalRef.current = window.setInterval(() => {
      // Calcola prossimo beat
      beatCounter = beatCounter >= timeSignature ? 1 : beatCounter + 1;
      setCurrentBeat(beatCounter);

      const isFirstBeatOfBar = beatCounter === 1;

      if (isPrecountRef.current) {
        // Siamo in precount
        playClick(isFirstBeatOfBar, true);

        if (isFirstBeatOfBar) {
          const newPrecountBars = precountBarsRef.current - 1;
          precountBarsRef.current = newPrecountBars;
          setPrecountBarsRemaining(newPrecountBars);

          if (newPrecountBars <= 0) {
            isPrecountRef.current = false;
            setIsPrecount(false);
            // Avvia l'animazione fluida ora che il precount è finito
            startTimeRef.current = performance.now();
            animationFrameRef.current = requestAnimationFrame(updateSmoothProgress);
          }
        }
      } else {
        // Esecuzione normale
        playClick(isFirstBeatOfBar, false);

        if (isFirstBeatOfBar) {
          const newBar = currentBarRef.current + 1;
          currentBarRef.current = newBar;
          setCurrentBar(newBar);

          // Aggiorna sezione
          if (currentSong?.sections) {
            let accumulatedBars = 0;
            let found = false;
            for (let i = 0; i < currentSong.sections.length; i++) {
              const section = currentSong.sections[i];
              if (newBar < accumulatedBars + section.bars) {
                setCurrentSectionIndex(i);
                found = true;
                break;
              }
              accumulatedBars += section.bars;
            }

            // Se abbiamo superato tutte le sezioni, ferma
            if (!found && newBar >= totalBars) {
              clearInterval(intervalRef.current!);
              intervalRef.current = null;
              if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
              }
              setIsPlaying(false);
              setCurrentBar(0);
              currentBarRef.current = 0;
              setCurrentSectionIndex(0);
              setCurrentBeat(1);
              setSmoothProgress(0);
              beatCounter = 1;
            }
          }
        }
      }
    }, interval);
  }, [currentSong, precountEnabled, playClick, totalBars, totalDurationMs]);

  const toggleMetronome = () => {
    if (isPlaying) {
      stopMetronome();
    } else {
      startMetronome();
    }
  };

  const handleStop = useCallback(() => {
    stopMetronome();
    setCurrentBar(0);
    currentBarRef.current = 0;
    setCurrentSectionIndex(0);
    setCurrentBeat(1);
    setIsPrecount(false);
    isPrecountRef.current = false;
    setPrecountBarsRemaining(0);
    precountBarsRef.current = 0;
    setSmoothProgress(0);
    pausedProgressRef.current = 0;
  }, [stopMetronome]);

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
    if (isPlaying || !currentSong?.sections) return;

    let targetBar = 0;
    for (let i = 0; i < sectionIndex; i++) {
      targetBar += currentSong.sections[i].bars;
    }
    setCurrentBar(targetBar);
    currentBarRef.current = targetBar;
    setCurrentSectionIndex(sectionIndex);
    setCurrentBeat(1);
    
    // Aggiorna smooth progress
    const newProgress = totalBars > 0 ? (targetBar / totalBars) * 100 : 0;
    setSmoothProgress(newProgress);
    pausedProgressRef.current = newProgress;
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value);
    if (!currentSong?.sections || totalDurationMs === 0) return;

    // Calcola la battuta corrispondente
    const completedBars = Math.floor((newProgress / 100) * totalBars);

    let accumulatedBars = 0;
    let targetSection = 0;

    for (let i = 0; i < currentSong.sections.length; i++) {
      if (completedBars < accumulatedBars + currentSong.sections[i].bars) {
        targetSection = i;
        break;
      }
      accumulatedBars += currentSong.sections[i].bars;
      targetSection = i;
    }

    setCurrentBar(completedBars);
    currentBarRef.current = completedBars;
    setCurrentSectionIndex(targetSection);
    setCurrentBeat(1);
    setSmoothProgress(newProgress);
    pausedProgressRef.current = newProgress;
  };

  const getSectionInfo = () => {
    if (!currentSong?.sections || currentSong.sections.length === 0) return null;

    const sections = currentSong.sections;
    let accumulatedBars = 0;
    for (let i = 0; i < currentSectionIndex && i < sections.length; i++) {
      accumulatedBars += sections[i].bars;
    }

    const barsIntoSection = isPrecount ? 0 : currentBar - accumulatedBars;
    const currentBarInSection = barsIntoSection + 1;

    return { accumulatedBars, barsIntoSection, currentBarInSection };
  };

  const sectionInfo = getSectionInfo();

  if (!currentSetlist) {
    return (
      <div className="page">
        <div className="page-header">
          <h2>Modalità Live</h2>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">🎤</div>
          <p>Nessuna setlist caricata</p>
          <button onClick={() => navigate('/setlists')} className="btn btn-primary">
            Vai alle Setlist
          </button>
        </div>
      </div>
    );
  }

  if (!currentSong) {
    return (
      <div className="page">
        <div className="page-header">
          <h2>Modalità Live</h2>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">❌</div>
          <p>Brano non trovato</p>
        </div>
      </div>
    );
  }

  return (
    <main className="live-page">
      <div className="live-container">
        {/* Sidebar */}
        <aside className="live-sidebar">
          <h3>Setlist</h3>
          <div className="live-setlist-info">
            <div className="live-setlist-name">{currentSetlist.name}</div>
            <div className="live-setlist-progress">
              Brano {currentSongIndex + 1} di {currentSetlist.songs.length}
            </div>
          </div>
          <div className="live-track-list">
            {currentSetlist.songs.map((songId, index) => {
              const song = songs.find((s) => s.id === songId);
              if (!song) return null;

              return (
                <div
                  key={songId}
                  className={`live-track-item ${index === currentSongIndex ? 'active' : ''}`}
                  onClick={() => handleSelectSong(index)}
                >
                  <span className="track-number">{index + 1}</span>
                  <div className="track-info">
                    <div className="track-name">{song.name}</div>
                    <div className="track-details">
                      {song.bpm} BPM • {song.timeSignature}/4
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main area */}
        <section className="live-main">
          <div className="live-header">
            <h2>{currentSong.name}</h2>
            <div className="live-song-info">
              <span className="info-badge">⏱️ {currentSong.bpm} BPM</span>
              <span className="info-badge">🎵 {currentSong.timeSignature}/4</span>
              {currentSong.sections && currentSong.sections.length > 0 && (
                <span className="info-badge">📝 {currentSong.sections.length} sezioni</span>
              )}
            </div>
          </div>

          {/* Metronome */}
          <div className="metronome-display">
            {isPrecount && (
              <div className="precount-indicator">
                PRECOUNT: {precountBarsRemaining} {precountBarsRemaining === 1 ? 'battuta' : 'battute'}
              </div>
            )}
            <div className="metronome-beats">
              {Array.from({ length: currentSong.timeSignature }, (_, i) => (
                <div
                  key={i}
                  className={`beat-indicator ${
                    currentBeat === i + 1 && isPlaying ? 'active' : ''
                  } ${
                    currentBeat === i + 1 && i === 0 && isPlaying && !isPrecount
                      ? 'accent'
                      : ''
                  } ${currentBeat === i + 1 && isPrecount && isPlaying ? 'precount' : ''}`}
                >
                  <span className="beat-number">{i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="live-controls">
            <div className="transport-controls">
              <button
                onClick={handlePrevSong}
                className="btn btn-secondary"
                disabled={currentSongIndex === 0}
                title="Brano precedente"
              >
                ⏮
              </button>
              <button onClick={handleStop} className="btn btn-secondary" title="Stop">
                ⏹
              </button>
              <button
                onClick={toggleMetronome}
                className={`btn btn-large ${isPlaying ? 'btn-danger' : 'btn-primary'}`}
              >
                {isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>
              <button
                onClick={handleNextSong}
                className="btn btn-secondary"
                disabled={currentSongIndex === currentSetlist.songs.length - 1}
                title="Brano successivo"
              >
                ⏭
              </button>
            </div>

            <div className="live-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={precountEnabled}
                  onChange={(e) => setPrecountEnabled(e.target.checked)}
                  disabled={isPlaying}
                />
                <span>Precount (2 battute)</span>
              </label>
            </div>

            {currentSong.sections && currentSong.sections.length > 0 && (
              <div className="progress-container">
                <div className="progress-info">
                  <span>{isPrecount ? 'PRE' : `Battuta: ${currentBar + 1}`}</span>
                  <span>/ {totalBars}</span>
                </div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${isPrecount ? 0 : smoothProgress}%`,
                    }}
                  />
                  <input
                    type="range"
                    className="progress-slider"
                    min="0"
                    max="100"
                    step="0.1"
                    value={isPrecount ? 0 : smoothProgress}
                    onChange={handleProgressChange}
                    disabled={isPlaying}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sections */}
          {currentSong.sections && currentSong.sections.length > 0 && (
            <div className="live-sections">
              {currentSong.sections.map((section, index) => {
                const isActive = index === currentSectionIndex && !isPrecount;
                const barsCompleted =
                  isActive && sectionInfo ? sectionInfo.currentBarInSection : 0;

                return (
                  <div
                    key={index}
                    className={`section-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleJumpToSection(index)}
                    style={{
                      pointerEvents: isPlaying ? 'none' : 'auto',
                      opacity: isPlaying ? 0.9 : 1,
                    }}
                  >
                    <div className="section-name">{section.name || `Sezione ${index + 1}`}</div>
                    <div className="section-bars">{section.bars} battute</div>
                    <div className="section-progress">
                      {isActive ? `${barsCompleted}/${section.bars}` : `0/${section.bars}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}