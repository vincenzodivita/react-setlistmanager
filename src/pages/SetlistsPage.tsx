import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { apiClient } from '@/services/api';
import type { Setlist, CreateSetlistDto, UpdateSetlistDto } from '@/types';
import SetlistCard from '@/components/SetlistCard';
import SetlistModal from '@/components/SetlistModal';
import SetlistDetailModal from '@/components/SetlistDetailModal';
import ShareModal from '@/components/ShareModal';
import './SetlistsPage.css';

type SortOption = 'name' | 'songs' | 'recent';
type ViewMode = 'grid' | 'list';

export default function SetlistsPage() {
  const navigate = useNavigate();
  const { setlists, setSetlists, songs, user } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingSetlist, setEditingSetlist] = useState<Setlist | null>(null);
  const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null);
  const [sharingSetlist, setSharingSetlist] = useState<Setlist | null>(null);

  // Filtri
  const [searchQuery, setSearchQuery] = useState('');
  const [filterShared, setFilterShared] = useState<'all' | 'shared' | 'private'>('all');
  
  // Ordinamento
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Visualizzazione
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Filtra e ordina le setlist
  const filteredAndSortedSetlists = useMemo(() => {
    let result = [...setlists];

    // Filtro per ricerca (nome, descrizione)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(setlist =>
        setlist.name.toLowerCase().includes(query) ||
        (setlist.description && setlist.description.toLowerCase().includes(query))
      );
    }

    // Filtro per condivisione
    if (filterShared === 'shared') {
      result = result.filter(setlist => setlist.sharedWith.length > 0);
    } else if (filterShared === 'private') {
      result = result.filter(setlist => setlist.sharedWith.length === 0);
    }

    // Ordinamento
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'it');
          break;
        case 'songs':
          comparison = a.songs.length - b.songs.length;
          break;
        case 'recent':
          comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [setlists, searchQuery, filterShared, sortBy, sortDirection]);

  const handleCreateSetlist = async (dto: CreateSetlistDto) => {
    try {
      const newSetlist = await apiClient.createSetlist(dto);
      setSetlists([...setlists, newSetlist]);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating setlist:', error);
      alert('Errore nella creazione della setlist');
    }
  };

  const handleUpdateSetlist = async (id: string, dto: UpdateSetlistDto) => {
    try {
      const updatedSetlist = await apiClient.updateSetlist(id, dto);
      setSetlists(setlists.map((s) => (s.id === id ? updatedSetlist : s)));
      setIsModalOpen(false);
      setEditingSetlist(null);
    } catch (error) {
      console.error('Error updating setlist:', error);
      alert('Errore nell\'aggiornamento della setlist');
    }
  };

  const handleDeleteSetlist = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa setlist?')) return;

    try {
      await apiClient.deleteSetlist(id);
      setSetlists(setlists.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Error deleting setlist:', error);
      alert('Errore nell\'eliminazione della setlist');
    }
  };

  const handleEditSetlist = (setlist: Setlist) => {
    setEditingSetlist(setlist);
    setIsModalOpen(true);
  };

  const handleOpenDetail = (setlist: Setlist) => {
    setSelectedSetlist(setlist);
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSetlist(null);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedSetlist(null);
  };

  const handlePlaySetlist = (setlist: Setlist) => {
    navigate('/live', { state: { setlist } });
  };

  const handleShareSetlist = (setlist: Setlist) => {
    setSharingSetlist(setlist);
  };

  const handleShareWithFriends = async (userIds: string[]) => {
    if (!sharingSetlist) return;

    const updatedSetlist = await apiClient.shareSetlist(sharingSetlist.id, userIds);
    setSetlists(setlists.map(s => s.id === sharingSetlist.id ? updatedSetlist : s));
    setSharingSetlist(updatedSetlist);
  };

  const handleUnshareSetlist = async (userId: string) => {
    if (!sharingSetlist) return;

    const updatedSetlist = await apiClient.unshareSetlist(sharingSetlist.id, userId);
    setSetlists(setlists.map(s => s.id === sharingSetlist.id ? updatedSetlist : s));
    setSharingSetlist(updatedSetlist);
  };

  const isOwner = (setlist: Setlist) => setlist.userId === user?.id;

  const clearFilters = () => {
    setSearchQuery('');
    setFilterShared('all');
    setSortBy('name');
    setSortDirection('asc');
  };

  const hasActiveFilters = searchQuery || filterShared !== 'all';

  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Funzione per ottenere info sui brani di una setlist
  const getSetlistSongsInfo = (setlist: Setlist) => {
    const setlistSongs = setlist.songs
      .map(id => songs.find(s => s.id === id))
      .filter(s => s !== undefined);
    
    const totalDuration = setlistSongs.reduce((acc, song) => {
      if (song?.sections) {
        const bars = song.sections.reduce((sum, sec) => sum + sec.bars, 0);
        const beatsPerBar = song.timeSignature;
        const totalBeats = bars * beatsPerBar;
        const durationSec = (totalBeats / song.bpm) * 60;
        return acc + durationSec;
      }
      return acc;
    }, 0);

    const avgBpm = setlistSongs.length > 0
      ? Math.round(setlistSongs.reduce((sum, s) => sum + (s?.bpm || 0), 0) / setlistSongs.length)
      : 0;

    return { totalDuration, avgBpm, songCount: setlist.songs.length };
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Le Mie Setlist</h2>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          + Nuova Setlist
        </button>
      </div>

      {/* Filtri e Ordinamento */}
      {setlists.length > 0 && (
        <div className="filters-container">
          {/* Ricerca */}
          <div className="filter-row">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Cerca per nome o descrizione..."
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
              {/* Filtro Condivisione */}
              <div className="filter-item">
                <label>Stato</label>
                <select
                  value={filterShared}
                  onChange={(e) => setFilterShared(e.target.value as 'all' | 'shared' | 'private')}
                >
                  <option value="all">Tutte</option>
                  <option value="shared">Condivise</option>
                  <option value="private">Private</option>
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
                    <option value="name">Nome</option>
                    <option value="songs">Numero brani</option>
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


              {/* Reset Filtri */}
              {hasActiveFilters && (
                <button onClick={clearFilters} className="btn btn-secondary btn-sm">
                  ✕ Reset filtri
                </button>
              )}
            </div>

       
          </div>

          {/* Contatore risultati */}
          <div className="results-count">
            {filteredAndSortedSetlists.length === setlists.length ? (
              <span>{setlists.length} {setlists.length === 1 ? 'setlist' : 'setlist'}</span>
            ) : (
              <span>
                {filteredAndSortedSetlists.length} di {setlists.length} setlist
              </span>
            )}
          </div>
        </div>
      )}

      {setlists.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p>Nessuna setlist ancora. Creane una!</p>
        </div>
      ) : filteredAndSortedSetlists.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p>Nessuna setlist trovata con i filtri selezionati</p>
          <button onClick={clearFilters} className="btn btn-secondary" style={{ marginTop: '1rem' }}>
            Reset filtri
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="setlists-grid">
          {filteredAndSortedSetlists.map((setlist) => (
            <SetlistCard
              key={setlist.id}
              setlist={setlist}
              isOwner={isOwner(setlist)}
              onEdit={() => handleEditSetlist(setlist)}
              onDelete={() => handleDeleteSetlist(setlist.id)}
              onClick={() => handleOpenDetail(setlist)}
              onPlay={() => handlePlaySetlist(setlist)}
              onShare={() => handleShareSetlist(setlist)}
            />
          ))}
        </div>
      ) : (
        <div className="setlists-list">
          {/* Header Lista */}
          <div className="setlists-list-header">
            <span className="list-col-name">Setlist</span>
            <span className="list-col-songs">Brani</span>
            <span className="list-col-duration">Durata</span>
            <span className="list-col-bpm">BPM Medio</span>
            <span className="list-col-status">Stato</span>
            <span className="list-col-actions">Azioni</span>
          </div>

          {/* Righe Lista */}
          {filteredAndSortedSetlists.map((setlist) => {
            const owner = isOwner(setlist);
            const { songCount, totalDuration, avgBpm } = getSetlistSongsInfo(setlist);
            const isShared = setlist.sharedWith.length > 0;

            return (
              <div 
                key={setlist.id} 
                className="setlists-list-row"
                onClick={() => handleOpenDetail(setlist)}
              >
                <div className="list-col-name">
                  <span className="list-setlist-name">{setlist.name}</span>
                  {setlist.description && (
                    <span className="list-setlist-description">{setlist.description}</span>
                  )}
                </div>
                <div className="list-col-songs">
                  🎵 {songCount}
                </div>
                <div className="list-col-duration">
                  {formatDuration(totalDuration)}
                </div>
                <div className="list-col-bpm">
                  {avgBpm > 0 ? `${avgBpm}` : '—'}
                </div>
                <div className="list-col-status">
                  {isShared ? (
                    <span className="badge badge-shared">🤝 {setlist.sharedWith.length}</span>
                  ) : (
                    <span className="badge badge-private">🔒</span>
                  )}
                  {!owner && <span className="badge badge-owner">👤</span>}
                </div>
                <div className="list-col-actions" onClick={(e) => e.stopPropagation()}>
                  {songCount > 0 && (
                    <button
                      onClick={() => handlePlaySetlist(setlist)}
                      className="icon-btn"
                      title="Avvia"
                    >
                      ▶
                    </button>
                  )}
                  {owner && (
                    <>
                      <button
                        onClick={() => handleShareSetlist(setlist)}
                        className="icon-btn"
                        title="Condividi"
                      >
                        🔗
                      </button>
                      <button
                        onClick={() => handleEditSetlist(setlist)}
                        className="icon-btn"
                        title="Modifica"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteSetlist(setlist.id)}
                        className="icon-btn"
                        title="Elimina"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <SetlistModal
          setlist={editingSetlist}
          onSave={
            editingSetlist
              ? (dto: any) => handleUpdateSetlist(editingSetlist.id, dto)
              : handleCreateSetlist
          }
          onClose={handleCloseModal}
        />
      )}

      {isDetailModalOpen && selectedSetlist && (
        <SetlistDetailModal
          setlist={selectedSetlist}
          onClose={handleCloseDetailModal}
          onUpdate={(updated) => {
            setSetlists(setlists.map((s) => (s.id === updated.id ? updated : s)));
            setSelectedSetlist(updated);
          }}
          onPlay={() => handlePlaySetlist(selectedSetlist)}
        />
      )}

      {sharingSetlist && (
        <ShareModal
          title="Condividi Setlist"
          itemName={sharingSetlist.name}
          sharedWith={sharingSetlist.sharedWith}
          onShare={handleShareWithFriends}
          onUnshare={handleUnshareSetlist}
          onClose={() => setSharingSetlist(null)}
        />
      )}
    </div>
  );
}