import { useState, useRef } from 'react';
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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [localSongIds, setLocalSongIds] = useState<string[]>(setlist.songs);
  const [isSaving, setIsSaving] = useState(false);
  
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const songsInSetlist = localSongIds
    .map((id) => songs.find((s) => s.id === id))
    .filter((s): s is Song => s !== undefined);

  const availableSongs = songs.filter((song) => !localSongIds.includes(song.id));

  // Verifica se l'ordine è cambiato
  const hasOrderChanged = JSON.stringify(localSongIds) !== JSON.stringify(setlist.songs);

  const handleAddSong = async (songId: string) => {
    try {
      const updated = await apiClient.addSongToSetlist(setlist.id, songId);
      setLocalSongIds(updated.songs);
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
      setLocalSongIds(updated.songs);
      onUpdate(updated);
    } catch (error) {
      console.error('Error removing song:', error);
      alert('Errore nel rimuovere il brano');
    }
  };

  const handleSaveOrder = async () => {
    if (!hasOrderChanged) return;
    
    setIsSaving(true);
    try {
      const updated = await apiClient.reorderSetlist(setlist.id, localSongIds);
      onUpdate(updated);
    } catch (error) {
      console.error('Error reordering setlist:', error);
      alert('Errore nel salvare l\'ordine');
      // Ripristina l'ordine originale
      setLocalSongIds(setlist.songs);
    } finally {
      setIsSaving(false);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    dragNodeRef.current = e.currentTarget;
    
    // Aggiungi classe per lo stile durante il drag
    e.currentTarget.classList.add('dragging');
    
    // Imposta l'effetto del drag
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('dragging');
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragNodeRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex === null || draggedIndex === index) return;
    
    setDragOverIndex(index);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Solo se stiamo lasciando l'elemento, non un suo figlio
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    // Riordina l'array
    const newSongIds = [...localSongIds];
    const [draggedItem] = newSongIds.splice(draggedIndex, 1);
    newSongIds.splice(dropIndex, 0, draggedItem);
    
    setLocalSongIds(newSongIds);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Touch handlers per mobile
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchedIndex, setTouchedIndex] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, index: number) => {
    setTouchStartY(e.touches[0].clientY);
    setTouchedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartY === null || touchedIndex === null) return;
    
    const touchY = e.touches[0].clientY;
    const elements = document.querySelectorAll('.setlist-song-item');
    
    elements.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      if (touchY >= rect.top && touchY <= rect.bottom && index !== touchedIndex) {
        setDragOverIndex(index);
      }
    });
  };

  const handleTouchEnd = () => {
    if (touchedIndex !== null && dragOverIndex !== null && touchedIndex !== dragOverIndex) {
      const newSongIds = [...localSongIds];
      const [draggedItem] = newSongIds.splice(touchedIndex, 1);
      newSongIds.splice(dragOverIndex, 0, draggedItem);
      setLocalSongIds(newSongIds);
    }
    
    setTouchStartY(null);
    setTouchedIndex(null);
    setDragOverIndex(null);
  };

  const getTotalBars = (song: Song) => {
    return song.sections?.reduce((sum, s) => sum + s.bars, 0) || 0;
  };

  // Sposta su/giù con bottoni (alternativa al drag)
  const moveSong = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localSongIds.length) return;
    
    const newSongIds = [...localSongIds];
    [newSongIds[index], newSongIds[newIndex]] = [newSongIds[newIndex], newSongIds[index]];
    setLocalSongIds(newSongIds);
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
            <div className="header-left">
              <button
                onClick={() => setShowAddSong(!showAddSong)}
                className="btn btn-secondary"
              >
                {showAddSong ? '✕ Chiudi' : '+ Aggiungi Brano'}
              </button>
              {hasOrderChanged && (
                <button
                  onClick={handleSaveOrder}
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  {isSaving ? '💾 Salvataggio...' : '💾 Salva Ordine'}
                </button>
              )}
            </div>
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
            <h3>
              Brani ({songsInSetlist.length})
              {songsInSetlist.length > 1 && (
                <span className="drag-hint">Trascina per riordinare</span>
              )}
            </h3>
            {songsInSetlist.length === 0 ? (
              <div className="empty-state">
                <p>Nessun brano in questa setlist</p>
              </div>
            ) : (
              <div className="setlist-songs-list">
                {songsInSetlist.map((song, index) => {
                  const totalBars = getTotalBars(song);
                  const isDragging = draggedIndex === index;
                  const isDragOver = dragOverIndex === index;
                  
                  return (
                    <div
                      key={song.id}
                      className={`setlist-song-item ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnter={(e) => handleDragEnter(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onTouchStart={(e) => handleTouchStart(e, index)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <div className="drag-handle" title="Trascina per riordinare">
                        ⠿
                      </div>
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
                          onClick={() => moveSong(index, 'up')}
                          className="icon-btn"
                          title="Sposta su"
                          disabled={index === 0}
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveSong(index, 'down')}
                          className="icon-btn"
                          title="Sposta giù"
                          disabled={index === songsInSetlist.length - 1}
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => handleRemoveSong(song.id)}
                          className="icon-btn icon-btn-danger"
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