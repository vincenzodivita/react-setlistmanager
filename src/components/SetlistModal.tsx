import { useState, FormEvent } from 'react';
import type { Setlist, CreateSetlistDto, UpdateSetlistDto } from '@/types';

interface SetlistModalProps {
  setlist: Setlist | null;
  onSave: (dto: CreateSetlistDto | UpdateSetlistDto) => void;
  onClose: () => void;
}

export default function SetlistModal({ setlist, onSave, onClose }: SetlistModalProps) {
  const [name, setName] = useState(setlist?.name || '');
  const [description, setDescription] = useState(setlist?.description || '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave({ name, description });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            {setlist ? 'Modifica Setlist' : 'Nuova Setlist'}
          </h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="name">Nome Setlist *</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es: Concerto Estate 2024"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Descrizione</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Aggiungi una descrizione opzionale..."
                rows={3}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Annulla
            </button>
            <button type="submit" className="btn btn-primary">
              {setlist ? 'Salva Modifiche' : 'Crea Setlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}