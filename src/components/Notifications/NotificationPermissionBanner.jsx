import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import { isPetProfile } from '../../constants/roles';
import { isCapacitorNative } from '../../utils/apiConfig';

const SNOOZE_MS = 24 * 60 * 60 * 1000;

export default function NotificationPermissionBanner() {
  const {
    activeMember,
    webPush,
    enableWebPush,
    nativePush,
    enableNativePush
  } = useFamily();
  const isNative = isCapacitorNative();
  const push = isNative ? nativePush : webPush;
  const enablePush = isNative ? enableNativePush : enableWebPush;
  const storageKey = `lx_push_banner_snooze_${activeMember?.id || 'profile'}`;
  const [snoozedUntil, setSnoozedUntil] = useState(
    () => Number(localStorage.getItem(storageKey) || 0)
  );
  useEffect(() => {
    setSnoozedUntil(Number(localStorage.getItem(storageKey) || 0));
  }, [storageKey]);
  const isChild = ['child', 'teen'].includes(activeMember?.role);
  const isPet = isPetProfile(activeMember);
  const alreadyConnected = Boolean(push.currentDeviceId);
  const canOffer =
    !isPet &&
    !push.loading &&
    push.supported &&
    (!isNative || push.serverConfigured) &&
    ['default', 'prompt', 'granted'].includes(push.permission) &&
    !alreadyConnected;
  const isSnoozed = snoozedUntil > Date.now();

  const copy = useMemo(
    () =>
      isChild
        ? {
            eyebrow: 'Nichts Wichtiges verpassen',
            title: `Soll ich dir Bescheid sagen, ${activeMember?.name || ''}?`,
            text: `Wenn eine Nachricht oder neue Mission für dich ankommt, meldet sich ${
              isNative ? 'die LX App' : 'dieses Gerät'
            }.`,
            action: 'Ja, sag mir Bescheid'
          }
        : {
            eyebrow: 'Familie auf dem Laufenden',
            title: isNative
              ? 'Echte Android-Benachrichtigungen'
              : 'Benachrichtigungen auf diesem Gerät',
            text: isNative
              ? 'Chat, Termine und Aufgaben erscheinen im Android-Benachrichtigungsbereich – auch bei geschlossener LX App.'
              : 'Chat, Termine und Aufgaben erreichen dich auch dann, wenn der Planer gerade geschlossen ist.',
            action: 'Jetzt einschalten'
          },
    [activeMember?.name, isChild, isNative]
  );

  if (!canOffer || isSnoozed) return null;

  const snooze = () => {
    const until = Date.now() + SNOOZE_MS;
    localStorage.setItem(storageKey, String(until));
    setSnoozedUntil(until);
  };

  return (
    <aside className={`push-permission-banner ${isChild ? 'child' : ''}`}>
      <div className="push-banner-orbit" aria-hidden="true">
        <Sparkles size={15} />
      </div>
      <div className="push-banner-icon">
        <BellRing size={24} />
      </div>
      <div className="push-banner-copy">
        <span>{copy.eyebrow}</span>
        <strong>{copy.title}</strong>
        <p>{copy.text}</p>
        <small><ShieldCheck size={13} /> Nur für {activeMember?.name}s Profil</small>
      </div>
      <div className="push-banner-actions">
        <button
          type="button"
          className="push-banner-enable"
          disabled={Boolean(push.busy)}
          onClick={() => enablePush()}
        >
          <BellRing size={17} />
          {push.busy === 'enable' ? 'Einen Moment …' : copy.action}
        </button>
        <button type="button" className="push-banner-later" onClick={snooze}>
          Später
        </button>
      </div>
      <button
        type="button"
        className="push-banner-close"
        aria-label="Hinweis schließen"
        onClick={snooze}
      >
        <X size={17} />
      </button>
    </aside>
  );
}
