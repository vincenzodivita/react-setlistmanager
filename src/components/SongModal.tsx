import { useState, FormEvent, useEffect } from 'react';
import type { Song, CreateSongDto, UpdateSongDto, SongSection } from '@/types';

interface SongModalProps {
  song: Song | null;
  onSave: (dto: CreateSongDto | UpdateSongDto) => void;
  onClose: () => void;
}

export default function SongModal({ song, onSave, onClose }: SongModalProps) {
  const [name, setName] = useState(song?.name || '');
  const [bpm, setBpm] = useState(song?.bpm || 120);
  const [timeSignature, setTimeSignature] = useState(song?.timeSignature || 4);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [sections, setSections] = useState<SongSection[]>([]);

  useEffect(() => {
    if (song?.sections && song.sections.length > 0) {
      setAdvancedMode(true);
      setSections(song.sections);
    } else {
      setSections([]);
    }
  }, [song]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    const songData: CreateSongDto | UpdateSongDto = {
      name,
      bpm,
      timeSignature,
      sections: advancedMode && sections.length > 0 ? sections : undefined,
    };

    onSave(songData);
  };

  const addSection = () => {
    setSections([...sections, { name: '', bars: 4 }]);
  };

  const updateSection = (index: number, field: 'name' | 'bars', value: string | number) => {
    const newSections = [...sections];
    if (field === 'name') {
      newSections[index].name = value as string;
    } else {
      newSections[index].bars = value as number;
    }
    setSections(newSections);
  };

  const removeSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const toggleAdvancedMode = (checked: boolean) => {
    setAdvancedMode(checked);
    if (checked && sections.length === 0) {
      addSection();
    }
  };

  const totalBars = sections.reduce((sum, section) => sum + section.bars, 0);

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
            {/* Nome Brano */}
            <div className="form-group">
              <label htmlFor="name">Nome Brano *</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Es: Sweet Child O' Mine"
                required
              />
            </div>

            {/* BPM e Time Signature */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label htmlFor="bpm">BPM *</label>
                <input
                  type="number"
                  id="bpm"
                  value={bpm}
                  onChange={(e) => setBpm(Number(e.target.value))}
                  min="30"
                  max="300"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="timeSignature">Tempo *</label>
                <select
                  id="timeSignature"
                  value={timeSignature}
                  onChange={(e) => setTimeSignature(Number(e.target.value))}
                >
                  <option value="2">2/4</option>
                  <option value="3">3/4</option>
                  <option value="4">4/4</option>
                  <option value="5">5/4</option>
                  <option value="6">6/8</option>
                  <option value="7">7/8</option>
                </select>
              </div>
            </div>

            {/* Modalità Avanzata Toggle */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={advancedMode}
                  onChange={(e) => toggleAdvancedMode(e.target.checked)}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
                <span>Modalità Avanzata (Sezioni)</span>
              </label>
            </div>

            {/* Sezioni Container */}
            {advancedMode && (
              <div className="sections-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <label style={{ margin: 0, fontWeight: 600 }}>Sezioni del Brano</label>
                  {totalBars > 0 && (
                    <span className="info-badge">Totale: {totalBars} battute</span>
                  )}
                </div>

                <div className="sections-list">
                  {sections.map((section, index) => (
                    <div key={index} className="section-form-item">
                      <input
                        type="text"
                        placeholder="Nome sezione (es: Intro, Strofa 1...)"
                        value={section.name}
                        onChange={(e) => updateSection(index, 'name', e.target.value)}
                        style={{ flex: 2 }}
                      />
                      <input
                        type="number"
                        placeholder="Battute"
                        value={section.bars}
                        onChange={(e) => updateSection(index, 'bars', Number(e.target.value))}
                        min="1"
                        max="999"
                        style={{ flex: 1, textAlign: 'center' }}
                      />
                      <button
                        type="button"
                        onClick={() => removeSection(index)}
                        className="icon-btn"
                        title="Rimuovi sezione"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addSection}
                  className="btn btn-secondary"
                  style={{ width: '100%', marginTop: '0.5rem' }}
                >
                  + Aggiungi Sezione
                </button>

                {sections.length > 0 && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      💡 Esempi di sezioni comuni:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {['Intro', 'Strofa', 'Pre-Ritornello', 'Ritornello', 'Bridge', 'Solo', 'Outro'].map((example) => (
                        <button
                          key={example}
                          type="button"
                          onClick={() => addSection()}
                          className="badge"
                          style={{ 
                            cursor: 'pointer',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                        >
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Annulla
            </button>
            <button type="submit" className="btn btn-primary">
              {song ? 'Salva Modifiche' : 'Crea Brano'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}