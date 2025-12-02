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

  const intervalRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Refs per evitare stale closures
  const isPrecountRef = useRef(false);
  const precountBarsRef = useRef(0);
  const currentBarRef = useRef(0);

  const currentSong = currentSetlist
    ? songs.find((s) => s.id === currentSetlist.songs[currentSongIndex])
    : null;

  const totalBars = currentSong?.sections?.reduce((sum, s) => sum + s.bars, 0) || 0;

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
  }, []);

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
              setIsPlaying(false);
              setCurrentBar(0);
              currentBarRef.current = 0;
              setCurrentSectionIndex(0);
              setCurrentBeat(1);
              beatCounter = 1;
            }
          }
        }
      }
    }, interval);
  }, [currentSong, precountEnabled, playClick, totalBars]);

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
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const completedBars = parseInt(e.target.value);
    if (!currentSong?.sections) return;

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
                      width: `${totalBars > 0 ? (currentBar / totalBars) * 100 : 0}%`,
                    }}
                  />
                  <input
                    type="range"
                    className="progress-slider"
                    min="0"
                    max={totalBars}
                    value={isPrecount ? 0 : currentBar}
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