import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import type { FriendWithUser } from '@/types';
import './ShareModal.css';

interface ShareModalProps {
  title: string;
  itemName: string;
  sharedWith: string[];
  onShare: (userIds: string[]) => Promise<void>;
  onUnshare: (userId: string) => Promise<void>;
  onClose: () => void;
}

export default function ShareModal({
  title,
  itemName,
  sharedWith,
  onShare,
  onUnshare,
  onClose,
}: ShareModalProps) {
  const { friends } = useAppStore();
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Amici con cui è già condiviso
  const sharedFriends = friends.filter(f => sharedWith.includes(f.userId));
  
  // Amici disponibili per la condivisione
  const availableFriends = friends.filter(f => !sharedWith.includes(f.userId));

  const handleToggleFriend = (userId: string) => {
    setSelectedFriends(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleShare = async () => {
    if (selectedFriends.length === 0) return;

    setIsLoading(true);
    setError('');

    try {
      await onShare(selectedFriends);
      setSelectedFriends([]);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore nella condivisione');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnshare = async (userId: string) => {
    const friend = friends.find(f => f.userId === userId);
    if (!friend) return;
    
    if (!confirm(`Rimuovere la condivisione con ${friend.name}?`)) return;

    setIsLoading(true);
    setError('');

    try {
      await onUnshare(userId);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore nella rimozione della condivisione');
    } finally {
      setIsLoading(false);
    }
  };

  const getFriendById = (userId: string): FriendWithUser | undefined => {
    return friends.find(f => f.userId === userId);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{title}</h2>
            <p className="modal-subtitle">"{itemName}"</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="share-error">
              {error}
            </div>
          )}

          {/* Condiviso con */}
          {sharedFriends.length > 0 && (
            <div className="share-section">
              <h3 className="share-section-title">
                Condiviso con ({sharedFriends.length})
              </h3>
              <div className="shared-list">
                {sharedFriends.map((friend) => (
                  <div key={friend.userId} className="shared-item">
                    <div className="shared-avatar">
                      {friend.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="shared-info">
                      <span className="shared-name">{friend.name}</span>
                      <span className="shared-email">{friend.email}</span>
                    </div>
                    <button
                      onClick={() => handleUnshare(friend.userId)}
                      className="btn btn-secondary btn-sm"
                      disabled={isLoading}
                    >
                      Rimuovi
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seleziona amici */}
          <div className="share-section">
            <h3 className="share-section-title">
              {sharedFriends.length > 0 ? 'Aggiungi altri amici' : 'Seleziona amici'}
            </h3>
            
            {friends.length === 0 ? (
              <div className="share-empty">
                <p>Non hai ancora amici.</p>
                <p className="share-empty-hint">
                  Vai alla sezione Amici per aggiungerne.
                </p>
              </div>
            ) : availableFriends.length === 0 ? (
              <div className="share-empty">
                <p>Hai già condiviso con tutti i tuoi amici!</p>
              </div>
            ) : (
              <div className="friends-select-list">
                {availableFriends.map((friend) => {
                  const isSelected = selectedFriends.includes(friend.userId);
                  return (
                    <div
                      key={friend.userId}
                      className={`friend-select-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleToggleFriend(friend.userId)}
                    >
                      <div className="friend-select-checkbox">
                        {isSelected ? '✓' : ''}
                      </div>
                      <div className="friend-select-avatar">
                        {friend.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="friend-select-info">
                        <span className="friend-select-name">{friend.name}</span>
                        <span className="friend-select-email">{friend.email}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Chiudi
          </button>
          {availableFriends.length > 0 && (
            <button
              onClick={handleShare}
              className="btn btn-primary"
              disabled={selectedFriends.length === 0 || isLoading}
            >
              {isLoading ? 'Condivisione...' : `Condividi (${selectedFriends.length})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}