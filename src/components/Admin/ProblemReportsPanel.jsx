import React, { useEffect, useState } from 'react';
import {
  Bug,
  Check,
  ClipboardCopy,
  Inbox,
  LoaderCircle,
  RotateCcw
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';

const CATEGORY_LABELS = {
  problem: 'Problem',
  content: 'Inhalt',
  idea: 'Idee'
};

export default function ProblemReportsPanel() {
  const {
    fetchProblemReports,
    updateProblemReport,
    members,
    showToast
  } = useFamily();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const load = async () => {
    setLoading(true);
    const result = await fetchProblemReports();
    if (result) setReports(result);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleStatus = async report => {
    setBusy(report.id);
    const updated = await updateProblemReport(
      report.id,
      report.status === 'open' ? 'resolved' : 'open'
    );
    setBusy('');
    if (updated) {
      setReports(previous =>
        previous.map(item => item.id === updated.id ? updated : item)
      );
    }
  };

  const copy = async report => {
    const member = members.find(item => item.id === report.memberId);
    const text = [
      `[${CATEGORY_LABELS[report.category] || 'Meldung'}] ${report.title}`,
      report.description,
      `Profil: ${member?.name || 'Unbekannt'}`,
      `Bereich: ${report.page || '–'}`,
      `Version: ${report.appVersion || '–'}`,
      `Gerät: ${report.clientInfo || '–'}`
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      showToast(
        'Meldung kopiert',
        'Du kannst sie jetzt direkt in GitHub oder eine Nachricht einfügen.',
        'success'
      );
    } catch {
      showToast(
        'Kopieren nicht möglich',
        'Der Browser hat den Zugriff auf die Zwischenablage blockiert.',
        'warning'
      );
    }
  };

  const openReports = reports.filter(report => report.status === 'open');

  return (
    <section className="admin-panel problem-reports-panel">
      <header className="admin-panel-header">
        <div>
          <span className="admin-section-kicker">Rückmeldungen aus der App</span>
          <h2><Bug size={21} /> Problemmeldungen</h2>
        </div>
        <button type="button" className="admin-text-button" onClick={load}>
          {loading
            ? <LoaderCircle className="spin" size={16} />
            : <RotateCcw size={16} />}
          Aktualisieren
        </button>
      </header>
      <p className="admin-panel-intro">
        Meldungen bleiben auf eurem Server. Mit „Kopieren“ lassen sie sich
        vollständig und ohne Zugangsdaten weitergeben.
      </p>
      {loading ? (
        <div className="admin-inline-empty">
          <LoaderCircle className="spin" size={18} /> Meldungen werden geladen …
        </div>
      ) : reports.length ? (
        <div className="problem-report-list">
          {reports.slice(0, 20).map(report => {
            const member = members.find(item => item.id === report.memberId);
            return (
              <article
                key={report.id}
                className={report.status === 'resolved' ? 'resolved' : ''}
              >
                <header>
                  <span>{CATEGORY_LABELS[report.category] || 'Meldung'}</span>
                  <time>
                    {new Date(report.createdAt).toLocaleString('de-DE')}
                  </time>
                </header>
                <strong>{report.title}</strong>
                <p>{report.description}</p>
                <small>
                  {member?.name || 'Unbekannt'} · {report.page || 'App'}
                  {' · '}v{report.appVersion}
                </small>
                <footer>
                  <button type="button" onClick={() => copy(report)}>
                    <ClipboardCopy size={14} /> Kopieren
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleStatus(report)}
                    disabled={busy === report.id}
                  >
                    {report.status === 'open'
                      ? <><Check size={14} /> Erledigt</>
                      : <><RotateCcw size={14} /> Wieder öffnen</>}
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="admin-managed-empty">
          <Inbox size={24} />
          <span>
            <strong>Keine Meldungen offen</strong>
            <small>Hier ist im Moment alles ruhig.</small>
          </span>
        </div>
      )}
      {openReports.length > 0 && (
        <span className="problem-open-count">
          {openReports.length} offen
        </span>
      )}
    </section>
  );
}
