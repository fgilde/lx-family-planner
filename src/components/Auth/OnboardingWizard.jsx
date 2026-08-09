import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  Plus,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound
} from 'lucide-react';
import { FUNNY_COMIC_AVATARS, useFamily } from '../../context/FamilyContext';
import {
  POSITION_OPTIONS,
  canManageFamily,
  getPositionOption,
  getPositionOptionLabel,
  roleForPosition
} from '../../constants/roles';
import { PRODUCT_NAME } from '../../../shared/brand.js';
import { getStoredServerUrl, isCapacitorNative } from '../../utils/apiConfig';

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
    birthDate: '',
    pin: ''
  };
}

export default function OnboardingWizard({
  onComplete,
  onBack,
  onOpenServerConfig
}) {
  const { t } = useTranslation('auth');
  const { registerFamily, publicAccess } = useFamily();
  const [step, setStep] = useState(1);
  const [familyName, setFamilyName] = useState('');
  const [badge, setBadge] = useState(() => t('onboarding.badgeDefault'));
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [members, setMembers] = useState([emptyMember(0)]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const nativeApp = isCapacitorNative();
  const serverAddress = nativeApp
    ? getStoredServerUrl() || t('chrome:serverConfig.urlPlaceholder')
    : window.location.origin;
  const managingMembers = useMemo(
    () => members.filter(canManageFamily),
    [members]
  );
  const hasAdminProfile = managingMembers.length > 0;

  const canContinue = useMemo(() => {
    if (step === 1) {
      return Boolean(
        familyName.trim() &&
        password.length >= 10 &&
        (
          !publicAccess?.registration?.requiresInvite ||
          inviteCode.trim()
        )
      );
    }
    if (step === 2) {
      return (
        members.length > 0 &&
        members.every(member => member.name.trim()) &&
        hasAdminProfile
      );
    }
    return true;
  }, [familyName, hasAdminProfile, inviteCode, members, password, publicAccess, step]);

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
        inviteCode: inviteCode.trim() || undefined,
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
          <ArrowLeft size={18} /> {t('common:actions.back')}
        </button>
        <div className="auth-brand">
          <span className="auth-brand-mark">LX</span>
          <span>{PRODUCT_NAME}</span>
        </div>
        <span className="onboarding-step">
          {t('onboarding.stepIndicator', { step, total: 3 })}
        </span>
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
            <span className="eyebrow">{t('onboarding.step1.eyebrow')}</span>
            <h1>{t('onboarding.step1.title')}</h1>
            <p>{t('onboarding.step1.description')}</p>
            <aside className="onboarding-server-summary">
              <span className="onboarding-server-icon"><Server size={19} /></span>
              <span>
                <strong>{t('chrome:serverConfig.title')}</strong>
                <small>{t('chrome:serverConfig.subtitle')}</small>
                <code>{serverAddress}</code>
              </span>
              {nativeApp && onOpenServerConfig && (
                <button type="button" onClick={onOpenServerConfig}>
                  {t('chrome:serverConfig.urlLabel')}
                </button>
              )}
            </aside>
            <div className="onboarding-fields">
              <label className="auth-field">
                <span>{t('onboarding.step1.familyNameLabel')}</span>
                <input
                  value={familyName}
                  onChange={event => setFamilyName(event.target.value)}
                  placeholder={t('onboarding.step1.familyNamePlaceholder')}
                  autoFocus
                  maxLength={100}
                />
              </label>
              <label className="auth-field">
                <span>{t('onboarding.step1.badgeLabel')}</span>
                <input
                  value={badge}
                  onChange={event => setBadge(event.target.value)}
                  placeholder={t('onboarding.step1.badgePlaceholder')}
                  maxLength={60}
                />
              </label>
              <label className="auth-field">
                <span>{t('onboarding.step1.passwordLabel')}</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder={t('onboarding.step1.passwordPlaceholder')}
                  maxLength={100}
                  aria-invalid={password.length > 0 && password.length < 10}
                />
              </label>
              {password.length > 0 && password.length < 10 && (
                <p className="onboarding-field-hint" role="alert">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{t('onboarding.step1.passwordTooShort')}</span>
                </p>
              )}
              {publicAccess?.registration?.requiresInvite && (
                <>
                  <label className="auth-field">
                    <span>{t('onboarding.step1.inviteCodeLabel')}</span>
                    <input
                      type="password"
                      autoComplete="one-time-code"
                      value={inviteCode}
                      onChange={event => setInviteCode(event.target.value)}
                      placeholder={t('onboarding.step1.inviteCodePlaceholder')}
                      maxLength={200}
                      aria-invalid={inviteCode.length === 0}
                    />
                  </label>
                  {inviteCode.length === 0 && (
                    <p className="onboarding-field-hint" role="alert">
                      <AlertCircle size={16} aria-hidden="true" />
                      <span>{t('onboarding.step1.inviteRequired')}</span>
                    </p>
                  )}
                </>
              )}
              <div className="privacy-note">
                <ShieldCheck size={18} />
                <span>{t('onboarding.step1.privacyNote')}</span>
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="onboarding-card onboarding-card-large">
            <span className="eyebrow">{t('onboarding.step2.eyebrow')}</span>
            <h1>{t('onboarding.step2.title')}</h1>
            <p>{t('onboarding.step2.description')}</p>

            <div
              className={`onboarding-admin-note ${hasAdminProfile ? 'is-ready' : 'is-missing'}`}
              id="onboarding-admin-requirement"
              role={hasAdminProfile ? 'status' : 'alert'}
            >
              <ShieldCheck size={21} />
              <span>
                <strong>
                  {hasAdminProfile
                    ? t('onboarding.step2.adminReadyTitle')
                    : t('onboarding.step2.adminRequiredTitle')}
                </strong>
                <small>
                  {hasAdminProfile
                    ? t('onboarding.step2.adminReadyDescription', {
                        names: managingMembers.map(member => member.name).filter(Boolean).join(', ') ||
                          t('onboarding.step2.adminProfileFallback')
                      })
                    : t('onboarding.step2.adminRequiredDescription')}
                </small>
              </span>
            </div>

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
                        <span>{t('common:labels.name')}</span>
                        <input
                          value={member.name}
                          onChange={event =>
                            updateDraftMember(member.id, {
                              name: event.target.value
                            })
                          }
                          placeholder={
                            index === 0
                              ? t('onboarding.step2.firstNamePlaceholder')
                              : t('common:labels.name')
                          }
                          maxLength={80}
                        />
                      </label>
                      <label className="auth-field">
                        <span>{t('onboarding.step2.positionLabel')}</span>
                        <select
                          value={member.position}
                          aria-describedby="onboarding-admin-requirement"
                          onChange={event =>
                            changePosition(member.id, event.target.value)
                          }
                        >
                          {POSITION_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.emoji} {getPositionOptionLabel(option)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="auth-field">
                        <span>{t('onboarding.step2.birthDateLabel')}</span>
                        <input
                          type="date"
                          value={member.birthDate}
                          max={new Date().toISOString().slice(0, 10)}
                          onInput={event =>
                            updateDraftMember(member.id, {
                              birthDate: event.currentTarget.value
                            })
                          }
                          onChange={event =>
                            updateDraftMember(member.id, {
                              birthDate: event.target.value
                            })
                          }
                        />
                      </label>
                      <label className="auth-field">
                        <span>{t('onboarding.step2.pinLabel')}</span>
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
                          placeholder={t('onboarding.step2.pinPlaceholder')}
                          maxLength={12}
                        />
                      </label>
                    </div>
                    {members.length > 1 && (
                      <button
                        type="button"
                        className="member-remove"
                        aria-label={t('onboarding.step2.removeMemberAria', {
                          name:
                            member.name ||
                            t('onboarding.step2.memberFallbackName')
                        })}
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
              <Plus size={18} /> {t('onboarding.step2.addMember')}
            </button>
          </section>
        )}

        {step === 3 && (
          <section className="onboarding-card">
            <span className="onboarding-illustration">✨</span>
            <span className="eyebrow">{t('onboarding.step3.eyebrow')}</span>
            <h1>{t('onboarding.step3.title', { familyName })}</h1>
            <p>{t('onboarding.step3.description')}</p>
            <div className="onboarding-summary">
              <div>
                <Heart size={20} />
                <span><strong>{familyName}</strong><small>{badge}</small></span>
              </div>
              <div>
                <UserRound size={20} />
                <span>
                  <strong>
                    {t('onboarding.step3.profileCount', {
                      count: members.length
                    })}
                  </strong>
                  <small>
                    {members.map(member => member.name).join(', ')}
                  </small>
                </span>
              </div>
              <div>
                <Sparkles size={20} />
                <span>
                  <strong>{t('onboarding.step3.childModeTitle')}</strong>
                  <small>{t('onboarding.step3.childModeDescription')}</small>
                </span>
              </div>
            </div>
            {error && <div className="auth-error">{error}</div>}
          </section>
        )}
      </main>

      <footer className="onboarding-footer">
        <span>
          {step === 1 && t('onboarding.footer.step1')}
          {step === 2 && t('onboarding.footer.step2')}
          {step === 3 && t('onboarding.footer.step3')}
        </span>
        <button
          type="button"
          className="auth-primary"
          disabled={!canContinue || loading}
          onClick={next}
        >
          {loading
            ? t('onboarding.creating')
            : step === 3
              ? t('onboarding.openFamilySpace')
              : t('common:actions.next')}
          {!loading && (step === 3 ? <Check size={18} /> : <ArrowRight size={18} />)}
        </button>
      </footer>
    </div>
  );
}
