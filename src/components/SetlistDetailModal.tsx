import { useState, useMemo } from 'react';
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

type SortOption = 'name' | 'artist' | 'bpm' | 'recent';

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

  // Selezione multipla
  const [selectedSongIds, setSelectedSongIds] = useState<string[]>([]);
  const [isAddingSongs, setIsAddingSongs] = useState(false);

  // Filtri
  const [searchQuery, setSearchQuery] = useState('');
  const [filterArtist, setFilterArtist] = useState('');
  const [filterTimeSignature, setFilterTimeSignature] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const songsInSetlist = localSongIds
    .map((id) => songs.find((s) => s.id === id))
    .filter((s): s is Song => s !== undefined);

  const availableSongs = songs.filter((song) => !localSongIds.includes(song.id));

  // Estrai artisti unici dai brani disponibili
  const uniqueArtists = useMemo(() => {
    const artists = availableSongs
      .map(song => song.artist)
      .filter((artist): artist is string => !!artist && artist.trim() !== '');
    return [...new Set(artists)].sort();
  }, [availableSongs]);

  // Estrai time signatures uniche
  const uniqueTimeSignatures = useMemo(() => {
    const signatures = availableSongs.map(song => song.timeSignature);
    return [...new Set(signatures)].sort((a, b) => a - b);
  }, [availableSongs]);

  // Filtra e ordina i brani disponibili
  const filteredAvailableSongs = useMemo(() => {
    let result = [...availableSongs];

    // Filtro per ricerca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(song =>
        song.name.toLowerCase().includes(query) ||
        (song.artist && song.artist.toLowerCase().includes(query)) ||
        (song.description && song.description.toLowerCase().includes(query))
      );
    }

    // Filtro per artista
    if (filterArtist) {
      result = result.filter(song => song.artist === filterArtist);
    }

    // Filtro per time signature
    if (filterTimeSignature !== '') {
      result = result.filter(song => song.timeSignature === filterTimeSignature);
    }

    // Ordinamento
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'it');
          break;
        case 'artist':
          const artistA = a.artist || '';
          const artistB = b.artist || '';
          comparison = artistA.localeCompare(artistB, 'it');
          if (comparison === 0) {
            comparison = a.name.localeCompare(b.name, 'it');
          }
          break;
        case 'bpm':
          comparison = a.bpm - b.bpm;
          break;
        case 'recent':
          comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [availableSongs, searchQuery, filterArtist, filterTimeSignature, sortBy, sortDirection]);

  // Verifica se l'ordine è cambiato
  const hasOrderChanged = JSON.stringify(localSongIds) !== JSON.stringify(setlist.songs);

  const clearFilters = () => {
    setSearchQuery('');
    setFilterArtist('');
    setFilterTimeSignature('');
    setSortBy('name');
    setSortDirection('asc');
  };

  const hasActiveFilters = searchQuery || filterArtist || filterTimeSignature !== '';

  // Toggle selezione brano
  const toggleSongSelection = (songId: string) => {
    setSelectedSongIds(prev =>
      prev.includes(songId)
        ? prev.filter(id => id !== songId)
        : [...prev, songId]
    );
  };

  // Seleziona tutti i brani filtrati
  const selectAllFiltered = () => {
    const filteredIds = filteredAvailableSongs.map(s => s.id);
    setSelectedSongIds(prev => {
      const newSelection = [...prev];
      filteredIds.forEach(id => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      return newSelection;
    });
  };

  // Deseleziona tutti
  const deselectAll = () => {
    setSelectedSongIds([]);
  };

  // Aggiungi brani selezionati
  const handleAddSelectedSongs = async () => {
    if (selectedSongIds.length === 0) return;

    setIsAddingSongs(true);
    try {
      let updatedSetlist = setlist;
      
      // Aggiungi i brani uno alla volta
      for (const songId of selectedSongIds) {
        updatedSetlist = await apiClient.addSongToSetlist(setlist.id, songId);
      }

      setLocalSongIds(updatedSetlist.songs);
      onUpdate(updatedSetlist);
      setSelectedSongIds([]);
      setShowAddSong(false);
      clearFilters();
    } catch (error) {
      console.error('Error adding songs:', error);
      alert('Errore nell\'aggiungere i brani');
    } finally {
      setIsAddingSongs(false);
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
      setLocalSongIds(setlist.songs);
    } finally {
      setIsSaving(false);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('dragging');
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    const newSongIds = [...localSongIds];
    const [draggedItem] = newSongIds.splice(draggedIndex, 1);
    newSongIds.splice(dropIndex, 0, draggedItem);

    setLocalSongIds(newSongIds);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const moveSong = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localSongIds.length) return;

    const newSongIds = [...localSongIds];
    [newSongIds[index], newSongIds[newIndex]] = [newSongIds[newIndex], newSongIds[index]];
    setLocalSongIds(newSongIds);
  };

  const getTotalBars = (song: Song) => {
    return song.sections?.reduce((sum, s) => sum + s.bars, 0) || 0;
  };

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
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
                onClick={() => {
                  setShowAddSong(!showAddSong);
                  if (!showAddSong) {
                    setSelectedSongIds([]);
                    clearFilters();
                  }
                }}
                className="btn btn-secondary"
              >
                {showAddSong ? '✕ Chiudi' : '+ Aggiungi Brani'}
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
              <div className="add-song-header">
                <h3>Seleziona Brani da Aggiungere</h3>
                {selectedSongIds.length > 0 && (
                  <span className="selection-count">
                    {selectedSongIds.length} {selectedSongIds.length === 1 ? 'selezionato' : 'selezionati'}
                  </span>
                )}
              </div>

              {/* Filtri */}
              {availableSongs.length > 0 && (
                <div className="add-song-filters">
                  {/* Ricerca */}
                  <div className="filter-search">
                    <span className="search-icon">🔍</span>
                    <input
                      type="text"
                      placeholder="Cerca brani..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="clear-search">
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="filter-row-inline">
                    {/* Filtro Artista */}
                    <select
                      value={filterArtist}
                      onChange={(e) => setFilterArtist(e.target.value)}
                      className="filter-select"
                    >
                      <option value="">Tutti gli artisti</option>
                      {uniqueArtists.map(artist => (
                        <option key={artist} value={artist}>{artist}</option>
                      ))}
                    </select>

                    {/* Filtro Time Signature */}
                    <select
                      value={filterTimeSignature}
                      onChange={(e) => setFilterTimeSignature(e.target.value ? Number(e.target.value) : '')}
                      className="filter-select"
                    >
                      <option value="">Tutti i tempi</option>
                      {uniqueTimeSignatures.map(ts => (
                        <option key={ts} value={ts}>{ts}/4</option>
                      ))}
                    </select>

                    {/* Ordinamento */}
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortOption)}
                      className="filter-select"
                    >
                      <option value="name">Nome</option>
                      <option value="artist">Artista</option>
                      <option value="bpm">BPM</option>
                      <option value="recent">Recenti</option>
                    </select>

                    <button
                      onClick={toggleSortDirection}
                      className="sort-btn"
                      title={sortDirection === 'asc' ? 'Crescente' : 'Decrescente'}
                    >
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </button>

                    {hasActiveFilters && (
                      <button onClick={clearFilters} className="clear-filters-btn">
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              )}

              {availableSongs.length === 0 ? (
                <p className="empty-message">Tutti i brani sono già nella setlist</p>
              ) : filteredAvailableSongs.length === 0 ? (
                <div className="empty-message">
                  <p>Nessun brano trovato con i filtri selezionati</p>
                  <button onClick={clearFilters} className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }}>
                    Reset filtri
                  </button>
                </div>
              ) : (
                <>
                  {/* Azioni di selezione */}
                  <div className="selection-actions">
                    <button onClick={selectAllFiltered} className="btn btn-secondary btn-sm">
                      Seleziona tutti ({filteredAvailableSongs.length})
                    </button>
                    {selectedSongIds.length > 0 && (
                      <button onClick={deselectAll} className="btn btn-secondary btn-sm">
                        Deseleziona tutti
                      </button>
                    )}
                    <span className="filter-results">
                      {filteredAvailableSongs.length} {filteredAvailableSongs.length === 1 ? 'brano' : 'brani'}
                    </span>
                  </div>

                  {/* Lista brani */}
                  <div className="available-songs-list">
                    {filteredAvailableSongs.map((song) => {
                      const isSelected = selectedSongIds.includes(song.id);

                      return (
                        <div
                          key={song.id}
                          className={`available-song-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleSongSelection(song.id)}
                        >
                          <div className="song-checkbox">
                            {isSelected ? '✓' : ''}
                          </div>
                          <div className="song-details">
                            <h4>{song.name}</h4>
                            {song.artist && (
                              <span className="song-artist">🎤 {song.artist}</span>
                            )}
                            <div className="song-meta">
                              <span>⏱️ {song.bpm} BPM</span>
                              <span>🎵 {song.timeSignature}/4</span>
                              {song.sections && song.sections.length > 0 && (
                                <span>📝 {song.sections.length} sez.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pulsante conferma */}
                  <div className="add-songs-footer">
                    <button
                      onClick={handleAddSelectedSongs}
                      className="btn btn-primary"
                      disabled={selectedSongIds.length === 0 || isAddingSongs}
                    >
                      {isAddingSongs
                        ? 'Aggiunta in corso...'
                        : `Aggiungi ${selectedSongIds.length} ${selectedSongIds.length === 1 ? 'brano' : 'brani'}`
                      }
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Songs in Setlist */}
          <div className="setlist-songs">
            <h3>
              Brani nella Setlist ({songsInSetlist.length})
              {songsInSetlist.length > 1 && (
                <span className="drag-hint">Trascina per riordinare</span>
              )}
            </h3>
            {songsInSetlist.length === 0 ? (
              <div className="empty-state">
                <p>Nessun brano in questa setlist</p>
                <button
                  onClick={() => setShowAddSong(true)}
                  className="btn btn-primary"
                  style={{ marginTop: '1rem' }}
                >
                  + Aggiungi Brani
                </button>
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
                      onDrop={(e) => handleDrop(e, index)}
                    >
                      <div className="drag-handle" title="Trascina per riordinare">
                        ⠿
                      </div>
                      <span className="song-number">{index + 1}</span>
                      <div className="song-content">
                        <h4>{song.name}</h4>
                        {song.artist && (
                          <span className="song-artist-small">🎤 {song.artist}</span>
                        )}
                        <div className="song-meta">
                          <span>⏱️ {song.bpm} BPM</span>
                          <span>🎵 {song.timeSignature}/4</span>
                          {song.sections && song.sections.length > 0 && (
                            <span>
                              📝 {song.sections.length} sez. ({totalBars} batt.)
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