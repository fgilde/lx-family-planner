import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  HeartHandshake,
  KeyRound,
  LockKeyhole,
  Plus,
  ShieldCheck,
  Sparkles,
  Users
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import { getPositionLabel } from '../../constants/roles';
import {
  DEFAULT_FAMILY_AVATAR,
  handleImgError
} from '../../utils/imageFallback';

export default function FamilyLoginScreen({ onStartOnboarding }) {
  const {
    authStatus,
    familiesList,
    familyAccount,
    members,
    loginFamily,
    selectMemberProfile,
    logout
  } = useFamily();
  const [selectedFamilyId, setSelectedFamilyId] = useState(null);
  const [password, setPassword] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedFamily = useMemo(
    () => familiesList.find(family => family.id === selectedFamilyId),
    [familiesList, selectedFamilyId]
  );
  const selectedMember = members.find(member => member.id === selectedMemberId);
  const isProfileStep = authStatus === 'profile-required';

  const handleFamilyLogin = async event => {
    event.preventDefault();
    if (!selectedFamilyId) return;
    setError('');
    setLoading(true);
    try {
      await loginFamily(selectedFamilyId, password);
      setPassword('');
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileLogin = async event => {
    event.preventDefault();
    if (!selectedMemberId) return;
    setError('');
    setLoading(true);
    try {
      await selectMemberProfile(selectedMemberId, pin);
    } catch (profileError) {
      setError(profileError.message);
    } finally {
      setLoading(false);
    }
  };

  const chooseProfile = async member => {
    setSelectedMemberId(member.id);
    setPin('');
    setError('');
    if (member.hasPin) return;
    setLoading(true);
    try {
      await selectMemberProfile(member.id, '');
    } catch (profileError) {
      setError(profileError.message);
    } finally {
      setLoading(false);
    }
  };

  if (isProfileStep) {
    return (
      <div className="auth-shell">
        <section className="auth-story-panel">
          <div className="auth-brand">
            <span className="auth-brand-mark">LX</span>
            <span>Family Planner</span>
          </div>
          <div className="auth-story-copy">
            <span className="eyebrow">Willkommen zu Hause</span>
            <h1>Wer plant heute mit?</h1>
            <p>
              Jedes Profil bekommt seine eigene Startseite – klar für Erwachsene,
              spielerisch für Kinder.
            </p>
          </div>
          <div className="auth-family-portrait">
            <img
              src={familyAccount?.familyAvatar || DEFAULT_FAMILY_AVATAR}
              onError={handleImgError}
              alt=""
            />
            <div>
              <strong>{familyAccount?.familyName}</strong>
              <span>{members.length} Profile verbunden</span>
            </div>
          </div>
        </section>

        <main className="auth-action-panel">
          <button className="auth-back" type="button" onClick={logout}>
            <ArrowLeft size={18} /> Andere Familie
          </button>
          <div className="auth-card auth-card-wide">
            <div className="auth-card-heading">
              <div className="auth-icon"><Users size={24} /></div>
              <div>
                <span className="eyebrow">Profil wählen</span>
                <h2>Das bin ich</h2>
              </div>
            </div>

            <form onSubmit={handleProfileLogin}>
              <div className="profile-choice-grid">
                {members.map(member => (
                  <button
                    type="button"
                    key={member.id}
                    className={`profile-choice ${
                      selectedMemberId === member.id ? 'selected' : ''
                    }`}
                    style={{ '--member-color': member.color || '#2563eb' }}
                    onClick={() => chooseProfile(member)}
                    disabled={loading}
                    aria-label={`${member.name}, ${getPositionLabel(member)} auswählen`}
                  >
                    <span className="profile-choice-avatar">
                      <img
                        src={member.avatar || DEFAULT_FAMILY_AVATAR}
                        onError={handleImgError}
                        alt=""
                      />
                    </span>
                    <strong>{member.name}</strong>
                    <span>{getPositionLabel(member)}</span>
                    {member.hasPin && <LockKeyhole size={14} />}
                  </button>
                ))}
              </div>

              {selectedMember?.hasPin && (
                <label className="auth-field">
                  <span>Profil-PIN</span>
                  <div className="auth-input-wrap">
                    <KeyRound size={18} />
                    <input
                      type="password"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      maxLength={12}
                      value={pin}
                      onChange={event => setPin(event.target.value)}
                      placeholder="PIN eingeben"
                      autoFocus
                    />
                  </div>
                </label>
              )}

              {error && <div className="auth-error">{error}</div>}
              {selectedMember?.hasPin ? (
                <button
                  className="auth-primary"
                  disabled={!pin || loading}
                  type="submit"
                >
                  {loading ? 'Profil wird geöffnet …' : `${selectedMember.name} öffnen`}
                  {!loading && <ArrowRight size={18} />}
                </button>
              ) : (
                <p className="profile-choice-hint">
                  {loading
                    ? 'Dein Profil wird geöffnet …'
                    : 'Tippe einfach auf dein Bild.'}
                </p>
              )}
            </form>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <section className="auth-story-panel">
        <div className="auth-brand">
          <span className="auth-brand-mark">LX</span>
          <span>Family Planner</span>
        </div>
        <div className="auth-story-copy">
          <span className="eyebrow">Weniger Chaos. Mehr Wir.</span>
          <h1>Der gemeinsame Takt für eure Familie.</h1>
          <p>
            Termine, Einkäufe, Essen, Aufgaben und kleine Glücksmomente –
            an einem ruhigen Ort für alle Generationen.
          </p>
        </div>
        <div className="auth-proof-row">
          <span><ShieldCheck size={17} /> Privat</span>
          <span><HeartHandshake size={17} /> Familiennah</span>
          <span><Sparkles size={17} /> Kinderleicht</span>
        </div>
      </section>

      <main className="auth-action-panel">
        <div className="auth-card auth-card-wide">
          <div className="auth-card-heading">
            <div className="auth-icon"><Users size={24} /></div>
            <div>
              <span className="eyebrow">Familie auswählen</span>
              <h2>Schön, dass ihr da seid.</h2>
            </div>
          </div>

          <form onSubmit={handleFamilyLogin}>
            <div className="family-choice-grid">
              {familiesList.map(family => (
                <button
                  type="button"
                  key={family.id}
                  className={`family-choice ${
                    selectedFamilyId === family.id ? 'selected' : ''
                  }`}
                  onClick={() => {
                    setSelectedFamilyId(family.id);
                    setError('');
                  }}
                >
                  <img
                    src={family.familyAvatar || DEFAULT_FAMILY_AVATAR}
                    onError={handleImgError}
                    alt=""
                  />
                  <span>
                    <strong>{family.familyName}</strong>
                    <small>
                      {family.badge || 'Familie'} · {family.membersCount || 0} Profile
                    </small>
                  </span>
                </button>
              ))}
            </div>

            {selectedFamily && (
              <label className="auth-field">
                <span>Familienpasswort für {selectedFamily.familyName}</span>
                <div className="auth-input-wrap">
                  <KeyRound size={18} />
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    placeholder="Familienpasswort"
                    autoFocus
                  />
                </div>
              </label>
            )}

            {error && <div className="auth-error">{error}</div>}
            <button
              className="auth-primary"
              disabled={!selectedFamilyId || !password || loading}
              type="submit"
            >
              {loading ? 'Anmeldung läuft …' : 'Weiter zu den Profilen'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="auth-divider"><span>oder</span></div>
          <button
            type="button"
            className="auth-secondary"
            onClick={onStartOnboarding}
          >
            <Plus size={18} /> Neue Familie anlegen
          </button>
        </div>
      </main>
    </div>
  );
}
