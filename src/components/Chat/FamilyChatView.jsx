import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Download,
  File,
  FileArchive,
  FileAudio,
  FileText,
  FileVideo,
  Image as ImageIcon,
  LoaderCircle,
  Lock,
  MessageCircleMore,
  Package,
  Paperclip,
  Play,
  Send,
  ShieldCheck,
  Users,
  X
} from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import {
  plannerApiFetch,
  plannerApiRequest
} from '../../utils/apiConfig';
import {
  getPositionLabel,
  isManagedProfile
} from '../../constants/roles';
import {
  DEFAULT_FAMILY_AVATAR,
  handleImgError
} from '../../utils/imageFallback';

const MAX_ATTACHMENT_BYTES = 100 * 1024 * 1024;
const MAX_ATTACHMENTS = 8;

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

function readableSize(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 ** 2).toFixed(1)} MB`;
}

function attachmentIcon(attachment) {
  switch (attachment.kind) {
    case 'image':
      return ImageIcon;
    case 'video':
      return FileVideo;
    case 'audio':
      return FileAudio;
    case 'archive':
      return FileArchive;
    case 'apk':
      return Package;
    case 'pdf':
      return FileText;
    default:
      return File;
  }
}

function localAttachmentKind(file) {
  const type = String(file?.type || '').toLowerCase();
  const name = String(file?.name || '').toLowerCase();
  if (type.startsWith('image/') && type !== 'image/svg+xml') return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('audio/')) return 'audio';
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (
    type.includes('zip') ||
    type.includes('compressed') ||
    /\.(?:zip|7z|rar|tar|gz|bz2|xz)$/i.test(name)
  ) {
    return 'archive';
  }
  if (
    type === 'application/vnd.android.package-archive' ||
    name.endsWith('.apk')
  ) {
    return 'apk';
  }
  return 'document';
}

function attachmentUrl(message, attachment, guestInvitationId, inline) {
  const suffix = `${encodeURIComponent(message.id)}/attachments/${
    encodeURIComponent(attachment.id)
  }${inline ? '?inline=true' : ''}`;
  return guestInvitationId
    ? `/api/family/chat-guests/${
        encodeURIComponent(guestInvitationId)
      }/messages/${suffix}`
    : `/api/chat/messages/${suffix}`;
}

async function responseError(response) {
  try {
    const data = await response.json();
    return data?.error || 'Der Anhang konnte nicht geladen werden.';
  } catch {
    return 'Der Anhang konnte nicht geladen werden.';
  }
}

function ChatAttachment({
  attachment,
  guestInvitationId,
  message,
  showToast
}) {
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(false);
  const Icon = attachmentIcon(attachment);
  const canPreview = ['image', 'video', 'audio'].includes(attachment.kind);

  const loadPreview = async () => {
    if (source || loading || !canPreview) return;
    setLoading(true);
    try {
      const response = await plannerApiFetch(
        attachmentUrl(message, attachment, guestInvitationId, true)
      );
      if (!response.ok) throw new Error(await responseError(response));
      setSource(URL.createObjectURL(await response.blob()));
    } catch (error) {
      showToast('Anhang nicht geöffnet', error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      attachment.kind === 'image' &&
      Number(attachment.size || 0) <= 15 * 1024 * 1024
    ) {
      void loadPreview();
    }
  }, [attachment.id]);

  useEffect(() => () => {
    if (source) URL.revokeObjectURL(source);
  }, [source]);

  const download = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await plannerApiFetch(
        attachmentUrl(message, attachment, guestInvitationId, false)
      );
      if (!response.ok) throw new Error(await responseError(response));
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = attachment.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (error) {
      showToast('Download fehlgeschlagen', error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (attachment.kind === 'image' && source) {
    return (
      <button
        type="button"
        className="chat-attachment-image"
        onClick={download}
        title={`${attachment.name} herunterladen`}
      >
        <img src={source} alt={attachment.name} />
        <span><Download size={14} /> {attachment.name}</span>
      </button>
    );
  }

  if (attachment.kind === 'video' && source) {
    return (
      <div className="chat-attachment-player">
        <video src={source} controls preload="metadata" />
        <button type="button" onClick={download}>
          <Download size={14} /> {attachment.name}
        </button>
      </div>
    );
  }

  if (attachment.kind === 'audio' && source) {
    return (
      <div className="chat-attachment-player audio">
        <audio src={source} controls preload="metadata" />
        <button type="button" onClick={download}>
          <Download size={14} /> {attachment.name}
        </button>
      </div>
    );
  }

  return (
    <div className={`chat-attachment-card kind-${attachment.kind}`}>
      <span className="chat-attachment-icon">
        {loading
          ? <LoaderCircle className="spin" size={22} />
          : <Icon size={22} />}
      </span>
      <span className="chat-attachment-copy">
        <strong>{attachment.name}</strong>
        <small>
          {attachment.kind === 'apk'
            ? 'Android-App'
            : attachment.kind === 'archive'
              ? 'Archiv'
              : attachment.kind === 'pdf'
                ? 'PDF-Dokument'
                : attachment.kind === 'video'
                  ? 'Video'
                  : attachment.kind === 'audio'
                    ? 'Audio'
                    : 'Dokument'}
          {' · '}
          {readableSize(attachment.size)}
        </small>
      </span>
      {canPreview && (
        <button
          type="button"
          onClick={loadPreview}
          disabled={loading}
          title="Öffnen"
        >
          <Play size={15} />
        </button>
      )}
      <button
        type="button"
        onClick={download}
        disabled={loading}
        title="Herunterladen"
      >
        <Download size={15} />
      </button>
    </div>
  );
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
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [uploadLabel, setUploadLabel] = useState('');
  const [guestMessages, setGuestMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const pendingAttachmentsRef = useRef([]);

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
    void load();
    const interval = window.setInterval(load, 8000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeGuestChat, fetchGuestChatMessages]);

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  useEffect(() => () => {
    pendingAttachmentsRef.current.forEach(item => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
  }, []);

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
      if (latest?.text) return latest.text;
      if (latest?.attachments?.length) return '📎 Datei geteilt';
      return 'Eingeladener Familienchat';
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
    if (relevant.attachments?.length) {
      return relevant.attachments[0].kind === 'image'
        ? '📷 Foto'
        : '📎 Datei';
    }
    return relevant.photo ? '📷 Foto' : 'Neue Nachricht';
  };

  const chooseAttachments = event => {
    const selected = [...(event.target.files || [])];
    event.target.value = '';
    if (!selected.length) return;
    const remaining = MAX_ATTACHMENTS - pendingAttachments.length;
    if (remaining <= 0) {
      showToast(
        'Genug Anhänge',
        `Pro Nachricht sind höchstens ${MAX_ATTACHMENTS} Dateien möglich.`,
        'warning'
      );
      return;
    }
    const oversized = selected.find(file => file.size > MAX_ATTACHMENT_BYTES);
    if (oversized) {
      showToast(
        'Datei zu groß',
        `${oversized.name} ist größer als 100 MB.`,
        'warning'
      );
      return;
    }
    const additions = selected.slice(0, remaining).map(file => {
      const kind = localAttachmentKind(file);
      return {
        id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        file,
        kind,
        previewUrl: kind === 'image' ? URL.createObjectURL(file) : ''
      };
    });
    setPendingAttachments(previous => [...previous, ...additions]);
    if (selected.length > remaining) {
      showToast(
        'Auswahl gekürzt',
        `Die ersten ${remaining} Dateien wurden angehängt.`,
        'info'
      );
    }
  };

  const removePendingAttachment = id => {
    setPendingAttachments(previous => {
      const removed = previous.find(item => item.id === id);
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return previous.filter(item => item.id !== id);
    });
  };

  const uploadAttachments = async () => {
    const uploaded = [];
    for (let index = 0; index < pendingAttachments.length; index += 1) {
      const item = pendingAttachments[index];
      setUploadLabel(
        `Datei ${index + 1} von ${pendingAttachments.length} wird in der Cloud gespeichert`
      );
      const path = activeGuestChat
        ? `/api/family/chat-guests/${
            encodeURIComponent(activeGuestChat.id)
          }/attachments`
        : '/api/chat/attachments';
      const data = await plannerApiRequest(path, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-LX-File-Name': encodeURIComponent(item.file.name),
          'X-LX-File-Type':
            item.file.type || 'application/octet-stream',
          'X-LX-Chat-Target': activeGuestChat
            ? 'group'
            : activeChatTarget
        },
        body: await item.file.arrayBuffer()
      });
      uploaded.push(data.attachment);
    }
    return uploaded;
  };

  const clearPendingAttachments = () => {
    pendingAttachments.forEach(item => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    setPendingAttachments([]);
  };

  const handleSendMessage = async event => {
    event.preventDefault();
    if (
      (!inputText.trim() && !pendingAttachments.length) ||
      sending
    ) {
      return;
    }
    setSending(true);
    setUploadLabel('');
    try {
      const attachments = pendingAttachments.length
        ? await uploadAttachments()
        : [];
      setUploadLabel(attachments.length ? 'Nachricht wird gesendet' : '');
      const payload = {
        text: inputText.trim(),
        attachments
      };
      const created = activeGuestChat
        ? await sendGuestChatMessage(activeGuestChat.id, payload)
        : await addChatMessage({
            ...payload,
            target: activeChatTarget
          });
      if (created) {
        setInputText('');
        clearPendingAttachments();
        if (activeGuestChat) {
          setGuestMessages(previous => [...previous, created]);
        }
      }
    } catch (error) {
      showToast(
        'Anhang nicht gesendet',
        error?.message ||
        'Die Datei konnte nicht in der Family Cloud gespeichert werden.',
        'error'
      );
    } finally {
      setSending(false);
      setUploadLabel('');
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
                        <img
                          className="chat-legacy-photo"
                          src={message.photo}
                          alt="Gesendeter Anhang"
                        />
                      )}
                      {Array.isArray(message.attachments) &&
                        message.attachments.map(attachment => (
                          <ChatAttachment
                            key={attachment.id}
                            attachment={attachment}
                            guestInvitationId={activeGuestChat?.id}
                            message={message}
                            showToast={showToast}
                          />
                        ))}
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
          {pendingAttachments.length > 0 && (
            <div className="chat-pending-attachments">
              {pendingAttachments.map(item => {
                const Icon = attachmentIcon(item);
                return (
                  <article key={item.id}>
                    <span>
                      {item.previewUrl
                        ? <img src={item.previewUrl} alt="" />
                        : <Icon size={20} />}
                    </span>
                    <div>
                      <strong>{item.file.name}</strong>
                      <small>{readableSize(item.file.size)}</small>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePendingAttachment(item.id)}
                      aria-label={`${item.file.name} entfernen`}
                    >
                      <X size={13} />
                    </button>
                  </article>
                );
              })}
            </div>
          )}
          {uploadLabel && (
            <div className="chat-upload-status" aria-live="polite">
              <LoaderCircle className="spin" size={15} />
              {uploadLabel}
            </div>
          )}
          <div className="chat-composer-row">
            <label
              className="chat-attach-button"
              title="Dateien anhängen"
            >
              <Paperclip size={20} />
              <input
                type="file"
                multiple
                onChange={chooseAttachments}
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
                  event.key === 'Enter' &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button
              type="submit"
              className="chat-send-button"
              disabled={
                sending ||
                (!inputText.trim() && !pendingAttachments.length)
              }
            >
              {sending
                ? <LoaderCircle className="spin" size={18} />
                : <Send size={18} />}
              <span>{sending ? 'Sendet …' : 'Senden'}</span>
            </button>
          </div>
          <small className="chat-cloud-note">
            <Archive size={13} />
            Anhänge werden automatisch im Familienarchiv sortiert · bis 100 MB
          </small>
        </form>
      </section>
    </div>
  );
}
