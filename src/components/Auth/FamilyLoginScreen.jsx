import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Github,
  HeartHandshake,
  KeyRound,
  LockKeyhole,
  Plus,
  Server,
  ShieldCheck,
  Sparkles,
  Users
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import {
  getPositionLabel,
  isManagedProfile
} from '../../constants/roles';
import {
  DEFAULT_FAMILY_AVATAR,
  handleImgError
} from '../../utils/imageFallback';
import { GITHUB_REPOSITORY_URL } from '../../constants/project';
import AndroidAppDownload from './AndroidAppDownload';
import ReleasePreviewCard from './ReleasePreviewCard';
import LanguageSwitcher from '../LanguageSwitcher';
import ProjectSupportCard from '../ProjectSupportCard';
import { PRODUCT_NAME } from '../../../shared/brand.js';

export default function FamilyLoginScreen({ onStartOnboarding, onOpenServerConfig }) {
  const { t } = useTranslation('auth');
  const {
    authStatus,
    familiesList,
    publicAccess,
    familyAccount,
    members,
    loginFamily,
    selectMemberProfile,
    logout
  } = useFamily();
  const [selectedFamilyId, setSelectedFamilyId] = useState(null);
  const [familyName, setFamilyName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedFamily = useMemo(
    () => familiesList.find(family => family.id === selectedFamilyId),
    [familiesList, selectedFamilyId]
  );
  const loginMembers = useMemo(
    () => members.filter(member => !isManagedProfile(member)),
    [members]
  );
  const managedProfilesCount = members.length - loginMembers.length;
  const selectedMember = members.find(member => member.id === selectedMemberId);
  const isProfileStep = authStatus === 'profile-required';
  const familyReference = selectedFamilyId || familyName.trim();
  const directoryEnabled = Boolean(publicAccess?.directoryEnabled);
  const registration = publicAccess?.registration || {};

  const handleFamilyLogin = async event => {
    event.preventDefault();
    if (!familyReference) return;
    setError('');
    setLoading(true);
    try {
      await loginFamily(familyReference, password);
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
        <LanguageSwitcher variant="auth" />
        <section className="auth-story-panel">
          <div className="auth-brand">
            <span className="auth-brand-mark">LX</span>
            <span>{PRODUCT_NAME}</span>
          </div>
          <div className="auth-story-copy">
            <span className="eyebrow">{t('login.profileStep.eyebrow')}</span>
            <h1>{t('login.profileStep.title')}</h1>
            <p>{t('login.profileStep.description')}</p>
          </div>
          <div className="auth-family-portrait">
            <img
              src={familyAccount?.familyAvatar || DEFAULT_FAMILY_AVATAR}
              onError={handleImgError}
              alt=""
            />
            <div>
              <strong>{familyAccount?.familyName}</strong>
              <span>
                {t('login.profileStep.profilesWithAccess', {
                  count: loginMembers.length
                })}
                {managedProfilesCount > 0
                  ? t('login.profileStep.managedSuffix', {
                      count: managedProfilesCount
                    })
                  : ''}
              </span>
            </div>
          </div>
        </section>

        <main className="auth-action-panel">
          <button className="auth-back" type="button" onClick={logout}>
            <ArrowLeft size={18} /> {t('login.profileStep.otherFamily')}
          </button>
          <div className="auth-card auth-card-wide">
            <div className="auth-card-heading">
              <div className="auth-icon"><Users size={24} /></div>
              <div>
                <span className="eyebrow">{t('login.profileStep.chooseEyebrow')}</span>
                <h2>{t('login.profileStep.chooseTitle')}</h2>
              </div>
            </div>

            <form onSubmit={handleProfileLogin}>
              <div className="profile-choice-grid">
                {loginMembers.map(member => (
                  <button
                    type="button"
                    key={member.id}
                    className={`profile-choice ${
                      selectedMemberId === member.id ? 'selected' : ''
                    }`}
                    style={{ '--member-color': member.color || '#2563eb' }}
                    onClick={() => chooseProfile(member)}
                    disabled={loading}
                    aria-label={t('login.profileStep.selectProfileAria', {
                      name: member.name,
                      position: getPositionLabel(member)
                    })}
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
                  <span>{t('login.profileStep.pinLabel')}</span>
                  <div className="auth-input-wrap">
                    <KeyRound size={18} />
                    <input
                      type="password"
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      maxLength={12}
                      value={pin}
                      onChange={event => setPin(event.target.value)}
                      placeholder={t('login.profileStep.pinPlaceholder')}
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
                  {loading
                    ? t('login.profileStep.openingProfile')
                    : t('login.profileStep.openProfile', {
                        name: selectedMember.name
                      })}
                  {!loading && <ArrowRight size={18} />}
                </button>
              ) : (
                <p className="profile-choice-hint">
                  {loading
                    ? t('login.profileStep.openingOwnProfile')
                    : t('login.profileStep.tapHint')}
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
      <LanguageSwitcher variant="auth" />
      <section className="auth-story-panel">
        <div className="auth-brand">
          <span className="auth-brand-mark">LX</span>
          <span>{PRODUCT_NAME}</span>
        </div>
        <div className="auth-community-links">
          <a
            className="auth-github-link"
            href={GITHUB_REPOSITORY_URL}
            target="_blank"
            rel="noreferrer"
            aria-label={t('login.github.aria')}
          >
            <span className="auth-github-mark"><Github size={21} /></span>
            <span className="auth-github-copy">
              <strong>{t('login.github.title')}</strong>
              <small>{t('login.github.subtitle')}</small>
            </span>
            <ArrowUpRight className="auth-github-arrow" size={19} />
          </a>
          <ProjectSupportCard variant="auth" />
        </div>
        <div className="auth-story-copy">
          <span className="eyebrow">{t('login.hero.eyebrow')}</span>
          <h1>{t('login.hero.title')}</h1>
          <p>{t('login.hero.description')}</p>
        </div>
        <div className="auth-proof-row">
          <span><ShieldCheck size={17} /> {t('login.proof.private')}</span>
          <span><HeartHandshake size={17} /> {t('login.proof.family')}</span>
          <span><Sparkles size={17} /> {t('login.proof.easy')}</span>
        </div>
      </section>

      <main className="auth-action-panel">
        <div className="auth-action-stack">
        <div className="auth-card auth-card-wide">
          <div className="auth-card-heading">
            <div className="auth-icon"><Users size={24} /></div>
            <div>
              <span className="eyebrow">
                {directoryEnabled
                  ? t('login.familyStep.eyebrow')
                  : t('login.familyStep.secureEyebrow')}
              </span>
              <h2>{t('login.familyStep.title')}</h2>
            </div>
          </div>

          <form onSubmit={handleFamilyLogin}>
            {directoryEnabled ? (
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
                        {family.badge || t('login.familyStep.badgeFallback')} ·{' '}
                        {t('login.familyStep.profileCount', {
                          count: family.membersCount || 0
                        })}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="private-family-login">
                <div className="private-family-login-note">
                  <ShieldCheck size={19} />
                  <span>
                    <strong>{t('login.familyStep.privateTitle')}</strong>
                    <small>
                      {t('login.familyStep.privateDescription')}
                    </small>
                  </span>
                </div>
                <label className="auth-field">
                  <span>{t('login.familyStep.familyNameLabel')}</span>
                  <div className="auth-input-wrap">
                    <Users size={18} />
                    <input
                      value={familyName}
                      onChange={event => {
                        setFamilyName(event.target.value);
                        setError('');
                      }}
                      autoComplete="organization"
                      placeholder={t('login.familyStep.familyNamePlaceholder')}
                      maxLength={100}
                      autoFocus
                    />
                  </div>
                </label>
                {publicAccess?.demo && (
                  <button
                    type="button"
                    className="public-demo-choice"
                    onClick={() => {
                      setFamilyName(publicAccess.demo.familyName);
                      setError('');
                    }}
                  >
                    <img
                      src={
                        publicAccess.demo.familyAvatar ||
                        DEFAULT_FAMILY_AVATAR
                      }
                      onError={handleImgError}
                      alt=""
                    />
                    <span>
                      <strong>{t('login.familyStep.demoTitle')}</strong>
                      <small>
                        {t('login.familyStep.demoDescription', {
                          name: publicAccess.demo.familyName
                        })}
                      </small>
                    </span>
                    <ArrowRight size={17} />
                  </button>
                )}
              </div>
            )}

            {familyReference && (
              <label className="auth-field">
                <span>
                  {selectedFamily
                    ? t('login.familyStep.passwordLabel', {
                        name: selectedFamily.familyName
                      })
                    : t('login.familyStep.passwordLabelGeneric')}
                </span>
                <div className="auth-input-wrap">
                  <KeyRound size={18} />
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    placeholder={t('login.familyStep.passwordPlaceholder')}
                    autoFocus={Boolean(selectedFamily)}
                  />
                </div>
              </label>
            )}

            {error && <div className="auth-error">{error}</div>}
            <button
              className="auth-primary"
              disabled={!familyReference || !password || loading}
              type="submit"
            >
              {loading
                ? t('login.familyStep.loggingIn')
                : t('login.familyStep.continueToProfiles')}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="auth-divider">
            <span>{t('login.familyStep.serverDivider')}</span>
          </div>
          <div className="flex gap-2">
            {registration.allowed ? (
              <button
                type="button"
                className="auth-secondary flex-1"
                onClick={onStartOnboarding}
              >
                <Plus size={18} />
                {registration.requiresInvite
                  ? t('login.familyStep.createWithInvite')
                  : t('login.familyStep.createFamily')}
              </button>
            ) : (
              <div className="registration-closed-note">
                <LockKeyhole size={17} />
                <span>
                  <strong>{t('login.familyStep.registrationClosedTitle')}</strong>
                  <small>{t('login.familyStep.registrationClosedDescription')}</small>
                </span>
              </div>
            )}
            {onOpenServerConfig && (
              <button
                type="button"
                className="auth-secondary"
                onClick={onOpenServerConfig}
                title={t('login.familyStep.serverConfigTitle')}
                style={{ padding: '0 12px' }}
              >
                <Server size={18} />
              </button>
            )}
          </div>
        </div>
        <ReleasePreviewCard />
        <AndroidAppDownload />
        </div>
      </main>
    </div>
  );
}
