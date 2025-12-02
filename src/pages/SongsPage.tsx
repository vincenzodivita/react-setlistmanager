import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/appStore';
import { apiClient } from '@/services/api';
import type { Song, CreateSongDto, UpdateSongDto } from '@/types';
import SongCard from '@/components/SongCard';
import SongModal from '@/components/SongModal';
import ShareModal from '@/components/ShareModal';
import './SongsPage.css';

type SortOption = 'name' | 'artist' | 'bpm' | 'recent';
type ViewMode = 'grid' | 'list';

export default function SongsPage() {
  const { songs, setSongs, user } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [sharingSong, setSharingSong] = useState<Song | null>(null);

  // Filtri
  const [searchQuery, setSearchQuery] = useState('');
  const [filterArtist, setFilterArtist] = useState('');
  const [filterTimeSignature, setFilterTimeSignature] = useState<number | ''>('');
  
  // Ordinamento
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Visualizzazione
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Estrai lista artisti unici per il filtro
  const uniqueArtists = useMemo(() => {
    const artists = songs
      .map(song => song.artist)
      .filter((artist): artist is string => !!artist && artist.trim() !== '');
    return [...new Set(artists)].sort();
  }, [songs]);

  // Estrai time signatures uniche
  const uniqueTimeSignatures = useMemo(() => {
    const signatures = songs.map(song => song.timeSignature);
    return [...new Set(signatures)].sort((a, b) => a - b);
  }, [songs]);

  // Filtra e ordina i brani
  const filteredAndSortedSongs = useMemo(() => {
    let result = [...songs];

    // Filtro per ricerca (nome, artista, descrizione)
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
          // Se stesso artista, ordina per nome
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
  }, [songs, searchQuery, filterArtist, filterTimeSignature, sortBy, sortDirection]);

  const handleCreateSong = async (dto: CreateSongDto) => {
    try {
      const newSong = await apiClient.createSong(dto);
      setSongs([...songs, newSong]);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating song:', error);
      alert('Errore nella creazione del brano');
    }
  };

  const handleUpdateSong = async (id: string, dto: UpdateSongDto) => {
    try {
      const updatedSong = await apiClient.updateSong(id, dto);
      setSongs(songs.map((s) => (s.id === id ? updatedSong : s)));
      setIsModalOpen(false);
      setEditingSong(null);
    } catch (error) {
      console.error('Error updating song:', error);
      alert('Errore nell\'aggiornamento del brano');
    }
  };

  const handleDeleteSong = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo brano?')) return;

    try {
      await apiClient.deleteSong(id);
      setSongs(songs.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Error deleting song:', error);
      alert('Errore nell\'eliminazione del brano');
    }
  };

  const handleEditSong = (song: Song) => {
    setEditingSong(song);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSong(null);
  };

  const handleShareSong = (song: Song) => {
    setSharingSong(song);
  };

  const handleShareWithFriends = async (userIds: string[]) => {
    if (!sharingSong) return;

    const updatedSong = await apiClient.shareSong(sharingSong.id, userIds);
    setSongs(songs.map(s => s.id === sharingSong.id ? updatedSong : s));
    setSharingSong(updatedSong);
  };

  const handleUnshareSong = async (userId: string) => {
    if (!sharingSong) return;

    const updatedSong = await apiClient.unshareSong(sharingSong.id, userId);
    setSongs(songs.map(s => s.id === sharingSong.id ? updatedSong : s));
    setSharingSong(updatedSong);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterArtist('');
    setFilterTimeSignature('');
    setSortBy('name');
    setSortDirection('asc');
  };

  const hasActiveFilters = searchQuery || filterArtist || filterTimeSignature !== '';

  const isOwner = (song: Song) => song.userId === user?.id;

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const getTotalBars = (song: Song) => {
    return song.sections?.reduce((sum, s) => sum + s.bars, 0) || 0;
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>I Miei Brani</h2>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          + Aggiungi Brano
        </button>
      </div>

      {/* Filtri e Ordinamento */}
      {songs.length > 0 && (
        <div className="filters-container">
          {/* Ricerca */}
          <div className="filter-row">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Cerca per nome, artista o descrizione..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="clear-search"
                  title="Cancella ricerca"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Toggle Visualizzazione */}
            <div className="view-toggle">
              <button
                onClick={() => setViewMode('grid')}
                className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                title="Visualizzazione a griglia"
              >
                ▦
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                title="Visualizzazione a lista"
              >
                ☰
              </button>
            </div>
          </div>

          {/* Filtri e Ordinamento */}
          <div className="filter-row">
            <div className="filters-group">
              {/* Filtro Artista */}
              <div className="filter-item">
                <label>Artista</label>
                <select
                  value={filterArtist}
                  onChange={(e) => setFilterArtist(e.target.value)}
                >
                  <option value="">Tutti</option>
                  {uniqueArtists.map(artist => (
                    <option key={artist} value={artist}>{artist}</option>
                  ))}
                </select>
              </div>

              {/* Filtro Time Signature */}
              <div className="filter-item">
                <label>Tempo</label>
                <select
                  value={filterTimeSignature}
                  onChange={(e) => setFilterTimeSignature(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Tutti</option>
                  {uniqueTimeSignatures.map(ts => (
                    <option key={ts} value={ts}>{ts}/4</option>
                  ))}
                </select>
              </div>

              {/* Ordinamento */}
              <div className="filter-item">
                <label>Ordina per</label>
                <div className="sort-controls">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                  >
                    <option value="name">Nome brano</option>
                    <option value="artist">Artista</option>
                    <option value="bpm">BPM</option>
                    <option value="recent">Più recenti</option>
                  </select>
                  <button
                    onClick={toggleSortDirection}
                    className="sort-direction-btn"
                    title={sortDirection === 'asc' ? 'Crescente' : 'Decrescente'}
                  >
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
            </div>

            {/* Reset Filtri */}
            {hasActiveFilters && (
              <button onClick={clearFilters} className="btn btn-secondary btn-sm">
                ✕ Reset filtri
              </button>
            )}
          </div>

          {/* Contatore risultati */}
          <div className="results-count">
            {filteredAndSortedSongs.length === songs.length ? (
              <span>{songs.length} {songs.length === 1 ? 'brano' : 'brani'}</span>
            ) : (
              <span>
                {filteredAndSortedSongs.length} di {songs.length} {songs.length === 1 ? 'brano' : 'brani'}
              </span>
            )}
          </div>
        </div>
      )}

      {songs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎵</div>
          <p>Nessun brano ancora. Inizia ad aggiungerne uno!</p>
        </div>
      ) : filteredAndSortedSongs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p>Nessun brano trovato con i filtri selezionati</p>
          <button onClick={clearFilters} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
            Reset filtri
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="songs-grid">
          {filteredAndSortedSongs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              isOwner={isOwner(song)}
              onEdit={() => handleEditSong(song)}
              onDelete={() => handleDeleteSong(song.id)}
              onShare={() => handleShareSong(song)}
            />
          ))}
        </div>
      ) : (
        <div className="songs-list">
          {/* Header Lista */}
          <div className="songs-list-header">
            <span className="list-col-name">Brano</span>
            <span className="list-col-artist">Artista</span>
            <span className="list-col-bpm">BPM</span>
            <span className="list-col-time">Tempo</span>
            <span className="list-col-sections">Sezioni</span>
            <span className="list-col-actions">Azioni</span>
          </div>

          {/* Righe Lista */}
          {filteredAndSortedSongs.map((song) => {
            const totalBars = getTotalBars(song);
            const hasAdvancedMode = song.sections && song.sections.length > 0;
            const owner = isOwner(song);

            return (
              <div key={song.id} className="songs-list-row">
                <div className="list-col-name">
                  <span className="list-song-name">{song.name}</span>
                  {song.description && (
                    <span className="list-song-description">{song.description}</span>
                  )}
                </div>
                <div className="list-col-artist">
                  {song.artist || <span className="text-muted">—</span>}
                </div>
                <div className="list-col-bpm">{song.bpm}</div>
                <div className="list-col-time">{song.timeSignature}/4</div>
                <div className="list-col-sections">
                  {hasAdvancedMode ? (
                    <span>{song.sections!.length} ({totalBars} batt.)</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </div>
                <div className="list-col-actions">
                  {owner ? (
                    <>
                      <button
                        onClick={() => handleShareSong(song)}
                        className="icon-btn"
                        title="Condividi"
                      >
                        🔗
                      </button>
                      <button
                        onClick={() => handleEditSong(song)}
                        className="icon-btn"
                        title="Modifica"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteSong(song.id)}
                        className="icon-btn"
                        title="Elimina"
                      >
                        🗑️
                      </button>
                    </>
                  ) : (
                    <span className="badge badge-owner">👤</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <SongModal
          song={editingSong}
          onSave={
            editingSong
              ? (dto: any) => handleUpdateSong(editingSong.id, dto)
              : handleCreateSong
          }
          onClose={handleCloseModal}
        />
      )}

      {sharingSong && (
        <ShareModal
          title="Condividi Brano"
          itemName={sharingSong.name}
          sharedWith={sharingSong.sharedWith}
          onShare={handleShareWithFriends}
          onUnshare={handleUnshareSong}
          onClose={() => setSharingSong(null)}
        />
      )}
    </div>
  );
}