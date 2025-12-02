import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { apiClient } from '@/services/api';
import type { FriendWithUser } from '@/types';
import { FriendshipStatus } from '@/types';
import './FriendsPage.css';

export default function FriendsPage() {
  const { friends, setFriends, pendingRequests, setPendingRequests } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<'friends' | 'pending' | 'add'>('friends');
  const [searchEmail, setSearchEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Invia richiesta di amicizia
  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail.trim()) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      await apiClient.sendFriendRequest({ identifier: searchEmail.trim() });
      setSuccess(`Richiesta di amicizia inviata a ${searchEmail}`);
      setSearchEmail('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore nell\'invio della richiesta');
    } finally {
      setIsLoading(false);
    }
  };

  // Accetta richiesta
  const handleAcceptRequest = async (request: FriendWithUser) => {
    try {
      await apiClient.respondToFriendRequest(request.id, FriendshipStatus.ACCEPTED);
      
      // Aggiorna lo stato locale
      setPendingRequests(pendingRequests.filter(r => r.id !== request.id));
      setFriends([...friends, { ...request, status: FriendshipStatus.ACCEPTED }]);
      
      setSuccess(`${request.name} è ora tuo amico!`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore nell\'accettare la richiesta');
    }
  };

  // Rifiuta richiesta
  const handleRejectRequest = async (request: FriendWithUser) => {
    try {
      await apiClient.respondToFriendRequest(request.id, FriendshipStatus.REJECTED);
      setPendingRequests(pendingRequests.filter(r => r.id !== request.id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore nel rifiutare la richiesta');
    }
  };

  // Rimuovi amico
  const handleRemoveFriend = async (friend: FriendWithUser) => {
    if (!confirm(`Sei sicuro di voler rimuovere ${friend.name} dagli amici?`)) return;

    try {
      await apiClient.removeFriend(friend.id);
      setFriends(friends.filter(f => f.id !== friend.id));
      setSuccess(`${friend.name} è stato rimosso dagli amici`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Errore nella rimozione dell\'amico');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h2>Gestione Amici</h2>
      </div>

      {/* Tabs */}
      <div className="friends-tabs">
        <button
          className={`friends-tab ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          👥 Amici ({friends.length})
        </button>
        <button
          className={`friends-tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          📩 Richieste
          {pendingRequests.length > 0 && (
            <span className="tab-badge">{pendingRequests.length}</span>
          )}
        </button>
        <button
          className={`friends-tab ${activeTab === 'add' ? 'active' : ''}`}
          onClick={() => setActiveTab('add')}
        >
          ➕ Aggiungi
        </button>
      </div>

      {/* Messaggi */}
      {error && (
        <div className="message message-error">
          {error}
          <button onClick={() => setError('')} className="message-close">✕</button>
        </div>
      )}
      {success && (
        <div className="message message-success">
          {success}
          <button onClick={() => setSuccess('')} className="message-close">✕</button>
        </div>
      )}

      {/* Tab: Lista Amici */}
      {activeTab === 'friends' && (
        <div className="friends-content">
          {friends.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              <p>Non hai ancora amici</p>
              <button 
                onClick={() => setActiveTab('add')} 
                className="btn btn-primary"
                style={{ marginTop: '1rem' }}
              >
                Aggiungi il primo amico
              </button>
            </div>
          ) : (
            <div className="friends-list">
              {friends.map((friend) => (
                <div key={friend.id} className="friend-card">
                  <div className="friend-avatar">
                    {friend.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="friend-info">
                    <h3 className="friend-name">{friend.name}</h3>
                    <p className="friend-email">{friend.email}</p>
                  </div>
                  <div className="friend-actions">
                    <button
                      onClick={() => handleRemoveFriend(friend)}
                      className="btn btn-secondary btn-sm"
                      title="Rimuovi amico"
                    >
                      Rimuovi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Richieste Pendenti */}
      {activeTab === 'pending' && (
        <div className="friends-content">
          {pendingRequests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📩</div>
              <p>Nessuna richiesta di amicizia in sospeso</p>
            </div>
          ) : (
            <div className="friends-list">
              {pendingRequests.map((request) => (
                <div key={request.id} className="friend-card pending">
                  <div className="friend-avatar">
                    {request.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="friend-info">
                    <h3 className="friend-name">{request.name}</h3>
                    <p className="friend-email">{request.email}</p>
                    <p className="request-date">
                      Richiesta il {new Date(request.createdAt).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                  <div className="friend-actions">
                    <button
                      onClick={() => handleAcceptRequest(request)}
                      className="btn btn-primary btn-sm"
                    >
                      ✓ Accetta
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request)}
                      className="btn btn-secondary btn-sm"
                    >
                      ✕ Rifiuta
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Aggiungi Amico */}
      {activeTab === 'add' && (
        <div className="friends-content">
          <div className="add-friend-section">
            <h3>Invia una richiesta di amicizia</h3>
            <p className="add-friend-description">
              Inserisci l'email dell'utente che vuoi aggiungere come amico.
              Riceverà una notifica e potrà accettare o rifiutare la richiesta.
            </p>
            
            <form onSubmit={handleSendRequest} className="add-friend-form">
              <div className="form-group">
                <label htmlFor="email">Email dell'utente</label>
                <input
                  type="email"
                  id="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="esempio@email.com"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isLoading || !searchEmail.trim()}
              >
                {isLoading ? 'Invio...' : '📤 Invia Richiesta'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}