import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound
} from 'lucide-react';
import { FUNNY_COMIC_AVATARS, useFamily } from '../../context/FamilyContext';
import {
  POSITION_OPTIONS,
  getPositionOption,
  roleForPosition
} from '../../constants/roles';

const MEMBER_COLORS = [
  '#246B58',
  '#E06B4F',
  '#E0A52E',
  '#3767A6',
  '#8A5BB7',
  '#D45D87'
];

function emptyMember(index = 0) {
  const position = index === 0 ? 'mama' : 'kind';
  return {
    id: `draft-${Date.now()}-${index}`,
    name: '',
    position,
    role: roleForPosition(position),
    avatar: FUNNY_COMIC_AVATARS[index % FUNNY_COMIC_AVATARS.length].url,
    color: MEMBER_COLORS[index % MEMBER_COLORS.length],
    bgColor: '#F4F1E8',
    theme: roleForPosition(position) === 'child' ? 'adventure' : 'light',
    pin: ''
  };
}

export default function OnboardingWizard({ onComplete, onBack }) {
  const { registerFamily } = useFamily();
  const [step, setStep] = useState(1);
  const [familyName, setFamilyName] = useState('');
  const [badge, setBadge] = useState('Unsere Familie');
  const [password, setPassword] = useState('');
  const [members, setMembers] = useState([emptyMember(0)]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canContinue = useMemo(() => {
    if (step === 1) return familyName.trim() && password.length >= 4;
    if (step === 2) return members.length > 0 && members.every(member => member.name.trim());
    return true;
  }, [familyName, members, password, step]);

  const updateDraftMember = (id, changes) => {
    setMembers(previous =>
      previous.map(member =>
        member.id === id ? { ...member, ...changes } : member
      )
    );
  };

  const changePosition = (id, position) => {
    const role = roleForPosition(position);
    updateDraftMember(id, {
      position,
      role,
      theme: role === 'child' ? 'adventure' : 'light'
    });
  };

  const addDraftMember = () => {
    setMembers(previous => [...previous, emptyMember(previous.length)]);
  };

  const finish = async () => {
    setError('');
    setLoading(true);
    try {
      await registerFamily({
        familyName,
        badge,
        password,
        members: members.map(({ id, ...member }) => member)
      });
      onComplete?.();
    } catch (registrationError) {
      setError(registrationError.message);
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    setError('');
    if (step < 3) setStep(current => current + 1);
    else finish();
  };

  return (
    <div className="onboarding-shell">
      <header className="onboarding-topbar">
        <button
          type="button"
          className="auth-back"
          onClick={() => (step === 1 ? onBack?.() : setStep(step - 1))}
        >
          <ArrowLeft size={18} /> Zurück
        </button>
        <div className="auth-brand">
          <span className="auth-brand-mark">LX</span>
          <span>Family Planner</span>
        </div>
        <span className="onboarding-step">Schritt {step} von 3</span>
      </header>

      <div className="onboarding-progress" aria-hidden="true">
        <span className={step >= 1 ? 'active' : ''} />
        <span className={step >= 2 ? 'active' : ''} />
        <span className={step >= 3 ? 'active' : ''} />
      </div>

      <main className="onboarding-content">
        {step === 1 && (
          <section className="onboarding-card">
            <span className="onboarding-illustration">🏡</span>
            <span className="eyebrow">Euer gemeinsamer Ort</span>
            <h1>Wie heißt eure Familie?</h1>
            <p>
              Der Familienname erscheint auf dem Startbildschirm. Das Passwort
              schützt euren privaten Raum.
            </p>
            <div className="onboarding-fields">
              <label className="auth-field">
                <span>Familienname</span>
                <input
                  value={familyName}
                  onChange={event => setFamilyName(event.target.value)}
                  placeholder="z. B. Familie Testname"
                  autoFocus
                  maxLength={100}
                />
              </label>
              <label className="auth-field">
                <span>Kurzer Zusatz</span>
                <input
                  value={badge}
                  onChange={event => setBadge(event.target.value)}
                  placeholder="z. B. Unser Zuhause"
                  maxLength={60}
                />
              </label>
              <label className="auth-field">
                <span>Familienpasswort</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="Mindestens 4 Zeichen"
                  maxLength={100}
                />
              </label>
              <div className="privacy-note">
                <ShieldCheck size={18} />
                <span>
                  Das Passwort wird verschlüsselt gespeichert und nie in der
                  Familienübersicht angezeigt.
                </span>
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="onboarding-card onboarding-card-large">
            <span className="eyebrow">Wer gehört dazu?</span>
            <h1>Gebt jedem einen Namen und seine Position.</h1>
            <p>
              Mama, Papa, Kind, Oma, Opa und mehr: Daraus entsteht automatisch
              die passende Ansicht und Berechtigung.
            </p>

            <div className="member-builder-list">
              {members.map((member, index) => {
                const position = getPositionOption(member.position);
                return (
                  <article className="member-builder" key={member.id}>
                    <div
                      className="member-builder-avatar"
                      style={{ '--member-color': member.color }}
                    >
                      <img src={member.avatar} alt="" />
                      <span>{position.emoji}</span>
                    </div>
                    <div className="member-builder-fields">
                      <label className="auth-field">
                        <span>Name</span>
                        <input
                          value={member.name}
                          onChange={event =>
                            updateDraftMember(member.id, {
                              name: event.target.value
                            })
                          }
                          placeholder={index === 0 ? 'Testname' : 'Name'}
                          maxLength={80}
                        />
                      </label>
                      <label className="auth-field">
                        <span>Position in der Familie</span>
                        <select
                          value={member.position}
                          onChange={event =>
                            changePosition(member.id, event.target.value)
                          }
                        >
                          {POSITION_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.emoji} {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="auth-field">
                        <span>Profil-PIN (optional)</span>
                        <input
                          type="password"
                          autoComplete="new-password"
                          inputMode="numeric"
                          value={member.pin}
                          onChange={event =>
                            updateDraftMember(member.id, {
                              pin: event.target.value
                            })
                          }
                          placeholder="Nur für dieses Profil"
                          maxLength={12}
                        />
                      </label>
                    </div>
                    {members.length > 1 && (
                      <button
                        type="button"
                        className="member-remove"
                        aria-label={`${member.name || 'Profil'} entfernen`}
                        onClick={() =>
                          setMembers(previous =>
                            previous.filter(entry => entry.id !== member.id)
                          )
                        }
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
            <button
              type="button"
              className="auth-secondary member-add"
              onClick={addDraftMember}
            >
              <Plus size={18} /> Weiteres Familienmitglied
            </button>
          </section>
        )}

        {step === 3 && (
          <section className="onboarding-card">
            <span className="onboarding-illustration">✨</span>
            <span className="eyebrow">Alles bereit</span>
            <h1>{familyName}, euer Familienraum kann starten.</h1>
            <p>
              Profile, Rollen und Privatsphäre sind eingerichtet. Inhalte könnt
              ihr ab jetzt gemeinsam ergänzen.
            </p>
            <div className="onboarding-summary">
              <div>
                <Heart size={20} />
                <span><strong>{familyName}</strong><small>{badge}</small></span>
              </div>
              <div>
                <UserRound size={20} />
                <span>
                  <strong>{members.length} Profile</strong>
                  <small>
                    {members.map(member => member.name).join(', ')}
                  </small>
                </span>
              </div>
              <div>
                <Sparkles size={20} />
                <span>
                  <strong>Kindermodus automatisch</strong>
                  <small>
                    Kinder sehen Aufgaben als Abenteuer und sammeln Sterne.
                  </small>
                </span>
              </div>
            </div>
            {error && <div className="auth-error">{error}</div>}
          </section>
        )}
      </main>

      <footer className="onboarding-footer">
        <span>
          {step === 1 && 'Startet mit eurem gemeinsamen Namen.'}
          {step === 2 && 'Position und Rolle lassen sich später ändern.'}
          {step === 3 && 'Ihr könnt direkt losplanen.'}
        </span>
        <button
          type="button"
          className="auth-primary"
          disabled={!canContinue || loading}
          onClick={next}
        >
          {loading
            ? 'Familienraum wird erstellt …'
            : step === 3
              ? 'Familienraum eröffnen'
              : 'Weiter'}
          {!loading && (step === 3 ? <Check size={18} /> : <ArrowRight size={18} />)}
        </button>
      </footer>
    </div>
  );
}
