import React, { useState, useRef } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { Pin, Plus, Trash2, Edit3, X, Camera, Upload, RotateCw, Image as ImageIcon, Sparkles } from 'lucide-react';

const NOTE_COLORS = [
  '#fef08a', // Yellow
  '#bbf7d0', // Mint Green
  '#bfdbfe', // Soft Blue
  '#fbcfe8', // Soft Pink
  '#fed7aa'  // Soft Orange
];

export default function FamilyPinboard() {
  const {
    notes, addNote, updateNote, deleteNote, activeMember, activeHousehold,
    setIsQuickAddOpen, setQuickAddDefaultType, showToast
  } = useFamily();

  // Track flipped note cards { [noteId]: boolean }
  const [flippedCards, setFlippedCards] = useState({});

  const [editingNote, setEditingNote] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor] = useState('#fef08a');
  const [editIsShared, setEditIsShared] = useState(false);
  const [editPhoto, setEditPhoto] = useState(null);

  // New Note Modal State
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newColor, setNewColor] = useState('#fef08a');
  const [newIsShared, setNewIsShared] = useState(false);
  const [newPhoto, setNewPhoto] = useState(null);

  const toggleFlip = (noteId, e) => {
    e?.stopPropagation();
    setFlippedCards(prev => ({ ...prev, [noteId]: !prev[noteId] }));
  };

  const handlePhotoUpload = (e, setPhotoFn) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoFn(event.target.result);
      showToast('📸 Foto angeheftet!', 'Foto wurde an der Pinnwand geladen.', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addNote({
      title: newTitle,
      content: newContent,
      color: newColor,
      isShared: newIsShared,
      photo: newPhoto
    });

    setNewTitle('');
    setNewContent('');
    setNewPhoto(null);
    setIsAddNoteOpen(false);
  };

  const handleStartEdit = (note, e) => {
    e?.stopPropagation();
    setEditingNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditColor(note.color || '#fef08a');
    setEditIsShared(note.isShared || false);
    setEditPhoto(note.photo || null);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingNote || !editTitle.trim()) return;

    updateNote(editingNote.id, {
      title: editTitle,
      content: editContent,
      color: editColor,
      isShared: editIsShared,
      photo: editPhoto
    });

    setEditingNote(null);
  };

  // Filter notes by household or shared
  const visibleNotes = notes.filter(n => {
    if (n.isShared) return true;
    const nHousehold = n.household || 'familie';
    return nHousehold === activeHousehold;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="card" style={{ padding: 20 }}>
        <div className="card-header" style={{ marginBottom: 12 }}>
          <h2 className="card-title" style={{ color: 'var(--primary)' }}>
            <Pin size={24} /> Familien-Pinnwand ({activeHousehold === 'familie' ? 'Unser Haushalt' : 'Haushalt Oma & Opa'})
          </h2>
          <button className="btn-primary" onClick={() => setIsAddNoteOpen(true)}>
            <Plus size={18} /> Neue Notiz oder Foto anheften
          </button>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Wichtige Zettel & Fotos am virtuellen Kühlschrank. Klicke auf Fotos, um die Karte wie ein Polaroid umzudrehen!
        </p>
      </div>

      {/* Grid of Notes (supporting 3D Polaroid Flip) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
        {visibleNotes.map(note => {
          const isFlipped = !!flippedCards[note.id];
          const hasPhoto = !!note.photo;

          return (
            <div
              key={note.id}
              style={{
                perspective: 1000,
                minHeight: 260,
                position: 'relative'
              }}
            >
              {/* Pin graphic */}
              <div style={{
                position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                width: 24, height: 24, borderRadius: '50%', background: note.isShared ? '#2563eb' : '#ef4444',
                boxShadow: '0 3px 6px rgba(0,0,0,0.2)', zIndex: 10
              }} />

              {/* 3D Card Inner Container */}
              <div
                onClick={() => hasPhoto && toggleFlip(note.id)}
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  cursor: hasPhoto ? 'pointer' : 'default',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
                }}
              >
                {/* FRONT SIDE */}
                <div style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  background: note.color || '#fef08a',
                  borderRadius: 'var(--radius-lg)',
                  padding: 20,
                  color: '#1e2923',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  minHeight: 260,
                  border: '1px solid rgba(0,0,0,0.08)'
                }}>
                  <div>
                    {note.isShared && (
                      <span className="badge" style={{ background: '#2563eb', color: 'white', marginBottom: 8, fontSize: '0.75rem' }}>
                        🤝 Geteilt mit Oma & Opa
                      </span>
                    )}

                    {/* Polaroid Photo if present */}
                    {hasPhoto ? (
                      <div style={{ background: 'white', padding: '10px 10px 14px 10px', borderRadius: 'var(--radius-sm)', marginBottom: 12, boxShadow: 'var(--shadow-sm)', textAlign: 'center' }}>
                        <img src={note.photo} alt={note.title} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                        <div style={{ fontWeight: 800, fontSize: '1rem', marginTop: 8 }}>{note.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <RotateCw size={12} /> Klicken zum Umdrehen (Text lesen)
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 8 }}>
                          {note.title}
                        </h3>
                        <div style={{ fontSize: '0.95rem', whiteSpace: 'pre-wrap', lineHeight: 1.5, opacity: 0.9, marginBottom: 14 }}>
                          {note.content}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Note Footer Metadata & Actions */}
                  <div style={{ borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: 8, marginTop: 8 }}>
                    <div style={{ fontSize: '0.78rem', opacity: 0.8, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span>✍️ <strong>Erstellt von:</strong> {note.createdBy || 'Familie'} ({note.createdAt || 'Heute'})</span>
                      {note.updatedBy && <span>✏️ <strong>Bearbeitet:</strong> {note.updatedBy}</span>}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                      {hasPhoto && (
                        <button
                          className="icon-circle-btn"
                          style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.7)', color: 'var(--primary)' }}
                          onClick={(e) => toggleFlip(note.id, e)}
                          title="Karte umdrehen"
                        >
                          <RotateCw size={14} />
                        </button>
                      )}

                      <button
                        className="icon-circle-btn"
                        style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.7)', color: 'var(--text-main)' }}
                        onClick={(e) => handleStartEdit(note, e)}
                        title="Notiz bearbeiten"
                      >
                        <Edit3 size={14} />
                      </button>

                      <button
                        className="icon-circle-btn"
                        style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.7)', color: '#ef4444' }}
                        onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                        title="Notiz löschen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* BACK SIDE (Text content of Polaroid) */}
                {hasPhoto && (
                  <div style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    position: 'absolute',
                    inset: 0,
                    background: note.color || '#fef08a',
                    borderRadius: 'var(--radius-lg)',
                    padding: 20,
                    color: '#1e2923',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1px solid rgba(0,0,0,0.08)'
                  }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280', marginBottom: 6 }}>
                        Rückseite des Fotos:
                      </div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 8 }}>{note.title}</h3>
                      <div style={{ fontSize: '0.95rem', whiteSpace: 'pre-wrap', lineHeight: 1.5, opacity: 0.9 }}>
                        {note.content}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: 8 }}>
                      <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>✍️ {note.createdBy}</span>
                      <button
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.7)' }}
                        onClick={(e) => toggleFlip(note.id, e)}
                      >
                        <RotateCw size={12} /> Foto anzeigen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE NEW NOTE MODAL */}
      {isAddNoteOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddNoteOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="card-header" style={{ marginBottom: 16 }}>
              <h2 className="card-title">Neue Notiz / Foto anheften</h2>
              <button className="icon-circle-btn" onClick={() => setIsAddNoteOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="form-group">
                <label className="form-label">Titel</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="z. B. Ausflug am Sonntag, WLAN Code..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Inhalt (Notiztext)</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="Schreibe hier deine Erinnerung oder den Text zum Foto..."
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  required
                />
              </div>

              {/* Photo Upload for Note */}
              <div className="form-group">
                <label className="form-label">Optionales Foto anheften (Polaroid-Effekt)</label>
                
                {newPhoto ? (
                  <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 10 }}>
                    <img src={newPhoto} alt="Vorschau" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
                    <button
                      type="button"
                      className="icon-circle-btn"
                      style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: 'white', width: 24, height: 24 }}
                      onClick={() => setNewPhoto(null)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', gap: 6 }}>
                    <Upload size={16} /> Foto wählen / aufnehmen
                    <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setNewPhoto)} style={{ display: 'none' }} />
                  </label>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Zettelfarbe wählen</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {NOTE_COLORS.map(col => (
                    <div
                      key={col}
                      onClick={() => setNewColor(col)}
                      style={{
                        width: 32, height: 32, borderRadius: '50%', background: col, cursor: 'pointer',
                        border: `3px solid ${newColor === col ? '#1e2923' : 'transparent'}`
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={newIsShared}
                    onChange={e => setNewIsShared(e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span>🤝 Geteilt (auch bei Oma & Opa anzeigen)</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Notiz Anheften
                </button>
                <button type="button" className="btn-secondary" onClick={() => setIsAddNoteOpen(false)}>
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT NOTE MODAL */}
      {editingNote && (
        <div className="modal-backdrop" onClick={() => setEditingNote(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="card-header" style={{ marginBottom: 16 }}>
              <h2 className="card-title">Notiz bearbeiten</h2>
              <button className="icon-circle-btn" onClick={() => setEditingNote(null)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label className="form-label">Titel</label>
                <input
                  type="text"
                  className="form-input"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Inhalt</label>
                <textarea
                  className="form-textarea"
                  rows="4"
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Foto bearbeiten / ersetzen</label>
                {editPhoto ? (
                  <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 10 }}>
                    <img src={editPhoto} alt="Vorschau" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
                    <button
                      type="button"
                      className="icon-circle-btn"
                      style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: 'white', width: 24, height: 24 }}
                      onClick={() => setEditPhoto(null)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', gap: 6 }}>
                    <Upload size={16} /> Foto hochladen
                    <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, setEditPhoto)} style={{ display: 'none' }} />
                  </label>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Farbe wählen</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {NOTE_COLORS.map(col => (
                    <div
                      key={col}
                      onClick={() => setEditColor(col)}
                      style={{
                        width: 32, height: 32, borderRadius: '50%', background: col, cursor: 'pointer',
                        border: `3px solid ${editColor === col ? '#1e2923' : 'transparent'}`
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={editIsShared}
                    onChange={e => setEditIsShared(e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span>🤝 Geteilt (auch bei Oma & Opa anzeigen)</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Änderungen Speichern
                </button>
                <button type="button" className="btn-secondary" onClick={() => setEditingNote(null)}>
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
