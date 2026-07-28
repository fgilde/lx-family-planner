import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bug,
  CheckCircle2,
  Lightbulb,
  LoaderCircle,
  MessageSquareText,
  ShieldCheck,
  X
} from 'lucide-react';
import { useFamily } from '../context/FamilyContext';

const CATEGORIES = [
  { id: 'problem', label: 'Etwas funktioniert nicht', icon: Bug },
  { id: 'content', label: 'Inhalt stimmt nicht', icon: MessageSquareText },
  { id: 'idea', label: 'Ich habe eine Idee', icon: Lightbulb }
];

export default function ProblemReportButton() {
  const {
    activeTab,
    activeMember,
    appVersion,
    submitProblemReport
  } = useFamily();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('problem');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const close = event => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);

  const submit = async event => {
    event.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setBusy(true);
    const report = await submitProblemReport({
      category,
      title: title.trim(),
      description: description.trim(),
      page: `${activeTab} · ${window.location.pathname}${window.location.search}`,
      clientInfo: [
        navigator.userAgent,
        `${window.innerWidth}×${window.innerHeight}`,
        activeMember?.name ? `Profil: ${activeMember.name}` : ''
      ].filter(Boolean).join(' | ')
    });
    setBusy(false);
    if (report) {
      setSent(true);
      setTitle('');
      setDescription('');
    }
  };

  const close = () => {
    setOpen(false);
    window.setTimeout(() => setSent(false), 200);
  };

  return (
    <>
      <button
        type="button"
        className="problem-report-launcher"
        aria-label="Problem melden"
        title="Problem melden"
        onClick={() => setOpen(true)}
      >
        <Bug size={16} />
        <span>Problem melden</span>
      </button>
      {open && createPortal(
        <div className="modal-backdrop problem-report-backdrop" onClick={close}>
          <section
            className="modal-card problem-report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="problem-report-title"
            onClick={event => event.stopPropagation()}
          >
            <header>
              <span className="problem-report-icon"><Bug size={22} /></span>
              <span>
                <small>Direkter Draht</small>
                <h2 id="problem-report-title">Problem melden</h2>
              </span>
              <button
                type="button"
                className="icon-circle-btn"
                onClick={close}
                aria-label="Meldung schließen"
              >
                <X size={18} />
              </button>
            </header>

            {sent ? (
              <div className="problem-report-success">
                <CheckCircle2 size={42} />
                <h3>Danke, ist angekommen.</h3>
                <p>
                  Die Meldung liegt jetzt mit Version und Bereich in der
                  Elternzentrale. Zugangsdaten werden nicht mitgesendet.
                </p>
                <button type="button" onClick={close}>Fertig</button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div className="problem-category-grid">
                  {CATEGORIES.map(option => {
                    const Icon = option.icon;
                    return (
                      <button
                        type="button"
                        key={option.id}
                        className={category === option.id ? 'active' : ''}
                        onClick={() => setCategory(option.id)}
                      >
                        <Icon size={17} />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <label>
                  <span>Was ist kurz gesagt passiert?</span>
                  <input
                    value={title}
                    onChange={event => setTitle(event.target.value)}
                    maxLength={120}
                    placeholder="z. B. Termin lässt sich nicht löschen"
                    required
                    autoFocus
                  />
                </label>
                <label>
                  <span>Wie können wir es nachvollziehen?</span>
                  <textarea
                    value={description}
                    onChange={event => setDescription(event.target.value)}
                    maxLength={4000}
                    rows={5}
                    placeholder="Was hast du gemacht, was sollte passieren und was ist stattdessen passiert?"
                    required
                  />
                </label>
                <div className="problem-report-meta">
                  <ShieldCheck size={15} />
                  <span>
                    Gespeichert werden Bereich, Bildschirmgröße, Browsertyp
                    und Version {appVersion}. Keine Passwörter oder Tokens.
                  </span>
                </div>
                <button className="problem-report-submit" disabled={busy}>
                  {busy
                    ? <LoaderCircle className="spin" size={17} />
                    : <Bug size={17} />}
                  Meldung speichern
                </button>
              </form>
            )}
          </section>
        </div>,
        document.body
      )}
    </>
  );
}
