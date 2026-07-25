import React, { useState } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { Trash2, Upload, Plus, Calendar, AlertTriangle, CheckCircle, Bell } from 'lucide-react';
import { parseICSContent } from '../../utils/icsUtils';

const TRASH_TYPES = [
  { id: 'rest', name: 'Restmüll (Schwarze Tonne)', color: '#374151', bgColor: '#f3f4f6', icon: '🗑️' },
  { id: 'papier', name: 'Altpapier (Blaue Tonne)', color: '#2563eb', bgColor: '#eff6ff', icon: '📦' },
  { id: 'bio', name: 'Biomüll (Braune/Grüne Tonne)', color: '#15803d', bgColor: '#f0fdf4', icon: '🍎' },
  { id: 'gelb', name: 'Gelber Sack / Wertstoff', color: '#d97706', bgColor: '#fffbe6', icon: '🟡' }
];

export const INITIAL_TRASH_EVENTS = [
  { id: 'trsh-1', title: 'Restmüll (Schwarze Tonne)', date: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0], type: 'rest' },
  { id: 'trsh-2', title: 'Altpapier (Blaue Tonne)', date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], type: 'papier' },
  { id: 'trsh-3', title: 'Biomüll (Braune Tonne)', date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], type: 'bio' },
  { id: 'trsh-4', title: 'Gelber Sack', date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0], type: 'gelb' }
];

export default function TrashCalendarView() {
  const {
    showToast,
    trashEvents,
    addTrashEvent,
    addTrashEvents,
    deleteTrashEvent,
    activeHousehold
  } = useFamily();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('Restmüll (Schwarze Tonne)');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newType, setNewType] = useState('rest');

  // Import .ics trash calendar file from local municipal service
  const handleImportTrashICS = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const parsed = parseICSContent(event.target.result);
      if (parsed.length > 0) {
        const importedTrash = parsed.map(evt => {
          const titleLower = evt.title.toLowerCase();
          let type = 'rest';
          if (titleLower.includes('papier') || titleLower.includes('blau')) type = 'papier';
          else if (titleLower.includes('bio') || titleLower.includes('braun') || titleLower.includes('grün')) type = 'bio';
          else if (titleLower.includes('gelb') || titleLower.includes('wertstoff') || titleLower.includes('sack')) type = 'gelb';

          return {
            id: `trsh-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            title: evt.title,
            date: evt.date,
            type
          };
        });

        await addTrashEvents(importedTrash);
        showToast('📥 Müllkalender Importiert', `${importedTrash.length} Abholtermine aus der .ics Datei übernommen!`, 'success');
      } else {
        showToast('⚠️ Import Fehler', 'Keine Müll-Termine in der .ics Datei gefunden.', 'warning');
      }
    };
    reader.readAsText(file);
  };

  const handleAddManual = async (e) => {
    e.preventDefault();
    const newEntry = {
      id: `trsh-${Date.now()}`,
      title: newTitle,
      date: newDate,
      type: newType
    };
    await addTrashEvent(newEntry);
    setIsAddOpen(false);
    showToast('🗑️ Mülltermin eingetragen', `Abholung für ${newDate} gespeichert.`, 'success');
  };

  const handleDelete = (id) => {
    deleteTrashEvent(id);
  };

  // Filter sorted upcoming trash dates
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingTrash = trashEvents
    .filter(
      item =>
        item.date >= todayStr &&
        (item.household || 'familie') === activeHousehold
    )
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header Bar */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Trash2 size={26} style={{ color: 'var(--text-main)' }} />
            <div>
              <h2 className="card-title" style={{ margin: 0 }}>Digitaler Müllkalender</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Verpasse keine Abholung mehr. Importiere den Jahres-Müllkalender eures Entsorgers per `.ics` Datei!
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {/* Import ICS File */}
            <label className="btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Upload size={16} /> Müllkalender (.ics) Importieren
              <input type="file" accept=".ics" onChange={handleImportTrashICS} style={{ display: 'none' }} />
            </label>

            <button className="btn-primary" onClick={() => setIsAddOpen(true)}>
              <Plus size={16} /> Termin manuell eintragen
            </button>
          </div>
        </div>
      </div>

      {/* Next Pickup Alert Card */}
      {upcomingTrash.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #1e2923, #0f1715)',
          color: 'white',
          padding: 20,
          borderRadius: 'var(--radius-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: '2.5rem' }}>
              {TRASH_TYPES.find(t => t.id === upcomingTrash[0].type)?.icon || '🗑️'}
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 800, color: '#f59e0b', letterSpacing: 1 }}>
                Nächste Müllabfuhr
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                {upcomingTrash[0].title}
              </div>
              <div style={{ fontSize: '0.95rem', opacity: 0.9, marginTop: 2 }}>
                📅 Am {new Date(upcomingTrash[0].date).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
            </div>
          </div>

          <span className="badge" style={{ background: '#f59e0b', color: '#1e2923', fontWeight: 800, fontSize: '0.9rem', padding: '8px 16px' }}>
            Tonne raustellen!
          </span>
        </div>
      )}

      {/* Upcoming Trash Schedule List */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: 16, color: 'var(--text-main)' }}>
          Anstehende Abholtermine ({upcomingTrash.length})
        </h3>

        {upcomingTrash.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
            Keine Mülltermine vorhanden. Lade eure `.ics` Datei vom Entsorgungsbetrieb hoch!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {upcomingTrash.map(item => {
              const typeObj = TRASH_TYPES.find(t => t.id === item.type) || TRASH_TYPES[0];
              const dateObj = new Date(item.date);
              const formattedDate = dateObj.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    background: typeObj.bgColor,
                    borderLeft: `6px solid ${typeObj.color}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: '1.8rem' }}>{typeObj.icon}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: typeObj.color }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        📅 {formattedDate}
                      </div>
                    </div>
                  </div>

                  <button
                    className="icon-circle-btn"
                    style={{ width: 32, height: 32, color: '#ef4444' }}
                    onClick={() => handleDelete(item.id)}
                    title="Termin entfernen"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Add Trash Modal */}
      {isAddOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddOpen(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="card-header" style={{ marginBottom: 16 }}>
              <h2 className="card-title">Mülltermin manuell eintragen</h2>
              <button className="icon-circle-btn" onClick={() => setIsAddOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddManual}>
              <div className="form-group">
                <label className="form-label">Müllart</label>
                <select
                  className="form-select"
                  value={newType}
                  onChange={e => {
                    setNewType(e.target.value);
                    const t = TRASH_TYPES.find(item => item.id === e.target.value);
                    if (t) setNewTitle(t.name);
                  }}
                >
                  {TRASH_TYPES.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Bezeichnung</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Abholdatum</label>
                <input
                  type="date"
                  className="form-input"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Termin Speichern
                </button>
                <button type="button" className="btn-secondary" onClick={() => setIsAddOpen(false)}>
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
