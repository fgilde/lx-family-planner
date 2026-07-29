import React, { useEffect, useMemo, useState } from 'react';
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

function letterDate(value) {
  return new Date(Number(value || Date.now())).toLocaleString('de-DE', {
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
          <small>Verbundene Familien · bewusst privat</small>
          <h1>Familienbriefkasten</h1>
          <p>
            Plant in Ruhe miteinander oder ladet Oma und Opa gezielt in
            euren Familienchat ein.
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
          <PenLine size={17} /> Brief schreiben
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
              Eingang
              {unreadCount > 0 && <b>{unreadCount}</b>}
            </button>
            <button
              type="button"
              className={mailFilter === 'sent' ? 'active' : ''}
              onClick={() => setMailFilter('sent')}
            >
              <Send size={17} /> Gesendet
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
                <strong>Noch keine Briefe</strong>
                <span>
                  {connectedFamilies.length
                    ? 'Ein ruhiger Anfang für euren Familienaustausch.'
                    : 'Verknüpft zuerst eine andere Familie im Familiennetz.'}
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
                      ? 'Gesendet an'
                      : 'Brief von'}
                    {' '}
                    {selectedLetter.otherFamily.familyName}
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
                    <Reply size={16} /> Antworten
                  </button>
                  <button
                    type="button"
                    title="Brief archivieren"
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
                Nur Erwachsene beider verbundenen Familien sehen diesen
                Brief.
              </footer>
            </>
          ) : (
            <div className="family-letter-placeholder">
              <span>✉</span>
              <h2>Ein Brief wartet auf deine Auswahl</h2>
              <p>
                Persönlicher als Chat, übersichtlicher für Absprachen und
                gemeinsame Pläne.
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="family-guest-station">
        <header>
          <span><MessageCircleMore size={23} /></span>
          <div>
            <small>Familienfunk mit Zustimmung</small>
            <h2>Gäste im Familienchat</h2>
            <p>
              Erwachsene Profile wie Oma oder Opa sehen nur neue
              Gruppennachrichten ab ihrer Zustimmung.
            </p>
          </div>
        </header>

        <form onSubmit={submitInvitation}>
          <label>
            <span>Verbundene Familie</span>
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
            <span>Erwachsenes Profil</span>
            <select
              value={inviteForm.guestMemberId}
              onChange={event => setInviteForm(previous => ({
                ...previous,
                guestMemberId: event.target.value
              }))}
            >
              <option value="">Profil auswählen</option>
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
            Einladung senden
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
                    ? 'Im Chat'
                    : invitation.status === 'pending'
                      ? 'Wartet auf Zustimmung'
                      : invitation.status === 'revoked'
                        ? 'Zugang beendet'
                        : 'Abgelehnt'}
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
                      <Check size={15} /> Annehmen
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateFamilyChatGuest(invitation.id, 'declined')
                      }
                    >
                      <X size={15} /> Ablehnen
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
                    Zugang beenden
                  </button>
                )}
            </article>
          )) : (
            <div className="family-guest-empty">
              <UserPlus size={23} />
              Noch keine Chatgäste eingeladen.
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
                <small>Neue Familienpost</small>
                <h2>Brief schreiben</h2>
              </div>
              <button
                type="button"
                onClick={() => setComposeOpen(false)}
                aria-label="Schließen"
              >
                <X size={18} />
              </button>
            </header>
            <label>
              <span>Empfängerfamilie</span>
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
              <span>Betreff</span>
              <input
                value={letterForm.subject}
                onChange={event => setLetterForm(previous => ({
                  ...previous,
                  subject: event.target.value
                }))}
                maxLength={120}
                required
                autoFocus
                placeholder="Worum geht es?"
              />
            </label>
            <label>
              <span>Dein Brief</span>
              <textarea
                value={letterForm.body}
                onChange={event => setLetterForm(previous => ({
                  ...previous,
                  body: event.target.value
                }))}
                maxLength={6000}
                rows={10}
                required
                placeholder="Hallo ihr Lieben, …"
              />
            </label>
            <footer>
              <span>
                <ShieldCheck size={15} />
                Nur über die bestätigte Familienverbindung
              </span>
              <button disabled={Boolean(busy)}>
                {busy === 'letter'
                  ? <LoaderCircle className="spin" size={17} />
                  : <Send size={17} />}
                Brief einwerfen
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
