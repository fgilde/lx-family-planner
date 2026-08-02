import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Archive,
  Check,
  Inbox,
  LoaderCircle,
  Mail,
  MailOpen,
  MessageCircleMore,
  PenLine,
  Reply,
  Send,
  ShieldCheck,
  UserPlus,
  X
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import { getPositionLabel } from '../../constants/roles';
import {
  DEFAULT_FAMILY_AVATAR,
  handleImgError
} from '../../utils/imageFallback';
import { formatDateTime } from '../../utils/formatting';

function letterDate(value) {
  return formatDateTime(Number(value || Date.now()), {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function replySubject(subject = '') {
  return /^re:/i.test(subject) ? subject : `Re: ${subject}`;
}

export default function FamilyMailbox() {
  const { t } = useTranslation('familyMail');
  const {
    activeMember,
    familyRelationships,
    familyLetters,
    refreshFamilyMail,
    sendFamilyLetter,
    updateFamilyLetter,
    familyChatGuests,
    refreshFamilyChatGuests,
    inviteFamilyChatGuest,
    updateFamilyChatGuest
  } = useFamily();
  const connectedFamilies = useMemo(
    () => familyRelationships.filter(entry => entry.status === 'accepted'),
    [familyRelationships]
  );
  const [selectedLetterId, setSelectedLetterId] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [mailFilter, setMailFilter] = useState('inbox');
  const [busy, setBusy] = useState('');
  const [letterForm, setLetterForm] = useState({
    recipientFamilyId: '',
    subject: '',
    body: '',
    replyToId: ''
  });
  const [inviteForm, setInviteForm] = useState({
    relationshipId: '',
    guestMemberId: ''
  });

  useEffect(() => {
    refreshFamilyMail();
    refreshFamilyChatGuests();
  }, [refreshFamilyChatGuests, refreshFamilyMail]);

  useEffect(() => {
    if (!connectedFamilies.length) return;
    setLetterForm(previous => ({
      ...previous,
      recipientFamilyId:
        previous.recipientFamilyId || connectedFamilies[0].otherFamily.id
    }));
    setInviteForm(previous => ({
      ...previous,
      relationshipId:
        previous.relationshipId || connectedFamilies[0].id
    }));
  }, [connectedFamilies]);

  const visibleLetters = familyLetters.filter(letter =>
    mailFilter === 'sent'
      ? letter.direction === 'sent'
      : letter.direction === 'received'
  );
  const selectedLetter = familyLetters.find(
    letter => letter.id === selectedLetterId
  );
  const unreadCount = familyLetters.filter(
    letter => letter.direction === 'received' && !letter.readAt
  ).length;
  const selectedRelationship = connectedFamilies.find(
    entry => entry.id === inviteForm.relationshipId
  );
  const guestCandidates = (selectedRelationship?.otherFamily?.members || [])
    .filter(member =>
      ['adult', 'senior'].includes(member.role)
    );

  const openLetter = async letter => {
    setSelectedLetterId(letter.id);
    if (letter.direction === 'received' && !letter.readAt) {
      await updateFamilyLetter(letter.id, { read: true });
    }
  };

  const startReply = letter => {
    setLetterForm({
      recipientFamilyId: letter.otherFamily.id,
      subject: replySubject(letter.subject),
      body: '',
      replyToId: letter.id
    });
    setComposeOpen(true);
  };

  const submitLetter = async event => {
    event.preventDefault();
    if (busy) return;
    setBusy('letter');
    const created = await sendFamilyLetter(letterForm);
    setBusy('');
    if (!created) return;
    setComposeOpen(false);
    setSelectedLetterId(created.id);
    setMailFilter('sent');
    setLetterForm(previous => ({
      ...previous,
      subject: '',
      body: '',
      replyToId: ''
    }));
  };

  const submitInvitation = async event => {
    event.preventDefault();
    if (!inviteForm.relationshipId || !inviteForm.guestMemberId || busy) {
      return;
    }
    setBusy('invite');
    const created = await inviteFamilyChatGuest(inviteForm);
    setBusy('');
    if (created) {
      setInviteForm(previous => ({ ...previous, guestMemberId: '' }));
    }
  };

  return (
    <div className="family-mail-page">
      <header className="family-mail-hero">
        <span className="family-mail-seal"><Mail size={29} /></span>
        <div>
          <small>{t('hero.kicker')}</small>
          <h1>{t('hero.title')}</h1>
          <p>
            {t('hero.description')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLetterForm(previous => ({
              ...previous,
              subject: '',
              body: '',
              replyToId: ''
            }));
            setComposeOpen(true);
          }}
          disabled={!connectedFamilies.length}
        >
          <PenLine size={17} /> {t('hero.writeLetter')}
        </button>
      </header>

      <div className="family-mail-layout">
        <aside className="family-mail-sidebar">
          <div className="family-mail-filters">
            <button
              type="button"
              className={mailFilter === 'inbox' ? 'active' : ''}
              onClick={() => setMailFilter('inbox')}
            >
              <Inbox size={17} />
              {t('filters.inbox')}
              {unreadCount > 0 && <b>{unreadCount}</b>}
            </button>
            <button
              type="button"
              className={mailFilter === 'sent' ? 'active' : ''}
              onClick={() => setMailFilter('sent')}
            >
              <Send size={17} /> {t('filters.sent')}
            </button>
          </div>

          <div className="family-letter-list">
            {visibleLetters.length ? visibleLetters.map(letter => (
              <button
                type="button"
                key={letter.id}
                className={[
                  'family-letter-row',
                  selectedLetterId === letter.id ? 'active' : '',
                  letter.direction === 'received' && !letter.readAt
                    ? 'unread'
                    : ''
                ].filter(Boolean).join(' ')}
                onClick={() => openLetter(letter)}
              >
                <img
                  src={
                    letter.otherFamily.familyAvatar ||
                    DEFAULT_FAMILY_AVATAR
                  }
                  onError={handleImgError}
                  alt=""
                />
                <span>
                  <small>{letter.otherFamily.familyName}</small>
                  <strong>{letter.subject}</strong>
                  <em>{letterDate(letter.createdAt)}</em>
                </span>
                {!letter.readAt && letter.direction === 'received' && <i />}
              </button>
            )) : (
              <div className="family-mail-empty-list">
                <MailOpen size={25} />
                <strong>{t('list.emptyTitle')}</strong>
                <span>
                  {connectedFamilies.length
                    ? t('list.emptyConnected')
                    : t('list.emptyUnconnected')}
                </span>
              </div>
            )}
          </div>
        </aside>

        <section className="family-letter-reader">
          {selectedLetter ? (
            <>
              <header>
                <div>
                  <small>
                    {selectedLetter.direction === 'sent'
                      ? t('reader.sentTo', {
                          family: selectedLetter.otherFamily.familyName
                        })
                      : t('reader.from', {
                          family: selectedLetter.otherFamily.familyName
                        })}
                  </small>
                  <h2>{selectedLetter.subject}</h2>
                  <span>
                    {selectedLetter.sender.memberName}
                    {' · '}
                    {letterDate(selectedLetter.createdAt)}
                  </span>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => startReply(selectedLetter)}
                  >
                    <Reply size={16} /> {t('reader.reply')}
                  </button>
                  <button
                    type="button"
                    title={t('reader.archiveLetter')}
                    onClick={async () => {
                      await updateFamilyLetter(
                        selectedLetter.id,
                        { archived: true }
                      );
                      setSelectedLetterId('');
                    }}
                  >
                    <Archive size={16} />
                  </button>
                </div>
              </header>
              <article>{selectedLetter.body}</article>
              <footer>
                <ShieldCheck size={16} />
                {t('reader.privacyNote')}
              </footer>
            </>
          ) : (
            <div className="family-letter-placeholder">
              <span>✉</span>
              <h2>{t('reader.placeholderTitle')}</h2>
              <p>
                {t('reader.placeholderText')}
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="family-guest-station">
        <header>
          <span><MessageCircleMore size={23} /></span>
          <div>
            <small>{t('guests.kicker')}</small>
            <h2>{t('guests.title')}</h2>
            <p>
              {t('guests.description')}
            </p>
          </div>
        </header>

        <form onSubmit={submitInvitation}>
          <label>
            <span>{t('guests.connectedFamily')}</span>
            <select
              value={inviteForm.relationshipId}
              onChange={event => setInviteForm({
                relationshipId: event.target.value,
                guestMemberId: ''
              })}
            >
              {connectedFamilies.map(relationship => (
                <option value={relationship.id} key={relationship.id}>
                  {relationship.otherFamily.familyName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('guests.adultProfile')}</span>
            <select
              value={inviteForm.guestMemberId}
              onChange={event => setInviteForm(previous => ({
                ...previous,
                guestMemberId: event.target.value
              }))}
            >
              <option value="">{t('guests.selectProfile')}</option>
              {guestCandidates.map(member => (
                <option value={member.id} key={member.id}>
                  {member.name} · {getPositionLabel(member)}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={
              !inviteForm.guestMemberId ||
              !connectedFamilies.length ||
              Boolean(busy)
            }
          >
            {busy === 'invite'
              ? <LoaderCircle className="spin" size={17} />
              : <UserPlus size={17} />}
            {t('guests.sendInvitation')}
          </button>
        </form>

        <div className="family-guest-grid">
          {familyChatGuests.length ? familyChatGuests.map(invitation => (
            <article key={invitation.id}>
              <img
                src={
                  invitation.guestMember.avatar ||
                  DEFAULT_FAMILY_AVATAR
                }
                onError={handleImgError}
                alt=""
              />
              <span>
                <small>
                  {invitation.direction === 'host'
                    ? invitation.guestFamily.familyName
                    : invitation.hostFamily.familyName}
                </small>
                <strong>{invitation.guestMember.name}</strong>
                <em className={`guest-state ${invitation.status}`}>
                  {invitation.status === 'accepted'
                    ? t('guests.status.accepted')
                    : invitation.status === 'pending'
                      ? t('guests.status.pending')
                      : invitation.status === 'revoked'
                        ? t('guests.status.revoked')
                        : t('guests.status.declined')}
                </em>
              </span>
              {invitation.direction === 'guest' &&
                invitation.status === 'pending' &&
                invitation.guestMember.id === activeMember?.id && (
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        updateFamilyChatGuest(invitation.id, 'accepted')
                      }
                    >
                      <Check size={15} /> {t('guests.accept')}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateFamilyChatGuest(invitation.id, 'declined')
                      }
                    >
                      <X size={15} /> {t('guests.decline')}
                    </button>
                  </div>
                )}
              {invitation.direction === 'host' &&
                ['pending', 'accepted'].includes(invitation.status) && (
                  <button
                    type="button"
                    onClick={() =>
                      updateFamilyChatGuest(invitation.id, 'revoked')
                    }
                  >
                    {t('guests.endAccess')}
                  </button>
                )}
            </article>
          )) : (
            <div className="family-guest-empty">
              <UserPlus size={23} />
              {t('guests.empty')}
            </div>
          )}
        </div>
      </section>

      {composeOpen && (
        <div
          className="modal-backdrop family-letter-compose-layer"
          onClick={() => setComposeOpen(false)}
        >
          <form
            className="family-letter-compose"
            onSubmit={submitLetter}
            onClick={event => event.stopPropagation()}
          >
            <header>
              <span><PenLine size={21} /></span>
              <div>
                <small>{t('compose.kicker')}</small>
                <h2>{t('compose.title')}</h2>
              </div>
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                aria-label={t('common:actions.close')}
              >
                <X size={18} />
              </button>
            </header>
            <label>
              <span>{t('compose.recipientFamily')}</span>
              <select
                value={letterForm.recipientFamilyId}
                onChange={event => setLetterForm(previous => ({
                  ...previous,
                  recipientFamilyId: event.target.value
                }))}
                required
              >
                {connectedFamilies.map(relationship => (
                  <option
                    value={relationship.otherFamily.id}
                    key={relationship.id}
                  >
                    {relationship.otherFamily.familyName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t('compose.subject')}</span>
              <input
                value={letterForm.subject}
                onChange={event => setLetterForm(previous => ({
                  ...previous,
                  subject: event.target.value
                }))}
                maxLength={120}
                required
                autoFocus
                placeholder={t('compose.subjectPlaceholder')}
              />
            </label>
            <label>
              <span>{t('compose.body')}</span>
              <textarea
                value={letterForm.body}
                onChange={event => setLetterForm(previous => ({
                  ...previous,
                  body: event.target.value
                }))}
                maxLength={6000}
                rows={10}
                required
                placeholder={t('compose.bodyPlaceholder')}
              />
            </label>
            <footer>
              <span>
                <ShieldCheck size={15} />
                {t('compose.privacyNote')}
              </span>
              <button disabled={Boolean(busy)}>
                {busy === 'letter'
                  ? <LoaderCircle className="spin" size={17} />
                  : <Send size={17} />}
                {t('compose.submit')}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
