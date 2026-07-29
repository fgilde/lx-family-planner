import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image as ImageIcon,
  Lock,
  MessageCircleMore,
  Send,
  ShieldCheck,
  Users,
  X
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import { compressImageDataUrl } from '../../utils/imageCompressor';
import {
  getPositionLabel,
  isManagedProfile
} from '../../constants/roles';
import {
  DEFAULT_FAMILY_AVATAR,
  handleImgError
} from '../../utils/imageFallback';

function messageTime(timestamp) {
  const date = new Date(Number(timestamp || Date.now()));
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return date.toLocaleString('de-DE', sameDay
    ? { hour: '2-digit', minute: '2-digit' }
    : {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
}

export default function FamilyChatView() {
  const {
    members,
    activeMember,
    showToast,
    chatMessages: messages,
    addChatMessage,
    familyChatGuests,
    fetchGuestChatMessages,
    sendGuestChatMessage
  } = useFamily();
  const [activeChatTarget, setActiveChatTarget] = useState(
    () => new URLSearchParams(window.location.search).get('chat') || 'group'
  );
  const [inputText, setInputText] = useState('');
  const [chatPhoto, setChatPhoto] = useState(null);
  const [sending, setSending] = useState(false);
  const [guestMessages, setGuestMessages] = useState([]);
  const messagesEndRef = useRef(null);

  const chatMembers = members.filter(
    member => member.role !== 'pet' && !isManagedProfile(member)
  );
  const chatPartners = chatMembers.filter(
    member => member.id !== activeMember?.id
  );
  const activeTargetMember = chatMembers.find(
    member => member.id === activeChatTarget
  );
  const guestChats = familyChatGuests.filter(invitation =>
    invitation.direction === 'guest' &&
    invitation.status === 'accepted' &&
    invitation.guestMember.id === activeMember?.id
  );
  const activeGuestChat = activeChatTarget.startsWith('guest:')
    ? guestChats.find(
        invitation => `guest:${invitation.id}` === activeChatTarget
      )
    : null;

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('chat')) return;
    url.searchParams.delete('chat');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  useEffect(() => {
    if (
      activeChatTarget !== 'group' &&
      !activeTargetMember &&
      !activeGuestChat
    ) {
      setActiveChatTarget('group');
    }
  }, [activeChatTarget, activeGuestChat, activeTargetMember]);

  useEffect(() => {
    if (!activeGuestChat) {
      setGuestMessages([]);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      const loaded = await fetchGuestChatMessages(activeGuestChat.id);
      if (!cancelled && loaded) setGuestMessages(loaded);
    };
    load();
    const interval = window.setInterval(load, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeGuestChat, fetchGuestChatMessages]);

  const visibleMessages = useMemo(
    () => (activeGuestChat ? guestMessages : messages)
      .filter(message => {
        if (activeGuestChat) {
          return message.target === 'group' || !message.target;
        }
        if (activeChatTarget === 'group') {
          return message.target === 'group' || !message.target;
        }
        return (
          (
            message.senderId === activeMember?.id
            && message.target === activeChatTarget
          ) || (
            message.senderId === activeChatTarget
            && message.target === activeMember?.id
          )
        );
      })
      .sort((left, right) =>
        Number(left.timestamp || 0) - Number(right.timestamp || 0)
      ),
    [
      activeChatTarget,
      activeGuestChat,
      activeMember?.id,
      guestMessages,
      messages
    ]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }, [visibleMessages.length, activeChatTarget]);

  const conversationPreview = targetId => {
    if (targetId.startsWith('guest:')) {
      const latest = targetId === activeChatTarget
        ? guestMessages[guestMessages.length - 1]
        : null;
      return latest?.text || 'Eingeladener Familienchat';
    }
    const relevant = messages
      .filter(message => {
        if (targetId === 'group') {
          return message.target === 'group' || !message.target;
        }
        return (
          (
            message.senderId === activeMember?.id
            && message.target === targetId
          ) || (
            message.senderId === targetId
            && message.target === activeMember?.id
          )
        );
      })
      .sort((left, right) =>
        Number(right.timestamp || 0) - Number(left.timestamp || 0)
      )[0];
    if (!relevant) return targetId === 'group' ? 'Offene Gruppe' : 'Noch keine Nachricht';
    if (relevant.text) return relevant.text;
    return relevant.photo ? '📷 Foto' : 'Neue Nachricht';
  };

  const handlePhotoUpload = event => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async loadEvent => {
      const compressed = await compressImageDataUrl(
        loadEvent.target.result,
        1200,
        1200,
        0.72
      );
      setChatPhoto(compressed);
      showToast(
        'Foto angehängt',
        'Das Bild wird mit deiner Nachricht gesendet.',
        'info'
      );
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSendMessage = async event => {
    event.preventDefault();
    if ((!inputText.trim() && !chatPhoto) || sending) return;
    setSending(true);
    const payload = {
      text: inputText.trim(),
      photo: chatPhoto
    };
    const created = activeGuestChat
      ? await sendGuestChatMessage(activeGuestChat.id, payload)
      : await addChatMessage({
          ...payload,
          target: activeChatTarget
        });
    setSending(false);
    if (created) {
      setInputText('');
      setChatPhoto(null);
      if (activeGuestChat) {
        setGuestMessages(previous => [...previous, created]);
      }
    }
  };

  return (
    <div className="family-chat-shell">
      <aside className="chat-directory">
        <header className="chat-directory-header">
          <span><MessageCircleMore size={17} /></span>
          <div>
            <small>Familienfunk</small>
            <h2>Chats</h2>
          </div>
        </header>

        <div className="chat-channel-list">
          <button
            type="button"
            className={`chat-channel ${activeChatTarget === 'group' ? 'active' : ''}`}
            onClick={() => setActiveChatTarget('group')}
          >
            <span className="chat-channel-avatar group"><Users size={20} /></span>
            <span className="chat-channel-copy">
              <strong>Alle zusammen</strong>
              <small>{conversationPreview('group')}</small>
            </span>
          </button>

          <div className="chat-directory-label">Direkt</div>

          {chatPartners.map(member => (
            <button
              type="button"
              key={member.id}
              className={`chat-channel ${activeChatTarget === member.id ? 'active' : ''}`}
              style={{ '--channel-color': member.color || 'var(--primary)' }}
              onClick={() => setActiveChatTarget(member.id)}
            >
              <img
                src={member.avatar || DEFAULT_FAMILY_AVATAR}
                onError={handleImgError}
                alt=""
                className="chat-channel-avatar"
              />
              <span className="chat-channel-copy">
                <strong>{member.name}</strong>
                <small>{conversationPreview(member.id)}</small>
              </span>
            </button>
          ))}

          {guestChats.length > 0 && (
            <>
              <div className="chat-directory-label">Eingeladen</div>
              {guestChats.map(invitation => {
                const target = `guest:${invitation.id}`;
                return (
                  <button
                    type="button"
                    key={invitation.id}
                    className={`chat-channel family-guest-channel ${
                      activeChatTarget === target ? 'active' : ''
                    }`}
                    onClick={() => setActiveChatTarget(target)}
                  >
                    <span className="chat-channel-avatar guest">
                      <Users size={19} />
                    </span>
                    <span className="chat-channel-copy">
                      <strong>{invitation.hostFamily.familyName}</strong>
                      <small>{conversationPreview(target)}</small>
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </aside>

      <section className="chat-room">
        <header className="chat-room-header">
          {activeChatTarget === 'group' || activeGuestChat ? (
            <span className="chat-room-avatar group"><Users size={21} /></span>
          ) : (
            <img
              src={activeTargetMember?.avatar || DEFAULT_FAMILY_AVATAR}
              onError={handleImgError}
              alt=""
              className="chat-room-avatar"
            />
          )}
          <div>
            <small>
              {activeChatTarget === 'group'
                ? `${chatMembers.length} Familienprofile`
                : activeGuestChat
                  ? 'Du bist persönlich eingeladen'
                : getPositionLabel(activeTargetMember)}
            </small>
            <h1>
              {activeChatTarget === 'group'
                ? 'Familienchat'
                : activeGuestChat
                  ? activeGuestChat.hostFamily.familyName
                : activeTargetMember?.name}
            </h1>
          </div>
          <span className="chat-privacy-note">
            {activeChatTarget === 'group'
              ? <><Users size={13} /> Für alle sichtbar</>
              : activeGuestChat
                ? <><ShieldCheck size={13} /> Gastzugang ab Zustimmung</>
                : <><Lock size={13} /> Direktnachricht</>}
          </span>
        </header>

        <div className="chat-message-stream" aria-live="polite">
          {visibleMessages.length === 0 ? (
            <div className="chat-empty">
              <span>{activeChatTarget === 'group' ? '👋' : '💬'}</span>
              <strong>Noch ganz still hier</strong>
              <p>
                Schreib die erste Nachricht an
                {' '}
                {activeChatTarget === 'group'
                  ? 'deine Familie'
                  : activeGuestChat
                    ? activeGuestChat.hostFamily.familyName
                  : activeTargetMember?.name}.
              </p>
            </div>
          ) : (
            visibleMessages.map(message => {
              const isMine = message.senderId === activeMember?.id;
              if (message.senderId === 'system') {
                return (
                  <div className="chat-system-message" key={message.id}>
                    {message.text}
                  </div>
                );
              }
              return (
                <article
                  key={message.id}
                  className={`chat-message ${isMine ? 'mine' : ''}`}
                >
                  <img
                    src={message.senderAvatar || DEFAULT_FAMILY_AVATAR}
                    onError={handleImgError}
                    alt=""
                  />
                  <div>
                    <small>
                      <strong>{isMine ? 'Du' : message.senderName}</strong>
                      <time>{messageTime(message.timestamp)}</time>
                    </small>
                    <div className="chat-bubble">
                      {message.photo && (
                        <img src={message.photo} alt="Gesendeter Anhang" />
                      )}
                      {message.text && <p>{message.text}</p>}
                    </div>
                  </div>
                </article>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-composer" onSubmit={handleSendMessage}>
          {chatPhoto && (
            <div className="chat-photo-preview">
              <img src={chatPhoto} alt="Vorschau des Anhangs" />
              <button
                type="button"
                onClick={() => setChatPhoto(null)}
                aria-label="Foto entfernen"
              >
                <X size={13} />
              </button>
            </div>
          )}
          <div className="chat-composer-row">
            <label className="chat-attach-button" title="Foto anhängen">
              <ImageIcon size={20} />
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
              />
            </label>
            <textarea
              rows={1}
              placeholder={`Nachricht an ${
                activeChatTarget === 'group'
                  ? 'die Familie'
                  : activeGuestChat
                    ? activeGuestChat.hostFamily.familyName
                  : activeTargetMember?.name
              } …`}
              value={inputText}
              onChange={event => setInputText(event.target.value)}
              onKeyDown={event => {
                if (
                  event.key === 'Enter'
                  && !event.shiftKey
                  && !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button
              type="submit"
              className="chat-send-button"
              disabled={sending || (!inputText.trim() && !chatPhoto)}
            >
              <Send size={18} />
              <span>{sending ? 'Sendet …' : 'Senden'}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
