import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { apiClient } from '@/services/api';
import type { Song, CreateSongDto, UpdateSongDto } from '@/types';
import SongCard from '@/components/SongCard';
import SongModal from '@/components/SongModal';
import './SongsPage.css';

export default function SongsPage() {
  const { songs, setSongs, user } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);

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

  const isOwner = (song: Song) => song.userId === user?.id;

  return (
    <div className="page">
      <div className="page-header">
        <h2>I Miei Brani</h2>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          + Aggiungi Brano
        </button>
      </div>

      {songs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎵</div>
          <p>Nessun brano ancora. Inizia ad aggiungerne uno!</p>
        </div>
      ) : (
        <div className="songs-grid">
          {songs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              isOwner={isOwner(song)}
              onEdit={() => handleEditSong(song)}
              onDelete={() => handleDeleteSong(song.id)}
            />
          ))}
        </div>
      )}

      {isModalOpen && (
        <SongModal
          song={editingSong}
          onSave={
            editingSong
              ? (dto) => handleUpdateSong(editingSong.id, dto)
              : handleCreateSong
          }
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
