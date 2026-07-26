import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, ShieldCheck, Sparkles, X } from 'lucide-react';
import { useFamily } from '../../context/FamilyContext';
import { isPetProfile } from '../../constants/roles';

const SNOOZE_MS = 24 * 60 * 60 * 1000;

export default function NotificationPermissionBanner() {
  const { activeMember, webPush, enableWebPush } = useFamily();
  const storageKey = `lx_push_banner_snooze_${activeMember?.id || 'profile'}`;
  const [snoozedUntil, setSnoozedUntil] = useState(
    () => Number(localStorage.getItem(storageKey) || 0)
  );
  useEffect(() => {
    setSnoozedUntil(Number(localStorage.getItem(storageKey) || 0));
  }, [storageKey]);
  const isChild = ['child', 'teen'].includes(activeMember?.role);
  const isPet = isPetProfile(activeMember);
  const alreadyConnected = Boolean(webPush.currentDeviceId);
  const canOffer =
    !isPet &&
    !webPush.loading &&
    webPush.supported &&
    ['default', 'granted'].includes(webPush.permission) &&
    !alreadyConnected;
  const isSnoozed = snoozedUntil > Date.now();

  const copy = useMemo(
    () =>
      isChild
        ? {
            eyebrow: 'Nichts Wichtiges verpassen',
            title: `Soll ich dir Bescheid sagen, ${activeMember?.name || ''}?`,
            text: 'Wenn eine Nachricht oder neue Mission für dich ankommt, meldet sich dieses Gerät.',
            action: 'Ja, sag mir Bescheid'
          }
        : {
            eyebrow: 'Familie auf dem Laufenden',
            title: 'Benachrichtigungen auf diesem Gerät',
            text: 'Chat, Termine und Aufgaben erreichen dich auch dann, wenn der Planer gerade geschlossen ist.',
            action: 'Jetzt einschalten'
          },
    [activeMember?.name, isChild]
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
          disabled={Boolean(webPush.busy)}
          onClick={() => enableWebPush()}
        >
          <BellRing size={17} />
          {webPush.busy === 'enable' ? 'Einen Moment …' : copy.action}
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
