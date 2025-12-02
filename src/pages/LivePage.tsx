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
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Progress fluido
  const [smoothProgress, setSmoothProgress] = useState(0);

  const intervalRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedProgressRef = useRef<number>(0);
  const sectionsContainerRef = useRef<HTMLDivElement>(null);
  const trackListRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Refs per evitare stale closures
  const isPrecountRef = useRef(false);
  const precountBarsRef = useRef(0);
  const currentBarRef = useRef(0);
  const isPlayingRef = useRef(false);
  const currentSongIndexRef = useRef(0);
  const currentSectionIndexRef = useRef(0);

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
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    currentSongIndexRef.current = currentSongIndex;
  }, [currentSongIndex]);

  useEffect(() => {
    currentSectionIndexRef.current = currentSectionIndex;
  }, [currentSectionIndex]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Scroll automatico alla sezione attiva
  useEffect(() => {
    if (sectionsContainerRef.current && currentSong?.sections) {
      const container = sectionsContainerRef.current;
      const activeSection = container.querySelector('.section-card.active') as HTMLElement;
      
      if (activeSection) {
        const containerRect = container.getBoundingClientRect();
        const sectionRect = activeSection.getBoundingClientRect();
        
        const scrollLeft = activeSection.offsetLeft - (containerRect.width / 2) + (sectionRect.width / 2);
        
        container.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        });
      }
    }
  }, [currentSectionIndex, currentSong?.sections]);

  // Scroll automatico al brano attivo nella sidebar
  useEffect(() => {
    if (trackListRef.current) {
      const container = trackListRef.current;
      const activeTrack = container.querySelector('.live-track-item.active') as HTMLElement;
      
      if (activeTrack) {
        const containerRect = container.getBoundingClientRect();
        const trackRect = activeTrack.getBoundingClientRect();
        
        // Scroll verticale per desktop, orizzontale per mobile
        const isHorizontal = window.innerWidth <= 768;
        
        if (isHorizontal) {
          const scrollLeft = activeTrack.offsetLeft - (containerRect.width / 2) + (trackRect.width / 2);
          container.scrollTo({
            left: scrollLeft,
            behavior: 'smooth'
          });
        } else {
          const scrollTop = activeTrack.offsetTop - (containerRect.height / 2) + (trackRect.height / 2);
          container.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
          });
        }
      }
    }
  }, [currentSongIndex]);

  // Gestione fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Toggle precount
  const togglePrecount = useCallback(() => {
    if (!isPlayingRef.current) {
      setPrecountEnabled(prev => !prev);
    }
  }, []);

  // Effetto per gestire la classe sul body
  useEffect(() => {
    if (isFullscreen) {
      document.body.classList.add('live-fullscreen-mode');
    } else {
      document.body.classList.remove('live-fullscreen-mode');
    }
    
    return () => {
      document.body.classList.remove('live-fullscreen-mode');
    };
  }, [isFullscreen]);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
  };

  // Funzioni di navigazione sezione
  const goToPrevSection = useCallback(() => {
    if (!currentSong?.sections || isPlayingRef.current) return;
    
    const newIndex = Math.max(0, currentSectionIndexRef.current - 1);
    if (newIndex !== currentSectionIndexRef.current) {
      let targetBar = 0;
      for (let i = 0; i < newIndex; i++) {
        targetBar += currentSong.sections[i].bars;
      }
      setCurrentBar(targetBar);
      currentBarRef.current = targetBar;
      setCurrentSectionIndex(newIndex);
      setCurrentBeat(1);
      
      const newProgress = totalBars > 0 ? (targetBar / totalBars) * 100 : 0;
      setSmoothProgress(newProgress);
      pausedProgressRef.current = newProgress;
    }
  }, [currentSong, totalBars]);

  const goToNextSection = useCallback(() => {
    if (!currentSong?.sections || isPlayingRef.current) return;
    
    const maxIndex = currentSong.sections.length - 1;
    const newIndex = Math.min(maxIndex, currentSectionIndexRef.current + 1);
    if (newIndex !== currentSectionIndexRef.current) {
      let targetBar = 0;
      for (let i = 0; i < newIndex; i++) {
        targetBar += currentSong.sections[i].bars;
      }
      setCurrentBar(targetBar);
      currentBarRef.current = targetBar;
      setCurrentSectionIndex(newIndex);
      setCurrentBeat(1);
      
      const newProgress = totalBars > 0 ? (targetBar / totalBars) * 100 : 0;
      setSmoothProgress(newProgress);
      pausedProgressRef.current = newProgress;
    }
  }, [currentSong, totalBars]);

  const playClick = useCallback((isAccent: boolean, isPrecount: boolean = false) => {
    if (!audioContextRef.current) return;

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    if (isPrecount) {
      oscillator.frequency.value = 1000;
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
    pausedProgressRef.current = smoothProgress;
  }, [smoothProgress]);

  const startMetronome = useCallback(() => {
    if (!currentSong) return;

    initAudioContext();

    const bpm = currentSong.bpm;
    const timeSignature = currentSong.timeSignature;
    const interval = (60 / bpm) * 1000;

    setIsPlaying(true);
    setCurrentBeat(1);

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

    playClick(true, precountEnabled);

    let beatCounter = 1;

    const msPerBeat = interval;
    const beatsPerBar = timeSignature;
    const currentProgressMs = currentBarRef.current * beatsPerBar * msPerBeat;
    startTimeRef.current = performance.now() - currentProgressMs;

    const updateSmoothProgress = () => {
      if (!isPrecountRef.current && totalDurationMs > 0) {
        const elapsed = performance.now() - startTimeRef.current;
        const progress = Math.min((elapsed / totalDurationMs) * 100, 100);
        setSmoothProgress(progress);
      }
      animationFrameRef.current = requestAnimationFrame(updateSmoothProgress);
    };

    if (!precountEnabled) {
      animationFrameRef.current = requestAnimationFrame(updateSmoothProgress);
    }

    intervalRef.current = window.setInterval(() => {
      beatCounter = beatCounter >= timeSignature ? 1 : beatCounter + 1;
      setCurrentBeat(beatCounter);

      const isFirstBeatOfBar = beatCounter === 1;

      if (isPrecountRef.current) {
        playClick(isFirstBeatOfBar, true);

        if (isFirstBeatOfBar) {
          const newPrecountBars = precountBarsRef.current - 1;
          precountBarsRef.current = newPrecountBars;
          setPrecountBarsRemaining(newPrecountBars);

          if (newPrecountBars <= 0) {
            isPrecountRef.current = false;
            setIsPrecount(false);
            startTimeRef.current = performance.now();
            animationFrameRef.current = requestAnimationFrame(updateSmoothProgress);
          }
        }
      } else {
        playClick(isFirstBeatOfBar, false);

        if (isFirstBeatOfBar) {
          const newBar = currentBarRef.current + 1;
          currentBarRef.current = newBar;
          setCurrentBar(newBar);

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

  // Gestione tastiera - dopo le definizioni di handleStop, stopMetronome, startMetronome
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignora se siamo in un input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'Escape':
          if (isFullscreen) {
            setIsFullscreen(false);
          }
          break;
        case 'Enter':
          e.preventDefault();
          toggleFullscreen();
          break;
        case ' ':
          e.preventDefault();
          if (isPlayingRef.current) {
            stopMetronome();
          } else {
            startMetronome();
          }
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          togglePrecount();
          break;
        case 'ArrowUp':
          e.preventDefault();
          // Brano precedente
          if (currentSetlist && currentSongIndexRef.current > 0) {
            handleStop();
            setCurrentSongIndex(currentSongIndexRef.current - 1);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          // Brano successivo
          if (currentSetlist && currentSongIndexRef.current < currentSetlist.songs.length - 1) {
            handleStop();
            setCurrentSongIndex(currentSongIndexRef.current + 1);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevSection();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNextSection();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, currentSetlist, toggleFullscreen, togglePrecount, goToPrevSection, goToNextSection, stopMetronome, startMetronome, handleStop]);

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
    
    const newProgress = totalBars > 0 ? (targetBar / totalBars) * 100 : 0;
    setSmoothProgress(newProgress);
    pausedProgressRef.current = newProgress;
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newProgress = parseFloat(e.target.value);
    if (!currentSong?.sections || totalDurationMs === 0) return;

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

  // Calcola info sezione corrente
  const getSectionProgress = (sectionIndex: number) => {
    if (!currentSong?.sections) return { current: 0, total: 0, percentage: 0 };
    
    const section = currentSong.sections[sectionIndex];
    if (!section) return { current: 0, total: 0, percentage: 0 };

    let barsBeforeSection = 0;
    for (let i = 0; i < sectionIndex; i++) {
      barsBeforeSection += currentSong.sections[i].bars;
    }

    const barsIntoSection = Math.max(0, currentBar - barsBeforeSection);
    const currentBarInSection = Math.min(barsIntoSection + 1, section.bars);
    const percentage = (barsIntoSection / section.bars) * 100;

    return {
      current: currentBarInSection,
      total: section.bars,
      percentage: Math.min(percentage, 100)
    };
  };

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
    <div 
      ref={containerRef}
      className={`live-page ${isFullscreen ? 'fullscreen' : ''}`}
    >
      {/* Fullscreen Toggle */}
      <button 
        className="fullscreen-toggle"
        onClick={toggleFullscreen}
        title={isFullscreen ? 'Esci da fullscreen (ESC)' : 'Attiva fullscreen'}
      >
        {isFullscreen ? '✕' : '⛶'}
      </button>

      <div className="live-layout">
        {/* Sidebar - nascosta in fullscreen su mobile */}
        <aside className={`live-sidebar ${isFullscreen ? 'hidden-mobile' : ''}`}>
          <div className="sidebar-header">
            <h3>{currentSetlist.name}</h3>
            <span className="sidebar-progress">
              {currentSongIndex + 1}/{currentSetlist.songs.length}
            </span>
          </div>
          <div ref={trackListRef} className="live-track-list">
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

        {/* Main Content */}
        <main className="live-main">
          {/* Header compatto */}
          <div className="live-header">
            <div className="song-title">
              <h2>{currentSong.name}</h2>
              {currentSong.artist && <span className="song-artist">{currentSong.artist}</span>}
            </div>
            <div className="song-meta">
              <span className="meta-item bpm">{currentSong.bpm} BPM</span>
              <span className="meta-item time">{currentSong.timeSignature}/4</span>
            </div>
          </div>

          {/* Metronome Display */}
          <div className="metronome-section">
            {isPrecount && (
              <div className="precount-banner">
                PRECOUNT: {precountBarsRemaining}
              </div>
            )}
            
            <div className="beat-display">
              {Array.from({ length: currentSong.timeSignature }, (_, i) => (
                <div
                  key={i}
                  className={`beat-dot ${
                    currentBeat === i + 1 && isPlaying ? 'active' : ''
                  } ${
                    currentBeat === i + 1 && i === 0 && isPlaying && !isPrecount ? 'accent' : ''
                  } ${
                    currentBeat === i + 1 && isPrecount && isPlaying ? 'precount' : ''
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Bar counter grande */}
            <div className="bar-counter">
              <span className="bar-current">{isPrecount ? 'PRE' : currentBar + 1}</span>
              <span className="bar-separator">/</span>
              <span className="bar-total">{totalBars}</span>
            </div>
          </div>

          {/* Sections - Scroll orizzontale */}
          {currentSong.sections && currentSong.sections.length > 0 && (
            <div className="sections-wrapper">
              <div 
                ref={sectionsContainerRef}
                className="sections-scroll"
              >
                {currentSong.sections.map((section, index) => {
                  const isActive = index === currentSectionIndex && !isPrecount;
                  const isPast = index < currentSectionIndex && !isPrecount;
                  const progress = getSectionProgress(index);

                  return (
                    <div
                      key={index}
                      className={`section-card ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}
                      onClick={() => !isPlaying && handleJumpToSection(index)}
                    >
                      <div className="section-header">
                        <span className="section-number">{index + 1}</span>
                        <span className="section-name">{section.name || `Sezione ${index + 1}`}</span>
                      </div>
                      
                      <div className="section-bars-display">
                        <span className="bars-current">
                          {isActive ? progress.current : isPast ? section.bars : 0}
                        </span>
                        <span className="bars-separator">/</span>
                        <span className="bars-total">{section.bars}</span>
                      </div>

                      {/* Progress bar della sezione */}
                      <div className="section-progress-bar">
                        <div 
                          className="section-progress-fill"
                          style={{ 
                            width: `${isActive ? progress.percentage : isPast ? 100 : 0}%` 
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="live-controls">
            {/* Progress bar con info battute */}
            {currentSong.sections && currentSong.sections.length > 0 && (
              <div className="progress-section">
                <div className="progress-info">
                  <span className="progress-label">
                    {isPrecount ? 'PRECOUNT' : `Battuta ${currentBar + 1}`}
                  </span>
                  <span className="progress-total">/ {totalBars}</span>
                </div>
                <div className="progress-bar-wrapper">
                  <div className="progress-bar-track">
                    <div 
                      className="progress-bar-fill"
                      style={{ width: `${isPrecount ? 0 : smoothProgress}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    className="progress-bar-input"
                    min="0"
                    max="100"
                    step="0.1"
                    value={isPrecount ? 0 : smoothProgress}
                    onChange={handleProgressChange}
                    disabled={isPlaying}
                  />
                </div>
                <span className="progress-percentage">
                  {isPrecount ? '0' : Math.round(smoothProgress)}%
                </span>
              </div>
            )}

            <div className="transport-row">
              <button
                onClick={handlePrevSong}
                className="transport-btn"
                disabled={currentSongIndex === 0}
                title="Brano precedente (↑)"
              >
                ⏮
              </button>
              
              <button 
                onClick={handleStop} 
                className="transport-btn"
                title="Stop"
              >
                ⏹
              </button>
              
              <button
                onClick={toggleMetronome}
                className={`play-btn ${isPlaying ? 'playing' : ''}`}
                title="Play/Pausa (Spazio)"
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              
              <button
                onClick={handleNextSong}
                className="transport-btn"
                disabled={currentSongIndex === currentSetlist.songs.length - 1}
                title="Brano successivo (↓)"
              >
                ⏭
              </button>

              {/* Precount toggle button */}
              <button
                onClick={togglePrecount}
                className={`precount-btn ${precountEnabled ? 'active' : ''}`}
                disabled={isPlaying}
                title={`Precount ${precountEnabled ? 'attivo' : 'disattivo'} (P)`}
              >
                🚩
              </button>
            </div>

            {/* Keyboard shortcuts hint */}
            <div className="shortcuts-hint">
              <span>Spazio: Play/Pausa</span>
              <span>Enter: Fullscreen</span>
              <span>P: Precount</span>
              <span>↑↓: Brani</span>
              <span>←→: Sezioni</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}