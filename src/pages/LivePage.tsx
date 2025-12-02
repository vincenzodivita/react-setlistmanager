import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import type { Setlist, Song } from '@/types';
import './LivePage.css';

export default function LivePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { songs } = useAppStore();

  // State from navigation
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

  // Get current song
  const currentSong = currentSetlist
    ? songs.find((s) => s.id === currentSetlist.songs[currentSongIndex])
    : null;

  const totalBars = currentSong?.sections?.reduce((sum, s) => sum + s.bars, 0) || 0;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Initialize audio context
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  // Play click sound
  const playClick = (isAccent: boolean) => {
    if (!audioContextRef.current) return;

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    oscillator.frequency.value = isAccent ? 1200 : 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContextRef.current.currentTime + 0.1
    );

    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + 0.1);
  };

  // Update section progress
  const updateSectionProgress = (barNumber?: number) => {
    if (!currentSong?.sections) return;
    const bar = barNumber !== undefined ? barNumber : currentBar;
    let accumulatedBars = 0;

    for (let i = 0; i < currentSong.sections.length; i++) {
      if (bar < accumulatedBars + currentSong.sections[i].bars) {
        setCurrentSectionIndex(i);
        return;
      }
      accumulatedBars += currentSong.sections[i].bars;
    }

    // Loop back if finished
    if (bar >= totalBars) {
      setCurrentBar(-1); // Next tick will become 0
      setCurrentSectionIndex(0);
    } else {
      setCurrentSectionIndex(currentSong.sections.length - 1);
    }
  };

  // Start metronome
  const startMetronome = () => {
    if (!currentSong) return;

    initAudioContext();
    const bpm = currentSong.bpm;
    const timeSignature = currentSong.timeSignature;
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

    // First click
    playClick(!isPrecount);

    intervalRef.current = setInterval(() => {
      setCurrentBeat((prevBeat) => {
        const nextBeat = prevBeat >= timeSignature ? 1 : prevBeat + 1;
        const isNewBar = nextBeat === 1;

        if (isNewBar) {
          if (isPrecount) {
            setPrecountBars((prev) => {
              const newCount = prev - 1;
              if (newCount <= 0) {
                setIsPrecount(false);
              }
              return newCount;
            });
          } else {
            setCurrentBar((prev) => {
              const newBar = prev + 1;
              updateSectionProgress(newBar);
              return newBar;
            });
          }
        }

        playClick(!isPrecount && nextBeat === 1);
        return nextBeat;
      });
    }, interval);
  };

  // Stop metronome
  const stopMetronome = () => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Toggle metronome
  const toggleMetronome = () => {
    if (isPlaying) {
      stopMetronome();
    } else {
      startMetronome();
    }
  };

  // Stop and reset
  const handleStop = () => {
    stopMetronome();
    setCurrentBar(0);
    setCurrentSectionIndex(0);
    setCurrentBeat(1);
    setIsPrecount(false);
    setPrecountBars(0);
  };

  // Navigate songs
  const handlePrevSong = () => {
    if (currentSongIndex > 0) {
      stopMetronome();
      setCurrentSongIndex(currentSongIndex - 1);
      handleStop();
    }
  };

  const handleNextSong = () => {
    if (currentSetlist && currentSongIndex < currentSetlist.songs.length - 1) {
      stopMetronome();
      setCurrentSongIndex(currentSongIndex + 1);
      handleStop();
    }
  };

  const handleSelectSong = (index: number) => {
    if (isPlaying) stopMetronome();
    setCurrentSongIndex(index);
    handleStop();
  };

  const handleJumpToSection = (sectionIndex: number) => {
    if (isPlaying) return;
    if (!currentSong?.sections) return;

    let targetBar = 0;
    for (let i = 0; i < sectionIndex; i++) {
      targetBar += currentSong.sections[i].bars;
    }

    setCurrentBar(targetBar);
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
    setCurrentSectionIndex(targetSection);
    setCurrentBeat(1);
  };

  // Section info
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

  // Empty states
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
    <div className="live-page">
      <div className="live-container">
        {/* Sidebar with setlist */}
        <div className="live-sidebar">
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
        </div>

        {/* Main live area */}
        <div className="live-main">
          <div className="live-header">
            <h2>{currentSong.name}</h2>
            <div className="live-song-info">
              <span className="info-badge">⏱️ {currentSong.bpm} BPM</span>
              <span className="info-badge">🎵 {currentSong.timeSignature}/4</span>
              {currentSong.sections && currentSong.sections.length > 0 && (
                <span className="info-badge">
                  📝 {currentSong.sections.length} sezioni
                </span>
              )}
            </div>
          </div>

          {/* Metronome beats */}
          <div className="metronome-display">
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
                  } ${currentBeat === i + 1 && isPrecount ? 'precount' : ''}`}
                >
                  <span className="beat-number">{i + 1}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Transport controls */}
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
              <button
                onClick={handleStop}
                className="btn btn-secondary"
                title="Stop"
              >
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

            {/* Progress bar */}
            {currentSong.sections && currentSong.sections.length > 0 && (
              <div className="progress-container">
                <div className="progress-info">
                  <span>
                    {isPrecount
                      ? 'PRE'
                      : `Battuta: ${currentBar + 1}`}
                  </span>
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
                    <div className="section-name">{section.name}</div>
                    <div className="section-bars">{section.bars} battute</div>
                    <div className="section-progress">
                      {isActive ? `${barsCompleted}/${section.bars}` : `0/${section.bars}`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}