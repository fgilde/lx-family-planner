import React, { useState } from 'react';
import { useFamily } from '../context/FamilyContext';
import { X, Calendar, ShoppingBag, CheckSquare, Pin } from 'lucide-react';

export default function QuickAddModal() {
  const {
    isQuickAddOpen, setIsQuickAddOpen,
    quickAddDefaultType, setQuickAddDefaultType,
    members, activeMemberId,
    addEvent, addShoppingItem, addTask, addNote
  } = useFamily();

  const [type, setType] = useState(quickAddDefaultType || 'event');

  // Form states
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('14:00');
  const [memberId, setMemberId] = useState(activeMemberId);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  
  // Shopping specific
  const [category, setCategory] = useState('Obst & Gemüse');
  const [quantity, setQuantity] = useState('1 Stk');
  
  // Task specific
  const [stars, setStars] = useState(10);
  
  // Note specific
  const [noteColor, setNoteColor] = useState('#fef08a');

  if (!isQuickAddOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (type === 'event') {
      addEvent({
        title,
        date,
        time,
        memberId,
        location,
        notes,
        category: 'Allgemein'
      });
    } else if (type === 'shopping') {
      addShoppingItem({
        name: title,
        category,
        quantity,
        icon: '🛒'
      });
    } else if (type === 'task') {
      addTask({
        title,
        memberId,
        stars: Number(stars),
        category: 'Haushalt'
      });
    } else if (type === 'note') {
      addNote({
        title,
        content: notes || title,
        color: noteColor
      });
    }

    // Reset & close
    setTitle('');
    setLocation('');
    setNotes('');
    setIsQuickAddOpen(false);
  };

  return (
    <div className="modal-backdrop" onClick={() => setIsQuickAddOpen(false)}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="card-header" style={{ marginBottom: 16 }}>
          <h2 className="card-title">Schnell Hinzufügen</h2>
          <button className="icon-circle-btn" onClick={() => setIsQuickAddOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Type Selector Pills */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }}>
          <button
            className={`cat-pill ${type === 'event' ? 'active' : ''}`}
            onClick={() => setType('event')}
          >
            <Calendar size={16} /> Termin
          </button>
          <button
            className={`cat-pill ${type === 'shopping' ? 'active' : ''}`}
            onClick={() => setType('shopping')}
          >
            <ShoppingBag size={16} /> Einkauf
          </button>
          <button
            className={`cat-pill ${type === 'task' ? 'active' : ''}`}
            onClick={() => setType('task')}
          >
            <CheckSquare size={16} /> Aufgabe
          </button>
          <button
            className={`cat-pill ${type === 'note' ? 'active' : ''}`}
            onClick={() => setType('note')}
          >
            <Pin size={16} /> Notiz
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              {type === 'event' && 'Termintitel'}
              {type === 'shopping' && 'Artikelname'}
              {type === 'task' && 'Aufgabe'}
              {type === 'note' && 'Notiz-Titel'}
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Eingeben..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Event Fields */}
          {type === 'event' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Datum</label>
                  <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Uhrzeit</label>
                  <input type="time" className="form-input" value={time} onChange={e => setTime(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Für wer?</label>
                <select className="form-select" value={memberId} onChange={e => setMemberId(e.target.value)}>
                  <option value="all">Alle (Gemeinsam)</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Ort (optional)</label>
                <input type="text" className="form-input" placeholder="z. B. Dr. Weber, Schule" value={location} onChange={e => setLocation(e.target.value)} />
              </div>
            </>
          )}

          {/* Shopping Fields */}
          {type === 'shopping' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Kategorie</label>
                <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="Obst & Gemüse">Obst & Gemüse</option>
                  <option value="Kühlung & Milch">Kühlung & Milch</option>
                  <option value="Bäckerei">Bäckerei</option>
                  <option value="Vorräte">Vorräte</option>
                  <option value="Getränke">Getränke</option>
                  <option value="Drogerie & Haushalt">Drogerie & Haushalt</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Menge</label>
                <input type="text" className="form-input" value={quantity} onChange={e => setQuantity(e.target.value)} />
              </div>
            </div>
          )}

          {/* Task Fields */}
          {type === 'task' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Zugewiesen an</label>
                <select className="form-select" value={memberId} onChange={e => setMemberId(e.target.value)}>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Sterne-Punkte</label>
                <input type="number" min="5" max="100" step="5" className="form-input" value={stars} onChange={e => setStars(e.target.value)} />
              </div>
            </div>
          )}

          {/* Note Fields */}
          {type === 'note' && (
            <div className="form-group">
              <label className="form-label">Notiztext</label>
              <textarea className="form-textarea" rows="3" placeholder="Inhalt eingeben..." value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button type="submit" className="btn-primary" style={{ flex: 1 }}>
              Hinzufügen
            </button>
            <button type="button" className="btn-secondary" onClick={() => setIsQuickAddOpen(false)}>
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
