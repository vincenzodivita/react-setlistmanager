import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { apiClient } from '@/services/api';
import type { Setlist, Song } from '@/types';
import './SetlistDetailModal.css';

interface SetlistDetailModalProps {
  setlist: Setlist;
  onClose: () => void;
  onUpdate: (setlist: Setlist) => void;
  onPlay: () => void;
}

export default function SetlistDetailModal({
  setlist,
  onClose,
  onUpdate,
  onPlay,
}: SetlistDetailModalProps) {
  const { songs } = useAppStore();
  const [showAddSong, setShowAddSong] = useState(false);

  const songsInSetlist = setlist.songs
    .map((id) => songs.find((s) => s.id === id))
    .filter((s): s is Song => s !== undefined);

  const availableSongs = songs.filter((song) => !setlist.songs.includes(song.id));

  const handleAddSong = async (songId: string) => {
    try {
      const updated = await apiClient.addSongToSetlist(setlist.id, songId);
      onUpdate(updated);
      setShowAddSong(false);
    } catch (error) {
      console.error('Error adding song:', error);
      alert('Errore nell\'aggiungere il brano');
    }
  };

  const handleRemoveSong = async (songId: string) => {
    if (!confirm('Rimuovere questo brano dalla setlist?')) return;

    try {
      const updated = await apiClient.removeSongFromSetlist(setlist.id, songId);
      onUpdate(updated);
    } catch (error) {
      console.error('Error removing song:', error);
      alert('Errore nel rimuovere il brano');
    }
  };

  const getTotalBars = (song: Song) => {
    return song.sections?.reduce((sum, s) => sum + s.bars, 0) || 0;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{setlist.name}</h2>
            {setlist.description && (
              <p className="modal-subtitle">{setlist.description}</p>
            )}
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="setlist-detail-header">
            <button
              onClick={() => setShowAddSong(!showAddSong)}
              className="btn btn-secondary"
            >
              {showAddSong ? '✕ Chiudi' : '+ Aggiungi Brano'}
            </button>
            {songsInSetlist.length > 0 && (
              <button onClick={onPlay} className="btn btn-primary">
                ▶ Avvia Setlist
              </button>
            )}
          </div>

          {/* Add Song Panel */}
          {showAddSong && (
            <div className="add-song-panel">
              <h3>Brani Disponibili</h3>
              {availableSongs.length === 0 ? (
                <p className="empty-message">Tutti i brani sono già nella setlist</p>
              ) : (
                <div className="available-songs-list">
                  {availableSongs.map((song) => (
                    <div
                      key={song.id}
                      className="available-song-item"
                      onClick={() => handleAddSong(song.id)}
                    >
                      <div>
                        <h4>{song.name}</h4>
                        <div className="song-meta">
                          <span>⏱️ {song.bpm} BPM</span>
                          <span>🎵 {song.timeSignature}/4</span>
                          {song.sections && song.sections.length > 0 && (
                            <span>📝 {song.sections.length} sezioni</span>
                          )}
                        </div>
                      </div>
                      <button className="btn btn-sm btn-primary">
                        Aggiungi
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Songs in Setlist */}
          <div className="setlist-songs">
            <h3>Brani ({songsInSetlist.length})</h3>
            {songsInSetlist.length === 0 ? (
              <div className="empty-state">
                <p>Nessun brano in questa setlist</p>
              </div>
            ) : (
              <div className="setlist-songs-list">
                {songsInSetlist.map((song, index) => {
                  const totalBars = getTotalBars(song);
                  return (
                    <div key={song.id} className="setlist-song-item">
                      <span className="song-number">{index + 1}</span>
                      <div className="song-content">
                        <h4>{song.name}</h4>
                        <div className="song-meta">
                          <span>⏱️ {song.bpm} BPM</span>
                          <span>🎵 {song.timeSignature}/4</span>
                          {song.sections && song.sections.length > 0 && (
                            <span>
                              📝 {song.sections.length} sezioni ({totalBars} batt.)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="song-actions">
                        <button
                          onClick={() => handleRemoveSong(song.id)}
                          className="icon-btn"
                          title="Rimuovi"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}