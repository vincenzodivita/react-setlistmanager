import { useState, FormEvent } from 'react';
import type { Song, CreateSongDto, UpdateSongDto } from '@/types';

interface SongModalProps {
  song: Song | null;
  onSave: (dto: CreateSongDto | UpdateSongDto) => void;
  onClose: () => void;
}

export default function SongModal({ song, onSave, onClose }: SongModalProps) {
  const [name, setName] = useState(song?.name || '');
  const [bpm, setBpm] = useState(song?.bpm || 120);
  const [timeSignature, setTimeSignature] = useState(song?.timeSignature || 4);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave({ name, bpm, timeSignature });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {song ? 'Modifica Brano' : 'Nuovo Brano'}
          </h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="name">Nome Brano</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es: Sweet Child O' Mine"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="bpm">BPM</label>
              <input
                type="number"
                id="bpm"
                value={bpm}
                onChange={(e) => setBpm(Number(e.target.value))}
                min="40"
                max="300"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="timeSignature">Time Signature</label>
              <select
                id="timeSignature"
                value={timeSignature}
                onChange={(e) => setTimeSignature(Number(e.target.value))}
              >
                <option value="3">3/4</option>
                <option value="4">4/4</option>
                <option value="5">5/4</option>
                <option value="6">6/8</option>
                <option value="7">7/8</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Annulla
            </button>
            <button type="submit" className="btn btn-primary">
              {song ? 'Salva' : 'Crea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}