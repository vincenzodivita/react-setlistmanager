import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { apiClient } from '@/services/api';
import type { Setlist, CreateSetlistDto, UpdateSetlistDto } from '@/types';
import SetlistCard from '@/components/SetlistCard';
import SetlistModal from '@/components/SetlistModal';
import SetlistDetailModal from '@/components/SetlistDetailModal';
import './SetlistsPage.css';

export default function SetlistsPage() {
  const navigate = useNavigate();
  const { setlists, setSetlists, user } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingSetlist, setEditingSetlist] = useState<Setlist | null>(null);
  const [selectedSetlist, setSelectedSetlist] = useState<Setlist | null>(null);

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
    // TODO: Navigate to Live mode with selected setlist
    navigate('/live', { state: { setlist } });
  };

  const isOwner = (setlist: Setlist) => setlist.userId === user?.id;

  return (
    <div className="page">
      <div className="page-header">
        <h2>Le Mie Setlist</h2>
        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          + Nuova Setlist
        </button>
      </div>

      {setlists.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <p>Nessuna setlist ancora. Creane una!</p>
        </div>
      ) : (
        <div className="setlists-grid">
          {setlists.map((setlist) => (
            <SetlistCard
              key={setlist.id}
              setlist={setlist}
              isOwner={isOwner(setlist)}
              onEdit={() => handleEditSetlist(setlist)}
              onDelete={() => handleDeleteSetlist(setlist.id)}
              onClick={() => handleOpenDetail(setlist)}
              onPlay={() => handlePlaySetlist(setlist)}
            />
          ))}
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
    </div>
  );
}