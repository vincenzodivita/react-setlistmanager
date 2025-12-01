import type { Setlist } from '@/types';
import './SetlistCard.css';

interface SetlistCardProps {
  setlist: Setlist;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
  onPlay: () => void;
}

export default function SetlistCard({
  setlist,
  isOwner,
  onEdit,
  onDelete,
  onClick,
  onPlay,
}: SetlistCardProps) {
  const isShared = setlist.sharedWith.length > 0;
  const songCount = setlist.songs.length;

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPlay();
  };

  return (
    <div className="setlist-card" onClick={onClick}>
      <div className="setlist-card-header">
        <div>
          <h3 className="setlist-name">{setlist.name}</h3>
          {setlist.description && (
            <p className="setlist-description">{setlist.description}</p>
          )}
          <div className="setlist-badges">
            {isShared && <span className="badge badge-shared">🤝 Condivisa</span>}
            {!isOwner && <span className="badge badge-owner">👤 Di un amico</span>}
          </div>
        </div>
        {isOwner && (
          <div className="setlist-card-actions">
            <button onClick={handleEdit} className="icon-btn" title="Modifica">
              ✏️
            </button>
            <button onClick={handleDelete} className="icon-btn" title="Elimina">
              🗑️
            </button>
          </div>
        )}
      </div>

      <div className="setlist-info">
        <span className="info-badge">
          🎵 {songCount} {songCount === 1 ? 'brano' : 'brani'}
        </span>
      </div>

      {songCount > 0 && (
        <div className="setlist-actions">
          <button onClick={handlePlay} className="btn btn-primary btn-sm">
            ▶ Avvia Live
          </button>
        </div>
      )}
    </div>
  );
}