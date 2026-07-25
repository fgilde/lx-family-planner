import React, { useState } from 'react';
import { useFamily } from '../../context/FamilyContext';
import { Calendar as CalendarIcon, Download, Upload, Plus, Trash2, MapPin, Clock, Filter, User } from 'lucide-react';

export default function CalendarView() {
  const {
    events, addEvent, deleteEvent, members, exportICS, importICS,
    setIsQuickAddOpen, setQuickAddDefaultType, activeHousehold
  } = useFamily();

  const [viewMode, setViewMode] = useState('list'); // 'list', 'month'
  const [selectedMemberFilter, setSelectedMemberFilter] = useState('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  const filteredEvents = events.filter(evt => {
    if ((evt.household || 'familie') !== activeHousehold) return false;
    if (selectedMemberFilter !== 'all' && evt.memberId !== selectedMemberFilter) return false;
    if (selectedCategoryFilter !== 'all' && evt.category !== selectedCategoryFilter) return false;
    return true;
  }).sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`));

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      importICS(file);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header Bar */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CalendarIcon size={24} style={{ color: 'var(--primary)' }} />
            <h2 className="card-title" style={{ margin: 0 }}>Familienkalender</h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* ICS Export Button */}
            <button className="btn-secondary" onClick={exportICS} title="Kalender als .ics exportieren">
              <Download size={16} />
              <span>ICS Export</span>
            </button>

            {/* ICS Import Button */}
            <label className="btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Upload size={16} />
              <span>ICS Import</span>
              <input type="file" accept=".ics" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>

            {/* Add Event Button */}
            <button
              className="btn-primary"
              onClick={() => { setQuickAddDefaultType('event'); setIsQuickAddOpen(true); }}
            >
              <Plus size={18} />
              <span>Neuer Termin</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Member Filter Pills */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
            <button
              className={`cat-pill ${selectedMemberFilter === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedMemberFilter('all')}
            >
              Alle Personen
            </button>
            {members.map(m => (
              <button
                key={m.id}
                className={`cat-pill ${selectedMemberFilter === m.id ? 'active' : ''}`}
                style={{
                  borderColor: selectedMemberFilter === m.id ? m.color : 'var(--border-color)',
                  color: selectedMemberFilter === m.id ? 'white' : 'var(--text-main)',
                  backgroundColor: selectedMemberFilter === m.id ? m.color : 'var(--bg-subtle)'
                }}
                onClick={() => setSelectedMemberFilter(m.id)}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Events List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filteredEvents.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            📅 Keine Termine in dieser Filteransicht gefunden.
          </div>
        ) : (
          filteredEvents.map(evt => {
            const member = members.find(m => m.id === evt.memberId);
            const evtDate = new Date(evt.date);
            const formattedDateStr = evtDate.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

            return (
              <div
                key={evt.id}
                className="card"
                style={{
                  padding: 18,
                  borderLeft: `6px solid ${member?.color || 'var(--primary)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {/* Date Badge */}
                  <div style={{
                    background: member?.bgColor || 'var(--primary-light)',
                    color: member?.color || 'var(--primary)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 14px',
                    textAlign: 'center',
                    minWidth: 90
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase' }}>
                      {formattedDateStr.split(',')[0]}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                      {evt.date.split('-')[2]}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                      {evt.time} Uhr
                    </div>
                  </div>

                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>
                      {evt.title}
                    </h3>
                    <div style={{ display: 'flex', gap: 12, fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      {evt.location && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MapPin size={14} /> {evt.location}
                        </span>
                      )}
                      {evt.notes && (
                        <span>📝 {evt.notes}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {member ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <img src={member.avatar} alt={member.name} className="avatar-img-sm" />
                      <span className="hide-mobile" style={{ fontWeight: 600, fontSize: '0.9rem' }}>{member.name}</span>
                    </div>
                  ) : (
                    <span className="badge" style={{ background: 'var(--bg-subtle)' }}>Gemeinsam</span>
                  )}

                  <button
                    className="icon-circle-btn"
                    onClick={() => deleteEvent(evt.id)}
                    title="Termin löschen"
                    style={{ color: '#ef4444' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
