import type { Song } from '@/types';
import './SongCard.css';

interface SongCardProps {
  song: Song;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export default function SongCard({ song, isOwner, onEdit, onDelete }: SongCardProps) {
  const totalBars = song.sections?.reduce((sum, s) => sum + s.bars, 0) || 0;
  const isShared = song.sharedWith.length > 0;
  const hasAdvancedMode = song.sections && song.sections.length > 0;

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  return (
    <div className="song-card">
      <div className="song-card-header">
        <div>
          <h3 className="song-name">{song.name}</h3>
          <div className="song-badges">
            {hasAdvancedMode && <span className="badge badge-advanced">🎼 Avanzato</span>}
            {isShared && <span className="badge badge-shared">🤝 Condiviso</span>}
            {!isOwner && <span className="badge badge-owner">👤 Di un amico</span>}
          </div>
        </div>
        {isOwner && (
          <div className="song-card-actions">
            <button onClick={handleEdit} className="icon-btn" title="Modifica">
              ✏️
            </button>
            <button onClick={handleDelete} className="icon-btn" title="Elimina">
              🗑️
            </button>
          </div>
        )}
      </div>

      <div className="song-info">
        <span className="info-badge">⏱️ {song.bpm} BPM</span>
        <span className="info-badge">🎵 {song.timeSignature}/4</span>
        {hasAdvancedMode && (
          <span className="info-badge">
            📝 {song.sections!.length} sezioni ({totalBars} batt.)
          </span>
        )}
      </div>

      {hasAdvancedMode && (
        <div className="sections-preview">
          {song.sections!.map((section, index) => (
            <span key={index} className="section-tag">
              {section.name || `Sezione ${index + 1}`} ({section.bars} batt.)
            </span>
          ))}
        </div>
      )}
    </div>
  );
}