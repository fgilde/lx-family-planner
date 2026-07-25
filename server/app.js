import express from 'express';
import fs from 'fs';
import path from 'path';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual
} from 'crypto';
import BringApi from 'bring-shopping';
import * as cheerio from 'cheerio';
import webPush from 'web-push';
import { loadBringCatalog } from './bringCatalog.js';
import {
  RECORD_TYPES,
  createFamily,
  createFamilyRelationshipRequest,
  createMember,
  createRecord,
  createSession,
  countPushSubscriptionsByEndpoint,
  deleteFamily,
  deleteFamilyRelationship,
  deleteIntegration,
  deleteMember,
  deletePushSubscription,
  deletePushSubscriptionById,
  deletePushSubscriptionsByEndpoint,
  deleteRecord,
  deleteTaskRecords,
  deleteSession,
  getBootstrap,
  getFamily,
  getFamilyAuthRow,
  getFamilyVersion,
  getAppMeta,
  getIntegration,
  getMember,
  getMemberAuthRow,
  getMembers,
  getRecord,
  getSession,
  listPublicFamilies,
  listFamilyRelationships,
  listPushSubscriptions,
  listRecords,
  redeemRewardRecord,
  requestTaskApprovalRecord,
  replaceRecordsBySource,
  respondFamilyRelationship,
  saveIntegration,
  savePushSubscription,
  setAppMeta,
  setSessionMember,
  reviewTaskRecord,
  toggleTaskRecord,
  updateFamily,
  updateMember,
  updateRecord,
  upsertRecords,
  verifySecret
} from './database.js';

const SESSION_COOKIE = 'lx_session';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;
const DEFAULT_PORT = 3001;
const JSON_LIMIT = '3mb';
const APP_SECRET =
  process.env.APP_SECRET ||
  process.env.SECRET_KEY ||
  'lx-family-development-secret-change-me';
const ENCRYPTION_KEY = createHash('sha256').update(APP_SECRET).digest();
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const pendingBringLogins = new Map();
const authAttempts = new Map();

const ROLE_TYPES = new Set([
  'adult',
  'child',
  'teen',
  'senior',
  'member',
  'pet'
]);
const ADULT_ROLES = new Set(['adult', 'senior']);
const ADULT_MANAGED_RESOURCES = new Set([
  'tasks',
  'rewards',
  'trashEvents',
  'familyTree',
  'dashboardLinks'
]);
const PROTECTED_TASK_FIELDS = new Set([
  'completed',
  'completionStatus',
  'createdByMemberId',
  'createdByName',
  'createdAt',
  'completionRequestedByMemberId',
  'completionRequestedAt',
  'completionApprovedByMemberId',
  'completionApprovedAt',
  'completionRejectedByMemberId',
  'completionRejectedAt'
]);
const BULK_RESOURCE_TYPES = new Set([
  'events',
  'shoppingItems',
  'trashEvents'
]);
const ALLOWED_RECIPE_HOSTS = new Set(
  (process.env.RECIPE_HOSTS ||
    'chefkoch.de,www.chefkoch.de,lecker.de,www.lecker.de,eatsmarter.de,www.eatsmarter.de')
    .split(',')
    .map(host => host.trim().toLowerCase())
    .filter(Boolean)
);
const FAMILY_RELATION_TYPES = new Set([
  'parent',
  'child',
  'sibling',
  'relative'
]);
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be'
]);
const DEFAULT_GOTIFY_RULES = Object.freeze({
  groupChat: true,
  directMessages: false,
  taskApproval: true,
  taskCompleted: true,
  moodHelp: true,
  includeMessageText: false
});
const DEFAULT_WEB_PUSH_PREFERENCES = Object.freeze({
  groupChat: true,
  directMessages: true,
  taskAssigned: true,
  taskApproval: true,
  taskCompleted: true,
  events: true,
  moodHelp: true,
  showPreviews: false
});
const WEB_PUSH_VAPID_META_KEY = 'web_push_vapid_keys_v1';
let cachedVapidConfig = null;

function cleanText(value, fallback = '', maxLength = 160) {
  const text = String(value ?? fallback).trim();
  return text.slice(0, maxLength);
}

function ensureObject(value, message = 'Ungültige Eingabe') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
  return value;
}

function requireText(value, label, maxLength = 160) {
  const text = cleanText(value, '', maxLength);
  if (!text) {
    const error = new Error(`${label} fehlt`);
    error.statusCode = 400;
    throw error;
  }
  return text;
}

function normalizeRole(role) {
  const normalized = cleanText(role, 'member', 20).toLowerCase();
  return ROLE_TYPES.has(normalized) ? normalized : 'member';
}

function normalizeMemberInput(value = {}) {
  const member = ensureObject(value);
  return {
    ...member,
    name: requireText(member.name, 'Name', 80),
    role: normalizeRole(member.role),
    position: cleanText(member.position, 'familienmitglied', 40).toLowerCase(),
    avatar: cleanText(member.avatar, '', 1_200_000),
    color: cleanText(member.color, '#2563eb', 24),
    bgColor: cleanText(member.bgColor, '#eff6ff', 24),
    theme: cleanText(member.theme, 'light', 32),
    pin: member.pin ? cleanText(member.pin, '', 12) : undefined
  };
}

function parseCookies(header = '') {
  return header.split(';').reduce((cookies, pair) => {
    const separator = pair.indexOf('=');
    if (separator < 0) return cookies;
    const key = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    if (key) {
      try {
        cookies[key] = decodeURIComponent(value);
      } catch {
        cookies[key] = value;
      }
    }
    return cookies;
  }, {});
}

function secureCookieForRequest(req) {
  const configured = cleanText(
    process.env.SESSION_COOKIE_SECURE,
    'auto',
    10
  ).toLowerCase();
  if (configured === 'true') return true;
  if (configured === 'false') return false;
  return Boolean(req?.secure);
}

function sessionCookie(token, secure = false) {
  const attributes = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${Math.floor(SESSION_MAX_AGE_MS / 1000)}`
  ];
  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}

function clearSessionCookie(secure = false) {
  const attributes = [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=0'
  ];
  if (secure) attributes.push('Secure');
  return attributes.join('; ');
}

function encryptJson(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map(buffer => buffer.toString('base64url')).join('.');
}

function decryptJson(value) {
  const [ivEncoded, tagEncoded, encryptedEncoded] = String(value || '').split('.');
  if (!ivEncoded || !tagEncoded || !encryptedEncoded) {
    throw new Error('Integration ist beschädigt');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    ENCRYPTION_KEY,
    Buffer.from(ivEncoded, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
  return JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(encryptedEncoded, 'base64url')),
      decipher.final()
    ]).toString('utf8')
  );
}

function normalizePushPreferences(value = {}) {
  const input = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(
    Object.entries(DEFAULT_WEB_PUSH_PREFERENCES).map(([key, fallback]) => [
      key,
      Object.hasOwn(input, key) ? Boolean(input[key]) : fallback
    ])
  );
}

function getVapidConfig() {
  if (cachedVapidConfig) return cachedVapidConfig;
  const subject =
    cleanText(
      process.env.VAPID_SUBJECT,
      'mailto:family-planner@laxxx-lab.de',
      500
    );
  let keys = null;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    keys = {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY
    };
  }
  if (!keys) {
    const encrypted = getAppMeta(WEB_PUSH_VAPID_META_KEY);
    if (encrypted) {
      try {
        keys = decryptJson(encrypted);
      } catch {
        keys = null;
      }
    }
  }
  if (!keys?.publicKey || !keys?.privateKey) {
    keys = webPush.generateVAPIDKeys();
    setAppMeta(WEB_PUSH_VAPID_META_KEY, encryptJson(keys));
  }
  webPush.setVapidDetails(subject, keys.publicKey, keys.privateKey);
  cachedVapidConfig = { ...keys, subject };
  return cachedVapidConfig;
}

function publicPushDevice(subscription) {
  return {
    id: subscription.id,
    memberId: subscription.memberId,
    deviceName: subscription.deviceName,
    preferences: normalizePushPreferences(subscription.preferences),
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt
  };
}

async function sendWebPushEvent(
  familyId,
  eventKey,
  {
    recipientMemberIds = null,
    excludeMemberIds = [],
    title,
    body,
    privateTitle = title,
    privateBody = 'Im Familienplaner gibt es etwas Neues.',
    url = '/',
    tag = eventKey,
    priority = 'normal',
    ttl = 900
  }
) {
  const recipients = recipientMemberIds
    ? new Set(recipientMemberIds.filter(Boolean))
    : null;
  const excluded = new Set(excludeMemberIds.filter(Boolean));
  const subscriptionsByEndpoint = new Map();
  listPushSubscriptions(familyId)
    .filter(subscription => {
      const preferences = normalizePushPreferences(subscription.preferences);
      return (
        (!eventKey || preferences[eventKey]) &&
        (!recipients || recipients.has(subscription.memberId)) &&
        !excluded.has(subscription.memberId)
      );
    })
    .forEach(subscription => {
      const existing = subscriptionsByEndpoint.get(subscription.endpoint);
      if (
        !existing ||
        (
          normalizePushPreferences(existing.preferences).showPreviews &&
          !normalizePushPreferences(subscription.preferences).showPreviews
        )
      ) {
        subscriptionsByEndpoint.set(subscription.endpoint, subscription);
      }
    });
  const subscriptions = [...subscriptionsByEndpoint.values()];
  if (!subscriptions.length) return { sent: 0, failed: 0 };
  getVapidConfig();

  const results = await Promise.allSettled(
    subscriptions.map(async subscription => {
      const preferences = normalizePushPreferences(subscription.preferences);
      const revealDetails = preferences.showPreviews;
      const payload = JSON.stringify({
        title: revealDetails ? title : privateTitle,
        body: revealDetails ? body : privateBody,
        icon: '/icon.svg',
        tag,
        url,
        eventKey,
        timestamp: Date.now()
      });
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: subscription.keys
          },
          payload,
          {
            TTL: Math.max(60, Math.min(86_400, Number(ttl) || 900)),
            urgency: priority
          }
        );
        return true;
      } catch (error) {
        if ([404, 410].includes(Number(error?.statusCode))) {
          deletePushSubscriptionsByEndpoint(subscription.endpoint);
          return false;
        }
        throw error;
      }
    })
  );
  const sent = results.filter(
    result => result.status === 'fulfilled' && result.value
  ).length;
  const failed = results.length - sent;
  results
    .filter(result => result.status === 'rejected')
    .forEach(result => {
      console.error(
        'Browser-Benachrichtigung fehlgeschlagen:',
        result.reason?.message || result.reason
      );
    });
  return { sent, failed };
}

function queueWebPushEvent(familyId, eventKey, payload) {
  void sendWebPushEvent(familyId, eventKey, payload).catch(error => {
    console.error(
      'Browser-Benachrichtigung fehlgeschlagen:',
      error.message
    );
  });
}

function notifyChatViaWebPush(req, record) {
  const isGroup = !record.target || record.target === 'group';
  const hasPhoto = Boolean(record.photo);
  const body = cleanText(
    record.text || (hasPhoto ? '📷 Ein Foto wurde geteilt.' : 'Neue Nachricht'),
    'Neue Nachricht',
    800
  );
  queueWebPushEvent(req.session.familyId, isGroup ? 'groupChat' : 'directMessages', {
    recipientMemberIds: isGroup ? null : [record.target],
    excludeMemberIds: [record.senderId],
    title: isGroup
      ? `${record.senderName} im Familienchat`
      : `Nachricht von ${record.senderName}`,
    body,
    privateTitle: isGroup
      ? 'Neue Nachricht im Familienchat'
      : 'Neue Direktnachricht',
    privateBody: hasPhoto
      ? 'Eine neue Nachricht mit Foto ist da.'
      : 'Eine neue Nachricht ist da.',
    url: `/?view=chat&chat=${encodeURIComponent(
      isGroup ? 'group' : record.senderId
    )}`,
    tag: `chat-${record.id}`,
    priority: isGroup ? 'normal' : 'high'
  });
}

function notifyCreatedResourceViaWebPush(req, type, record) {
  const actorMemberId = req.session.memberId;
  if (type === 'tasks' && record.memberId) {
    queueWebPushEvent(req.session.familyId, 'taskAssigned', {
      recipientMemberIds: [record.memberId],
      excludeMemberIds: [actorMemberId],
      title: 'Neue Mission für dich',
      body: cleanText(record.title, 'Eine neue Aufgabe wartet auf dich.', 240),
      privateBody: 'Eine neue Aufgabe wartet im Familienplaner auf dich.',
      url: '/?view=tasks',
      tag: `task-${record.id}`
    });
  }
  if (type === 'events') {
    queueWebPushEvent(req.session.familyId, 'events', {
      excludeMemberIds: [actorMemberId],
      title: 'Neuer Familientermin',
      body: cleanText(record.title, 'Ein neuer Termin wurde eingetragen.', 240),
      privateBody: 'Im Familienkalender gibt es einen neuen Termin.',
      url: '/?view=calendar',
      tag: `event-${record.id}`
    });
  }
  if (type === 'moodCheckins' && record.mood === 'hilfe') {
    const requester = getMember(req.session.familyId, actorMemberId);
    const adultIds = getMembers(req.session.familyId)
      .filter(member => ADULT_ROLES.has(member.role))
      .map(member => member.id);
    queueWebPushEvent(req.session.familyId, 'moodHelp', {
      recipientMemberIds: adultIds,
      excludeMemberIds: [actorMemberId],
      title: `${requester?.name || 'Jemand'} braucht Nähe`,
      body: 'Im Familienkompass wurde „Brauche Nähe“ ausgewählt.',
      privateTitle: 'Ein Familienmitglied braucht Nähe',
      privateBody: 'Bitte schau kurz in den Familienplaner.',
      url: '/?view=dashboard',
      tag: `mood-${record.id}`,
      priority: 'high',
      ttl: 300
    });
  }
}

function notifyTaskCompleted(req, result, actorMemberId) {
  queueGotifyNotification(req.session.familyId, 'taskCompleted', {
    title: `${result.member?.name || 'Jemand'} hat etwas geschafft`,
    message: `"${result.task.title}" · +${result.task.stars || 10} Sterne`,
    priority: 3
  });
  const adultIds = getMembers(req.session.familyId)
    .filter(entry => ADULT_ROLES.has(entry.role))
    .map(entry => entry.id);
  queueWebPushEvent(req.session.familyId, 'taskCompleted', {
    recipientMemberIds: [...new Set([result.task.memberId, ...adultIds].filter(Boolean))],
    excludeMemberIds: [actorMemberId],
    title: `${result.member?.name || 'Jemand'} hat etwas geschafft`,
    body: `"${result.task.title}" · +${result.task.stars || 10} Sterne`,
    privateTitle: 'Eine Aufgabe ist bestätigt',
    privateBody: 'Im Familienplaner wurden neue Sterne verdient.',
    url: '/?view=tasks',
    tag: `task-complete-${result.task.id}`
  });
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function authRateLimit(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || 'local';
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const entry = authAttempts.get(key) || { count: 0, startedAt: now };
  if (now - entry.startedAt > windowMs) {
    entry.count = 0;
    entry.startedAt = now;
  }
  entry.count += 1;
  authAttempts.set(key, entry);
  if (entry.count > 30) {
    return res.status(429).json({
      success: false,
      error: 'Zu viele Anmeldeversuche. Bitte kurz warten.'
    });
  }
  return next();
}

function clearAuthAttempts(req) {
  const key = req.ip || req.socket.remoteAddress || 'local';
  authAttempts.delete(key);
}

function sessionMiddleware(req, _res, next) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  req.sessionToken = token || null;
  req.session = token ? getSession(token) : null;
  next();
}

function requireAuth(req, res, next) {
  if (!req.session) {
    return res.status(401).json({
      success: false,
      error: 'Bitte zuerst anmelden.'
    });
  }
  return next();
}

function requireAdult(req, res, next) {
  if (!req.session?.memberId) {
    return res.status(403).json({
      success: false,
      error: 'Bitte zuerst ein Erwachsenenprofil wählen.'
    });
  }
  const member = getMember(req.session.familyId, req.session.memberId);
  if (!member || !ADULT_ROLES.has(member.role)) {
    return res.status(403).json({
      success: false,
      error: 'Diese Änderung ist Erwachsenen vorbehalten.'
    });
  }
  req.activeMember = member;
  return next();
}

function requireResourceManager(req, res, next) {
  if (!ADULT_MANAGED_RESOURCES.has(req.params.type)) return next();
  const member = req.session?.memberId
    ? getMember(req.session.familyId, req.session.memberId)
    : null;
  if (!member || !ADULT_ROLES.has(member.role)) {
    return res.status(403).json({
      success: false,
      error: 'Diese Einträge werden von einem Erwachsenen verwaltet.'
    });
  }
  return next();
}

function integrationStatus(familyId) {
  const bring = getIntegration(familyId, 'bring');
  const gotify = getIntegration(familyId, 'gotify');
  return {
    bring: bring
      ? {
          connected: true,
          email: bring.config?.email || '',
          listUuid: bring.config?.listUuid || '',
          listName: bring.config?.listName || 'Bring!'
        }
      : { connected: false },
    gotify: gotify
      ? {
          connected: true,
          baseUrl: gotify.config?.baseUrl || '',
          applicationName:
            gotify.config?.applicationName || 'LX Family Planner',
          plannerUrl: gotify.config?.plannerUrl || '',
          rules: {
            ...DEFAULT_GOTIFY_RULES,
            ...(gotify.config?.rules || {})
          },
          updatedAt: gotify.updatedAt
        }
      : {
          connected: false,
          rules: { ...DEFAULT_GOTIFY_RULES }
        }
  };
}

function normalizeGotifyBaseUrl(value) {
  let url;
  try {
    url = new URL(requireText(value, 'Gotify-Adresse', 2000));
  } catch {
    const error = new Error('Die Gotify-Adresse ist ungültig.');
    error.statusCode = 400;
    throw error;
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    const error = new Error('Gotify muss über HTTP oder HTTPS erreichbar sein.');
    error.statusCode = 400;
    throw error;
  }
  if (url.username || url.password || url.search || url.hash) {
    const error = new Error(
      'Die Gotify-Adresse darf keine Zugangsdaten oder Parameter enthalten.'
    );
    error.statusCode = 400;
    throw error;
  }
  url.pathname = url.pathname.replace(/\/+$/, '');
  return url.href.replace(/\/$/, '');
}

function normalizePlannerUrl(value) {
  const input = cleanText(value, '', 2000);
  if (!input) return '';
  try {
    const url = new URL(input);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';
    return url.href.replace(/\/$/, '');
  } catch {
    const error = new Error('Die Adresse des Familienplaners ist ungültig.');
    error.statusCode = 400;
    throw error;
  }
}

function gotifyRules(value) {
  const input = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(
    Object.entries(DEFAULT_GOTIFY_RULES).map(([key, defaultValue]) => [
      key,
      Object.hasOwn(input, key) ? Boolean(input[key]) : defaultValue
    ])
  );
}

async function gotifyFetch(baseUrl, pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    redirect: 'error',
    signal: AbortSignal.timeout(10_000)
  });
  return response;
}

async function postGotifyMessage(baseUrl, token, payload, plannerUrl = '') {
  const extras = {
    'client::display': { contentType: 'text/plain' }
  };
  if (plannerUrl) {
    extras['client::notification'] = {
      click: { url: plannerUrl }
    };
  }
  const response = await gotifyFetch(baseUrl, '/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Gotify-Key': token
    },
    body: JSON.stringify({
      title: cleanText(payload.title, 'LX Family Planner', 140),
      message: cleanText(payload.message, 'Neue Familiennachricht', 3000),
      priority: Math.max(-2, Math.min(10, Number(payload.priority || 4))),
      extras
    })
  });
  if (!response.ok) {
    const error = new Error(
      `Gotify hat die Nachricht abgelehnt (${response.status}).`
    );
    error.statusCode = 502;
    throw error;
  }
  return response.json();
}

async function sendGotifyNotification(
  familyId,
  eventKey,
  { title, message, priority = 4 }
) {
  const integration = getIntegration(familyId, 'gotify');
  if (!integration) return false;
  const rules = {
    ...DEFAULT_GOTIFY_RULES,
    ...(integration.config?.rules || {})
  };
  if (eventKey && !rules[eventKey]) return false;
  const secret = decryptJson(integration.secretEncrypted);
  await postGotifyMessage(
    integration.config.baseUrl,
    secret.token,
    { title, message, priority },
    integration.config.plannerUrl
  );
  return true;
}

function queueGotifyNotification(familyId, eventKey, payload) {
  void sendGotifyNotification(familyId, eventKey, payload).catch(error => {
    console.error('Gotify-Benachrichtigung fehlgeschlagen:', error.message);
  });
}

function notifyChatViaGotify(req, record) {
  const integration = getIntegration(req.session.familyId, 'gotify');
  if (!integration) return;
  const rules = {
    ...DEFAULT_GOTIFY_RULES,
    ...(integration.config?.rules || {})
  };
  const isGroup = !record.target || record.target === 'group';
  const eventKey = isGroup ? 'groupChat' : 'directMessages';
  if (!rules[eventKey]) return;
  const messageText = rules.includeMessageText
    ? cleanText(
        record.text || (record.photo ? '📷 Foto gesendet' : 'Neue Nachricht'),
        'Neue Nachricht',
        800
      )
    : (
        record.photo
          ? 'Eine neue Nachricht mit Foto ist da.'
          : 'Eine neue Nachricht ist da.'
      );
  queueGotifyNotification(req.session.familyId, eventKey, {
    title: isGroup
      ? `Familienchat · ${record.senderName}`
      : `Direktnachricht · ${record.senderName}`,
    message: messageText,
    priority: isGroup ? 4 : 5
  });
}

function publicSessionPayload(session) {
  if (!session) return null;
  return {
    familyId: session.familyId,
    memberId: session.memberId,
    expiresAt: session.expiresAt
  };
}

function visibleChatMessages(records, memberId) {
  if (!memberId) return [];
  return records.filter(message => {
    const target = message.target || 'group';
    return (
      target === 'group' ||
      message.senderId === memberId ||
      target === memberId ||
      message.senderId === 'system'
    );
  });
}

function bootstrapForSession(session) {
  const bootstrap = getBootstrap(session.familyId);
  bootstrap.resources.chatMessages = visibleChatMessages(
    bootstrap.resources.chatMessages,
    session.memberId
  );
  bootstrap.familyRelationships = listFamilyRelationships(session.familyId);
  return bootstrap;
}

function sessionChatRecord(req, record) {
  const input = ensureObject(record);
  const member = req.session.memberId
    ? getMember(req.session.familyId, req.session.memberId)
    : null;
  if (!member) {
    const error = new Error('Bitte zuerst ein Profil auswählen.');
    error.statusCode = 403;
    throw error;
  }
  const target = cleanText(input.target, 'group', 100);
  if (target !== 'group' && !getMember(req.session.familyId, target)) {
    const error = new Error('Das Zielprofil wurde nicht gefunden.');
    error.statusCode = 404;
    throw error;
  }
  return {
    ...input,
    senderId: member.id,
    senderName: member.name,
    senderAvatar: member.avatar,
    senderColor: member.color,
    target,
    timestamp: Date.now()
  };
}

function canModifyChatRecord(req, record) {
  const member = req.session.memberId
    ? getMember(req.session.familyId, req.session.memberId)
    : null;
  return Boolean(
    member &&
    (record?.senderId === member.id || ADULT_ROLES.has(member.role))
  );
}

function recipeCandidates(value) {
  if (Array.isArray(value)) return value.flatMap(recipeCandidates);
  if (!value || typeof value !== 'object') return [];
  const candidates = [];
  if (value['@type'] === 'Recipe' ||
      (Array.isArray(value['@type']) && value['@type'].includes('Recipe'))) {
    candidates.push(value);
  }
  if (value['@graph']) candidates.push(...recipeCandidates(value['@graph']));
  return candidates;
}

function recipeImageCandidates(value) {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(recipeImageCandidates);
  if (typeof value !== 'object') return [];
  return [
    value.url,
    value.contentUrl,
    value.thumbnailUrl,
    value.image,
    value.primaryImageOfPage
  ].flatMap(recipeImageCandidates);
}

function resolveExternalUrl(value, baseUrl) {
  const candidate = cleanText(value, '', 2000);
  if (!candidate) return '';
  try {
    const resolved = new URL(candidate, baseUrl);
    return ['http:', 'https:'].includes(resolved.protocol)
      ? resolved.href
      : '';
  } catch {
    return '';
  }
}

function recipeInstructionText(value) {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(recipeInstructionText);
  if (typeof value !== 'object') return [];
  return [
    value.text,
    value.name,
    value.itemListElement,
    value.steps
  ].flatMap(recipeInstructionText);
}

function firstRecipeText(value, fallback = '', maxLength = 160) {
  if (Array.isArray(value)) {
    const first = value
      .map(item => cleanText(item, '', maxLength))
      .find(Boolean);
    return first || fallback;
  }
  return cleanText(value, fallback, maxLength);
}

function formatRecipeDuration(value) {
  const duration = firstRecipeText(value, '', 40);
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/i.exec(duration);
  if (!match) return duration;
  const parts = [];
  if (match[1]) parts.push(`${Number(match[1])} Std.`);
  if (match[2]) parts.push(`${Number(match[2])} Min.`);
  return parts.join(' ');
}

function normalizeRecipe(recipe, url, fallbackImage = '') {
  const image = [
    ...recipeImageCandidates(recipe.image),
    ...recipeImageCandidates(recipe.thumbnailUrl),
    ...recipeImageCandidates(recipe.primaryImageOfPage),
    fallbackImage
  ]
    .map(candidate => resolveExternalUrl(candidate, url))
    .find(Boolean) || '';
  const instructions = Array.isArray(recipe.recipeInstructions)
    ? recipeInstructionText(recipe.recipeInstructions)
        .map(step => cleanText(step, '', 1200))
        .filter(Boolean)
        .join('\n')
    : cleanText(recipe.recipeInstructions, '', 10000);
  return {
    title: cleanText(recipe.name, 'Importiertes Rezept', 160),
    image: cleanText(image, '', 1000),
    ingredients: Array.isArray(recipe.recipeIngredient)
      ? recipe.recipeIngredient.map(item => cleanText(item, '', 240)).filter(Boolean)
      : [],
    instructions,
    prepTime: formatRecipeDuration(recipe.prepTime),
    cookTime: formatRecipeDuration(recipe.cookTime),
    totalTime: formatRecipeDuration(recipe.totalTime),
    servings: firstRecipeText(recipe.recipeYield, '', 80),
    sourceUrl: url,
    source: 'recipe-import'
  };
}

function sanitizeDashboardLink(req, value) {
  const input = ensureObject(value);
  const memberId = requireText(input.memberId, 'Kinderprofil', 100);
  const member = getMember(req.session.familyId, memberId);
  if (!member || !['child', 'teen'].includes(member.role)) {
    const error = new Error('Bitte ein Kinder- oder Teenagerprofil auswählen.');
    error.statusCode = 400;
    throw error;
  }

  let url;
  try {
    url = new URL(requireText(input.url, 'YouTube-Adresse', 2000));
  } catch {
    const error = new Error('Die YouTube-Adresse ist ungültig.');
    error.statusCode = 400;
    throw error;
  }
  if (url.protocol !== 'https:' || !YOUTUBE_HOSTS.has(url.hostname.toLowerCase())) {
    const error = new Error('Es sind nur sichere YouTube-Adressen erlaubt.');
    error.statusCode = 400;
    throw error;
  }

  return {
    ...input,
    memberId,
    title: requireText(input.title, 'Titel', 80),
    url: url.href,
    kind: 'youtube',
    color: cleanText(input.color, '#ff4f55', 24),
    createdAt: Number(input.createdAt || Date.now())
  };
}

async function fetchBringClient(familyId) {
  const integration = getIntegration(familyId, 'bring');
  if (!integration) {
    const error = new Error('Bring! ist noch nicht verbunden.');
    error.statusCode = 404;
    throw error;
  }
  const credentials = decryptJson(integration.secretEncrypted);
  const client = new BringApi({
    mail: credentials.email,
    password: credentials.password
  });
  await client.login();
  return { client, integration };
}

function bringItemId(name) {
  return `bring-${createHash('sha256')
    .update(String(name).trim().toLocaleLowerCase('de-DE'))
    .digest('hex')
    .slice(0, 20)}`;
}

function mapBringItems(response, source = 'bring') {
  const purchase = Array.isArray(response?.purchase) ? response.purchase : [];
  const recently = Array.isArray(response?.recently) ? response.recently : [];
  const now = Date.now();
  return [
    ...purchase.map((item, index) => ({
      id: bringItemId(item.name),
      name: cleanText(item.name, 'Artikel', 160),
      quantity: cleanText(item.specification, '1x', 160),
      icon: '🛒',
      category: 'Bring!',
      isSelected: true,
      inCart: false,
      household: 'familie',
      source,
      sortOrder: index,
      updatedAt: now
    })),
    ...recently.map((item, index) => ({
      id: bringItemId(item.name),
      name: cleanText(item.name, 'Artikel', 160),
      quantity: cleanText(item.specification, '', 160),
      icon: '✓',
      category: 'Verlauf',
      isSelected: true,
      inCart: true,
      household: 'familie',
      source,
      sortOrder: purchase.length + index,
      updatedAt: now
    }))
  ];
}

function applyBringRecords(familyId, response) {
  replaceRecordsBySource(
    familyId,
    'shoppingItems',
    'bring',
    mapBringItems(response)
  );
  return listRecords(familyId, 'shoppingItems');
}

function sanitizeAgentRecord(type, data, familyId) {
  const input = ensureObject(data);
  const record = { ...input, familyId };
  if (type === 'chatMessages') {
    return {
      ...record,
      text: requireText(input.text || input.message, 'Nachricht', 2000),
      senderId: cleanText(input.senderId || 'agent', 'agent', 100),
      senderName: cleanText(input.senderName || 'Familienassistent', 'Familienassistent', 100),
      timestamp: Number(input.timestamp || Date.now()),
      isAgent: true
    };
  }
  if (type === 'tasks') {
    return {
      ...record,
      title: requireText(input.title || input.text, 'Aufgabe', 200),
      memberId: cleanText(input.memberId || input.assigneeId, '', 100),
      stars: Math.max(0, Math.min(1000, Number(input.stars || 10))),
      completed: Boolean(input.completed)
    };
  }
  return record;
}

export function createApp() {
  const app = express();
  const liveClients = new Map();
  const publishFamilyChange = (familyId, reason = 'update') => {
    const clients = liveClients.get(familyId);
    if (!clients?.size) return;
    const message = `event: family-update\ndata: ${JSON.stringify({
      version: getFamilyVersion(familyId),
      reason
    })}\n\n`;
    clients.forEach(client => client.write(message));
  };
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()'
    );
    if (IS_PRODUCTION) {
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self' data:"
      );
    }
    next();
  });
  app.use(express.json({ limit: JSON_LIMIT }));
  app.use(sessionMiddleware);

  app.get('/api/health', (_req, res) => {
    res.json({
      success: true,
      status: 'ok',
      database: 'sqlite',
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/public/families', (_req, res) => {
    res.json({ success: true, families: listPublicFamilies() });
  });

  app.post('/api/public/register', authRateLimit, (req, res) => {
    const input = ensureObject(req.body);
    const familyName = requireText(input.familyName, 'Familienname', 100);
    const password = requireText(input.password, 'Passwort', 100);
    if (password.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Das Familienpasswort muss mindestens 4 Zeichen lang sein.'
      });
    }
    const members = Array.isArray(input.members) ? input.members : [];
    if (members.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Lege mindestens ein Familienmitglied an.'
      });
    }
    const normalizedMembers = members.slice(0, 20).map(normalizeMemberInput);
    const result = createFamily({
      familyName,
      familyAvatar: cleanText(input.familyAvatar, '', 1_200_000),
      badge: cleanText(input.badge, 'Unsere Familie', 60),
      password,
      members: normalizedMembers
    });
    const initialMember =
      result.members.find(member => ADULT_ROLES.has(member.role)) ||
      result.members[0];
    const sessionToken = createSession(result.family.id, {
      memberId: initialMember?.id || null,
      maxAgeMs: SESSION_MAX_AGE_MS
    });
    const session = getSession(sessionToken);
    clearAuthAttempts(req);
    res.setHeader(
      'Set-Cookie',
      sessionCookie(sessionToken, secureCookieForRequest(req))
    );
    res.status(201).json({
      success: true,
      family: result.family,
      members: result.members,
      activeMemberId: initialMember?.id || null,
      session: publicSessionPayload(session)
    });
  });

  app.post('/api/auth/family', authRateLimit, (req, res) => {
    const input = ensureObject(req.body);
    const familyId = requireText(input.familyId, 'Familie', 100);
    const password = requireText(input.password, 'Passwort', 100);
    const familyRow = getFamilyAuthRow(familyId);
    if (!familyRow || !verifySecret(password, familyRow.password_hash)) {
      return res.status(401).json({
        success: false,
        error: 'Familie oder Passwort ist nicht korrekt.'
      });
    }
    const sessionToken = createSession(familyId, {
      maxAgeMs: SESSION_MAX_AGE_MS
    });
    const session = getSession(sessionToken);
    clearAuthAttempts(req);
    res.setHeader(
      'Set-Cookie',
      sessionCookie(sessionToken, secureCookieForRequest(req))
    );
    res.json({
      success: true,
      family: getFamily(familyId),
      members: getBootstrap(familyId).members,
      session: publicSessionPayload(session)
    });
  });

  app.post('/api/auth/member', requireAuth, (req, res) => {
    const input = ensureObject(req.body);
    const memberId = requireText(input.memberId, 'Profil', 100);
    const memberRow = getMemberAuthRow(req.session.familyId, memberId);
    if (!memberRow) {
      return res.status(404).json({
        success: false,
        error: 'Profil nicht gefunden.'
      });
    }
    const currentMember = req.session.memberId
      ? getMember(req.session.familyId, req.session.memberId)
      : null;
    const targetIsAdult = ADULT_ROLES.has(memberRow.role);
    const currentIsAdult = currentMember && ADULT_ROLES.has(currentMember.role);
    if (targetIsAdult && currentMember && !currentIsAdult && !memberRow.pin_hash) {
      const familyRow = getFamilyAuthRow(req.session.familyId);
      if (
        !verifySecret(
          cleanText(input.familyPassword, '', 100),
          familyRow.password_hash
        )
      ) {
        return res.status(401).json({
          success: false,
          error: 'Für ein Erwachsenenprofil wird das Familienpasswort benötigt.',
          requiresFamilyPassword: true
        });
      }
    }
    if (memberRow.pin_hash && !verifySecret(cleanText(input.pin, '', 12), memberRow.pin_hash)) {
      return res.status(401).json({
        success: false,
        error: 'Die Profil-PIN ist nicht korrekt.'
      });
    }
    setSessionMember(req.sessionToken, req.session.familyId, memberId);
    req.session = getSession(req.sessionToken);
    res.json({
      success: true,
      member: getMember(req.session.familyId, memberId),
      session: publicSessionPayload(req.session)
    });
  });

  app.get('/api/auth/session', (req, res) => {
    if (!req.session) {
      return res.status(401).json({ success: false, authenticated: false });
    }
    res.json({
      success: true,
      authenticated: true,
      session: publicSessionPayload(req.session),
      family: getFamily(req.session.familyId),
      member: req.session.memberId
        ? getMember(req.session.familyId, req.session.memberId)
        : null
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    if (req.sessionToken) deleteSession(req.sessionToken);
    res.setHeader(
      'Set-Cookie',
      clearSessionCookie(secureCookieForRequest(req))
    );
    res.json({ success: true });
  });

  app.get('/api/bootstrap', requireAuth, (req, res) => {
    res.json({
      success: true,
      ...bootstrapForSession(req.session),
      activeMemberId: req.session.memberId,
      integrations: integrationStatus(req.session.familyId)
    });
  });

  app.get('/api/family/version', requireAuth, (req, res) => {
    res.json({
      success: true,
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.get('/api/live', requireAuth, (req, res) => {
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    res.write('retry: 4000\n');
    res.write(`event: ready\ndata: ${JSON.stringify({
      version: getFamilyVersion(req.session.familyId)
    })}\n\n`);

    const familyId = req.session.familyId;
    const clients = liveClients.get(familyId) || new Set();
    clients.add(res);
    liveClients.set(familyId, clients);
    const heartbeat = setInterval(() => {
      res.write(': verbunden\n\n');
    }, 25_000);

    req.on('close', () => {
      clearInterval(heartbeat);
      clients.delete(res);
      if (!clients.size) liveClients.delete(familyId);
    });
  });

  app.get('/api/family/relationships', requireAuth, (req, res) => {
    res.json({
      success: true,
      relationships: listFamilyRelationships(req.session.familyId),
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.post('/api/family/relationships', requireAuth, requireAdult, (req, res) => {
    const input = ensureObject(req.body);
    const targetFamilyId = requireText(
      input.targetFamilyId,
      'Verwandte Familie',
      100
    );
    const relationType = cleanText(
      input.relationType,
      'relative',
      20
    ).toLowerCase();
    if (!FAMILY_RELATION_TYPES.has(relationType)) {
      return res.status(400).json({
        success: false,
        error: 'Diese Familienbeziehung wird nicht unterstützt.'
      });
    }
    const relationship = createFamilyRelationshipRequest(
      req.session.familyId,
      targetFamilyId,
      relationType,
      req.session.memberId
    );
    res.status(201).json({
      success: true,
      relationship,
      relationships: listFamilyRelationships(req.session.familyId),
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.patch(
    '/api/family/relationships/:relationshipId',
    requireAuth,
    requireAdult,
    (req, res) => {
      const status = cleanText(req.body?.status, '', 20).toLowerCase();
      if (!['accepted', 'declined'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Bitte die Anfrage annehmen oder ablehnen.'
        });
      }
      const relationship = respondFamilyRelationship(
        req.session.familyId,
        req.params.relationshipId,
        status === 'accepted',
        req.session.memberId
      );
      if (!relationship) {
        return res.status(404).json({
          success: false,
          error: 'Die offene Familienanfrage wurde nicht gefunden.'
        });
      }
      res.json({
        success: true,
        relationship,
        relationships: listFamilyRelationships(req.session.familyId),
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.delete(
    '/api/family/relationships/:relationshipId',
    requireAuth,
    requireAdult,
    (req, res) => {
      if (
        !deleteFamilyRelationship(
          req.session.familyId,
          req.params.relationshipId
        )
      ) {
        return res.status(404).json({
          success: false,
          error: 'Die Familienverknüpfung wurde nicht gefunden.'
        });
      }
      res.json({
        success: true,
        relationships: listFamilyRelationships(req.session.familyId),
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.patch('/api/family', requireAuth, requireAdult, (req, res) => {
    const input = ensureObject(req.body);
    const changes = {};
    if (Object.hasOwn(input, 'familyName')) {
      changes.familyName = requireText(input.familyName, 'Familienname', 100);
    }
    if (Object.hasOwn(input, 'familyAvatar')) {
      changes.familyAvatar = cleanText(input.familyAvatar, '', 1_200_000);
    }
    if (Object.hasOwn(input, 'badge')) {
      changes.badge = cleanText(input.badge, 'Familie', 60);
    }
    if (input.password) {
      changes.password = requireText(input.password, 'Passwort', 100);
      if (changes.password.length < 4) {
        return res.status(400).json({
          success: false,
          error: 'Das Passwort muss mindestens 4 Zeichen lang sein.'
        });
      }
    }
    const family = updateFamily(req.session.familyId, changes);
    res.json({ success: true, family, version: getFamilyVersion(req.session.familyId) });
  });

  app.delete('/api/family', requireAuth, requireAdult, (req, res) => {
    const input = ensureObject(req.body || {});
    const password = requireText(input.password, 'Passwort', 100);
    const familyRow = getFamilyAuthRow(req.session.familyId);
    if (!familyRow || !verifySecret(password, familyRow.password_hash)) {
      return res.status(401).json({
        success: false,
        error: 'Das Familienpasswort ist nicht korrekt.'
      });
    }
    const familyId = req.session.familyId;
    deleteSession(req.sessionToken);
    deleteFamily(familyId);
    res.setHeader(
      'Set-Cookie',
      clearSessionCookie(secureCookieForRequest(req))
    );
    res.json({ success: true });
  });

  app.post('/api/members', requireAuth, requireAdult, (req, res) => {
    const member = createMember(
      req.session.familyId,
      normalizeMemberInput(req.body)
    );
    res.status(201).json({
      success: true,
      member,
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.patch('/api/members/:memberId', requireAuth, (req, res) => {
    const target = getMember(req.session.familyId, req.params.memberId);
    if (!target) {
      return res.status(404).json({ success: false, error: 'Profil nicht gefunden.' });
    }
    const active = req.session.memberId
      ? getMember(req.session.familyId, req.session.memberId)
      : null;
    const isSelf = active?.id === target.id;
    const isAdult = active && ADULT_ROLES.has(active.role);
    if (!isSelf && !isAdult) {
      return res.status(403).json({
        success: false,
        error: 'Du darfst dieses Profil nicht bearbeiten.'
      });
    }
    const input = ensureObject(req.body);
    const changes = {};
    const allowedSelfFields = ['name', 'avatar', 'color', 'bgColor', 'theme', 'pin'];
    const allowedAdultFields = [...allowedSelfFields, 'role', 'position', 'stars'];
    for (const key of isAdult ? allowedAdultFields : allowedSelfFields) {
      if (Object.hasOwn(input, key)) changes[key] = input[key];
    }
    if (Object.hasOwn(changes, 'name')) {
      changes.name = requireText(changes.name, 'Name', 80);
    }
    if (Object.hasOwn(changes, 'role')) {
      changes.role = normalizeRole(changes.role);
    }
    if (Object.hasOwn(changes, 'position')) {
      changes.position = cleanText(changes.position, 'familienmitglied', 40);
    }
    const member = updateMember(req.session.familyId, target.id, changes);
    res.json({
      success: true,
      member,
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.delete('/api/members/:memberId', requireAuth, requireAdult, (req, res) => {
    if (req.session.memberId === req.params.memberId) {
      return res.status(409).json({
        success: false,
        error: 'Das aktuell verwendete Profil kann nicht gelöscht werden.'
      });
    }
    if (!deleteMember(req.session.familyId, req.params.memberId)) {
      return res.status(404).json({ success: false, error: 'Profil nicht gefunden.' });
    }
    res.json({
      success: true,
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.post(
    '/api/admin/members/:memberId/reset-stars',
    requireAuth,
    requireAdult,
    (req, res) => {
      const target = getMember(req.session.familyId, req.params.memberId);
      if (!target || !['child', 'teen'].includes(target.role)) {
        return res.status(404).json({
          success: false,
          error: 'Das Kinderprofil wurde nicht gefunden.'
        });
      }
      const member = updateMember(req.session.familyId, target.id, {
        stars: 0
      });
      res.json({
        success: true,
        member,
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.delete('/api/admin/tasks', requireAuth, requireAdult, (req, res) => {
    const memberId = cleanText(req.body?.memberId, '', 100);
    if (memberId && !getMember(req.session.familyId, memberId)) {
      return res.status(404).json({
        success: false,
        error: 'Das ausgewählte Profil wurde nicht gefunden.'
      });
    }
    const result = deleteTaskRecords(req.session.familyId, {
      memberId,
      completedOnly: Boolean(req.body?.completedOnly)
    });
    if (result.deleted) {
      publishFamilyChange(req.session.familyId, 'tasks');
    }
    res.json({
      success: true,
      ...result,
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.get('/api/resources/:type', requireAuth, (req, res) => {
    let records = listRecords(req.session.familyId, req.params.type);
    if (req.params.type === 'chatMessages') {
      records = visibleChatMessages(records, req.session.memberId);
    }
    res.json({
      success: true,
      records,
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.post('/api/resources/:type/bulk', requireAuth, requireResourceManager, (req, res) => {
    if (!BULK_RESOURCE_TYPES.has(req.params.type)) {
      return res.status(405).json({
        success: false,
        error: 'Für diesen Bereich ist kein Sammelimport vorgesehen.'
      });
    }
    if (!Array.isArray(req.body?.records)) {
      return res.status(400).json({
        success: false,
        error: 'Eine Datensatzliste wird benötigt.'
      });
    }
    const records = upsertRecords(
      req.session.familyId,
      req.params.type,
      req.body.records.slice(0, 500).map(record => ensureObject(record))
    );
    const version = getFamilyVersion(req.session.familyId);
    if (records.length) {
      publishFamilyChange(req.session.familyId, req.params.type);
    }
    res.json({ success: true, records, version });
  });

  app.post('/api/resources/:type', requireAuth, requireResourceManager, (req, res) => {
    let input = ensureObject(req.body);
    if (req.params.type === 'chatMessages') {
      input = sessionChatRecord(req, input);
    }
    if (req.params.type === 'moodCheckins') {
      if (!req.session.memberId) {
        return res.status(403).json({
          success: false,
          error: 'Bitte zuerst ein Profil auswählen.'
        });
      }
      input = {
        ...input,
        memberId: req.session.memberId,
        mood: cleanText(input.mood, 'okay', 40),
        createdAt: Date.now()
      };
    }
    if (req.params.type === 'dashboardLinks') {
      input = sanitizeDashboardLink(req, input);
    }
    if (req.params.type === 'tasks') {
      const creator = getMember(req.session.familyId, req.session.memberId);
      input = {
        ...input,
        completed: false,
        completionStatus: 'open',
        createdByMemberId: creator?.id || null,
        createdByName: creator?.name || 'Elternteil',
        createdAt: Number(input.createdAt) || Date.now()
      };
    }
    const record = createRecord(
      req.session.familyId,
      req.params.type,
      input
    );
    if (req.params.type === 'chatMessages') {
      notifyChatViaGotify(req, record);
      notifyChatViaWebPush(req, record);
    }
    notifyCreatedResourceViaWebPush(req, req.params.type, record);
    if (
      req.params.type === 'moodCheckins' &&
      record.mood === 'hilfe'
    ) {
      const member = getMember(req.session.familyId, req.session.memberId);
      queueGotifyNotification(req.session.familyId, 'moodHelp', {
        title: `${member?.name || 'Ein Familienmitglied'} braucht Nähe`,
        message:
          'Im Familienkompass wurde „Brauche Nähe“ ausgewählt. Schau bitte kurz nach.',
        priority: 8
      });
    }
    publishFamilyChange(req.session.familyId, req.params.type);
    res.status(201).json({
      success: true,
      record,
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.patch('/api/resources/:type/:id', requireAuth, requireResourceManager, (req, res) => {
    if (req.params.type === 'chatMessages') {
      const existing = getRecord(
        req.session.familyId,
        'chatMessages',
        req.params.id
      );
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Nachricht nicht gefunden.'
        });
      }
      if (!canModifyChatRecord(req, existing)) {
        return res.status(403).json({
          success: false,
          error: 'Du darfst diese Nachricht nicht bearbeiten.'
        });
      }
    }
    let changes;
    if (req.params.type === 'chatMessages') {
      changes = {
        text: cleanText(req.body?.text, '', 2000),
        photo: cleanText(req.body?.photo, '', 1_800_000)
      };
    } else if (req.params.type === 'dashboardLinks') {
      const existing = getRecord(
        req.session.familyId,
        'dashboardLinks',
        req.params.id
      );
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Dashboard-Link nicht gefunden.'
        });
      }
      changes = sanitizeDashboardLink(req, {
        ...existing,
        ...ensureObject(req.body)
      });
    } else if (req.params.type === 'tasks') {
      changes = Object.fromEntries(
        Object.entries(ensureObject(req.body)).filter(
          ([key]) => !PROTECTED_TASK_FIELDS.has(key)
        )
      );
    } else {
      changes = ensureObject(req.body);
    }
    const record = updateRecord(
      req.session.familyId,
      req.params.type,
      req.params.id,
      changes
    );
    if (!record) {
      return res.status(404).json({ success: false, error: 'Eintrag nicht gefunden.' });
    }
    publishFamilyChange(req.session.familyId, req.params.type);
    res.json({
      success: true,
      record,
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.delete('/api/resources/:type/:id', requireAuth, requireResourceManager, (req, res) => {
    if (req.params.type === 'chatMessages') {
      const existing = getRecord(
        req.session.familyId,
        'chatMessages',
        req.params.id
      );
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: 'Nachricht nicht gefunden.'
        });
      }
      if (!canModifyChatRecord(req, existing)) {
        return res.status(403).json({
          success: false,
          error: 'Du darfst diese Nachricht nicht löschen.'
        });
      }
    }
    if (!deleteRecord(req.session.familyId, req.params.type, req.params.id)) {
      return res.status(404).json({ success: false, error: 'Eintrag nicht gefunden.' });
    }
    publishFamilyChange(req.session.familyId, req.params.type);
    res.json({
      success: true,
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.post('/api/tasks/:taskId/toggle', requireAuth, (req, res) => {
    const task = getRecord(req.session.familyId, 'tasks', req.params.taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Aufgabe nicht gefunden.'
      });
    }
    const member = req.session.memberId
      ? getMember(req.session.familyId, req.session.memberId)
      : null;
    if (!member || (!ADULT_ROLES.has(member.role) && task.memberId !== member.id)) {
      return res.status(403).json({
        success: false,
        error: 'Du kannst nur deine eigenen Missionen abschließen.'
      });
    }

    let result;
    if (!ADULT_ROLES.has(member.role)) {
      if (task.completed) {
        return res.status(409).json({
          success: false,
          error: 'Diese Aufgabe wurde bereits bestätigt.'
        });
      }
      result = requestTaskApprovalRecord(
        req.session.familyId,
        req.params.taskId,
        member.id
      );
      if (result?.action === 'approval_requested') {
        const creator = task.createdByMemberId
          ? getMember(req.session.familyId, task.createdByMemberId)
          : null;
        const recipientMemberIds = creator
          ? [creator.id]
          : getMembers(req.session.familyId)
              .filter(entry => ADULT_ROLES.has(entry.role))
              .map(entry => entry.id);
        queueGotifyNotification(req.session.familyId, 'taskApproval', {
          title: `${member.name} wartet auf deine Freigabe`,
          message: `"${task.title}" wurde als erledigt gemeldet.`,
          priority: 6
        });
        queueWebPushEvent(req.session.familyId, 'taskApproval', {
          recipientMemberIds,
          excludeMemberIds: [member.id],
          title: `${member.name} wartet auf deine Freigabe`,
          body: `"${task.title}" wurde als erledigt gemeldet.`,
          privateTitle: 'Eine Aufgabe wartet auf Freigabe',
          privateBody: 'Bitte prüfe eine erledigte Mission im Familienplaner.',
          url: '/?view=tasks',
          tag: `task-approval-${task.id}`,
          priority: 'high',
          ttl: 1800
        });
      }
    } else {
      const creator = task.createdByMemberId
        ? getMember(req.session.familyId, task.createdByMemberId)
        : null;
      if (
        task.completionStatus === 'pending_approval' &&
        creator &&
        task.createdByMemberId !== member.id
      ) {
        return res.status(403).json({
          success: false,
          error: `Diese Aufgabe muss von ${task.createdByName || 'dem Ersteller'} bestätigt werden.`
        });
      }
      result = toggleTaskRecord(
        req.session.familyId,
        req.params.taskId,
        member.id
      );
    }
    if (result?.task.completed) {
      notifyTaskCompleted(req, result, member.id);
    }
    publishFamilyChange(req.session.familyId, 'tasks');
    res.json({
      success: true,
      ...result,
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.post(
    '/api/tasks/:taskId/review',
    requireAuth,
    requireAdult,
    (req, res) => {
      const task = getRecord(req.session.familyId, 'tasks', req.params.taskId);
      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Aufgabe nicht gefunden.'
        });
      }
      if (
        task.createdByMemberId &&
        getMember(req.session.familyId, task.createdByMemberId) &&
        task.createdByMemberId !== req.activeMember.id
      ) {
        return res.status(403).json({
          success: false,
          error: `Diese Aufgabe kann nur von ${task.createdByName || 'dem Ersteller'} geprüft werden.`
        });
      }
      if (task.completionStatus !== 'pending_approval' || task.completed) {
        return res.status(409).json({
          success: false,
          error: 'Für diese Aufgabe liegt keine offene Prüfung vor.'
        });
      }
      if (typeof req.body?.approved !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'Bitte bestätige oder lehne die Prüfung eindeutig ab.'
        });
      }
      const approved = req.body.approved;
      const result = reviewTaskRecord(
        req.session.familyId,
        req.params.taskId,
        req.activeMember.id,
        approved
      );
      if (approved) {
        notifyTaskCompleted(req, result, req.activeMember.id);
      } else {
        queueWebPushEvent(req.session.familyId, 'taskApproval', {
          recipientMemberIds: [task.memberId],
          excludeMemberIds: [req.activeMember.id],
          title: 'Bitte schau noch einmal nach',
          body: `"${task.title}" wurde noch nicht bestätigt.`,
          privateTitle: 'Eine Aufgabe braucht noch einen Versuch',
          privateBody: 'Im Familienplaner wartet eine Mission wieder auf dich.',
          url: '/?view=tasks',
          tag: `task-rejected-${task.id}`
        });
      }
      publishFamilyChange(req.session.familyId, 'tasks');
      res.json({
        success: true,
        ...result,
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.post('/api/rewards/:rewardId/redeem', requireAuth, (req, res) => {
    const memberId = cleanText(req.body?.memberId || req.session.memberId, '', 100);
    if (!memberId) {
      return res.status(400).json({
        success: false,
        error: 'Bitte ein Profil auswählen.'
      });
    }
    const activeMember = req.session.memberId
      ? getMember(req.session.familyId, req.session.memberId)
      : null;
    if (
      activeMember &&
      !ADULT_ROLES.has(activeMember.role) &&
      activeMember.id !== memberId
    ) {
      return res.status(403).json({
        success: false,
        error: 'Du kannst Belohnungen nur für dich selbst einlösen.'
      });
    }
    const result = redeemRewardRecord(
      req.session.familyId,
      req.params.rewardId,
      memberId
    );
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Belohnung oder Profil nicht gefunden.'
      });
    }
    res.json({
      success: true,
      ...result,
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.get('/api/push/status', requireAuth, (req, res) => {
    if (!req.session.memberId) {
      return res.status(403).json({
        success: false,
        error: 'Bitte zuerst ein Familienprofil auswählen.'
      });
    }
    const vapid = getVapidConfig();
    const subscriptions = listPushSubscriptions(req.session.familyId, {
      memberId: req.session.memberId
    });
    const currentEndpoint = cleanText(req.query?.endpoint, '', 4000);
    const currentDevice = currentEndpoint
      ? subscriptions.find(subscription => subscription.endpoint === currentEndpoint)
      : null;
    res.json({
      success: true,
      publicKey: vapid.publicKey,
      defaults: { ...DEFAULT_WEB_PUSH_PREFERENCES },
      currentDeviceId: currentDevice?.id || '',
      devices: subscriptions.map(publicPushDevice)
    });
  });

  app.post('/api/push/subscriptions', requireAuth, (req, res) => {
    if (!req.session.memberId) {
      return res.status(403).json({
        success: false,
        error: 'Bitte zuerst ein Familienprofil auswählen.'
      });
    }
    const input = ensureObject(req.body);
    const subscriptionInput = ensureObject(
      input.subscription,
      'Die Browser-Anmeldung fehlt.'
    );
    const endpoint = requireText(
      subscriptionInput.endpoint,
      'Push-Endpunkt',
      4000
    );
    let endpointUrl;
    try {
      endpointUrl = new URL(endpoint);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Der Push-Endpunkt ist ungültig.'
      });
    }
    if (endpointUrl.protocol !== 'https:') {
      return res.status(400).json({
        success: false,
        error: 'Der Push-Endpunkt muss HTTPS verwenden.'
      });
    }
    const keys = ensureObject(
      subscriptionInput.keys,
      'Die Browser-Schlüssel fehlen.'
    );
    const saved = savePushSubscription({
      familyId: req.session.familyId,
      memberId: req.session.memberId,
      endpoint,
      keys: {
        p256dh: requireText(keys.p256dh, 'Browser-Schlüssel', 1000),
        auth: requireText(keys.auth, 'Browser-Anmeldeschlüssel', 1000)
      },
      deviceName: cleanText(input.deviceName, 'Dieses Gerät', 100),
      preferences: normalizePushPreferences(input.preferences)
    });
    res.status(201).json({
      success: true,
      device: publicPushDevice(saved)
    });
  });

  app.delete('/api/push/subscriptions', requireAuth, (req, res) => {
    if (!req.session.memberId) {
      return res.status(403).json({
        success: false,
        error: 'Bitte zuerst ein Familienprofil auswählen.'
      });
    }
    const endpoint = requireText(req.body?.endpoint, 'Push-Endpunkt', 4000);
    deletePushSubscription(
      req.session.familyId,
      req.session.memberId,
      endpoint
    );
    res.json({
      success: true,
      unsubscribeBrowser: countPushSubscriptionsByEndpoint(endpoint) === 0
    });
  });

  app.post('/api/push/test', requireAuth, async (req, res) => {
    if (!req.session.memberId) {
      return res.status(403).json({
        success: false,
        error: 'Bitte zuerst ein Familienprofil auswählen.'
      });
    }
    const member = getMember(req.session.familyId, req.session.memberId);
    const result = await sendWebPushEvent(req.session.familyId, null, {
      recipientMemberIds: [req.session.memberId],
      title: `Hallo ${member?.name || ''}!`,
      body: 'Browser-Benachrichtigungen funktionieren auf diesem Gerät.',
      privateTitle: 'LX Family Planner',
      privateBody: 'Deine Benachrichtigungen sind startklar.',
      url: '/?view=dashboard',
      tag: `push-test-${req.session.memberId}`,
      ttl: 300
    });
    if (!result.sent) {
      return res.status(409).json({
        success: false,
        error: 'Für dieses Profil ist noch kein erreichbares Gerät angemeldet.'
      });
    }
    res.json({ success: true, ...result });
  });

  app.get('/api/push/devices', requireAuth, requireAdult, (req, res) => {
    const membersById = new Map(
      getMembers(req.session.familyId).map(member => [member.id, member])
    );
    const devices = listPushSubscriptions(req.session.familyId).map(
      subscription => ({
        ...publicPushDevice(subscription),
        memberName:
          membersById.get(subscription.memberId)?.name || 'Familienprofil'
      })
    );
    res.json({ success: true, devices });
  });

  app.delete(
    '/api/push/devices/:deviceId',
    requireAuth,
    requireAdult,
    (req, res) => {
      const deleted = deletePushSubscriptionById(
        req.session.familyId,
        req.params.deviceId
      );
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Dieses Gerät wurde nicht gefunden.'
        });
      }
      res.json({ success: true });
    }
  );

  app.get('/api/integrations', requireAuth, (req, res) => {
    res.json({ success: true, integrations: integrationStatus(req.session.familyId) });
  });

  app.post(
    '/api/integrations/gotify/setup',
    requireAuth,
    requireAdult,
    async (req, res) => {
      if (getIntegration(req.session.familyId, 'gotify')) {
        return res.status(409).json({
          success: false,
          error: 'Gotify ist für diese Familie bereits eingerichtet.'
        });
      }
      const baseUrl = normalizeGotifyBaseUrl(req.body?.baseUrl);
      const username = requireText(req.body?.username, 'Gotify-Benutzer', 160);
      const password = requireText(req.body?.password, 'Gotify-Passwort', 300);
      const plannerUrl = normalizePlannerUrl(req.body?.plannerUrl);
      const rules = gotifyRules(req.body?.rules);

      const versionResponse = await gotifyFetch(baseUrl, '/version');
      if (!versionResponse.ok) {
        return res.status(502).json({
          success: false,
          error: 'Der Gotify-Server antwortet nicht korrekt.'
        });
      }

      const family = getFamily(req.session.familyId);
      const applicationName = `LX Family Planner · ${family.familyName}`;
      const form = new FormData();
      form.set('name', applicationName);
      form.set(
        'description',
        'Benachrichtigungen aus dem privaten LX Family Planner'
      );
      const authorization = Buffer.from(
        `${username}:${password}`,
        'utf8'
      ).toString('base64');
      const applicationResponse = await gotifyFetch(
        baseUrl,
        '/application',
        {
          method: 'POST',
          headers: { Authorization: `Basic ${authorization}` },
          body: form
        }
      );
      if (!applicationResponse.ok) {
        return res.status(applicationResponse.status === 401 ? 401 : 502).json({
          success: false,
          error:
            applicationResponse.status === 401
              ? 'Gotify-Benutzer oder Passwort ist nicht korrekt.'
              : 'Die Gotify-Anwendung konnte nicht angelegt werden.'
        });
      }
      const application = await applicationResponse.json();
      const token = cleanText(application.token, '', 500);
      if (!token) {
        return res.status(502).json({
          success: false,
          error: 'Gotify hat keinen App-Token zurückgegeben.'
        });
      }

      await postGotifyMessage(
        baseUrl,
        token,
        {
          title: 'LX Family Planner ist verbunden',
          message:
            'Push-Benachrichtigungen für eure Familie sind jetzt aktiv.',
          priority: 5
        },
        plannerUrl
      );
      saveIntegration(
        req.session.familyId,
        'gotify',
        {
          baseUrl,
          plannerUrl,
          applicationId: application.id,
          applicationName,
          rules
        },
        encryptJson({ token })
      );
      res.status(201).json({
        success: true,
        integration: integrationStatus(req.session.familyId).gotify,
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.patch(
    '/api/integrations/gotify',
    requireAuth,
    requireAdult,
    (req, res) => {
      const integration = getIntegration(req.session.familyId, 'gotify');
      if (!integration) {
        return res.status(404).json({
          success: false,
          error: 'Gotify ist noch nicht verbunden.'
        });
      }
      const config = {
        ...integration.config,
        plannerUrl: Object.hasOwn(req.body || {}, 'plannerUrl')
          ? normalizePlannerUrl(req.body.plannerUrl)
          : integration.config.plannerUrl,
        rules: gotifyRules(req.body?.rules ?? integration.config.rules)
      };
      saveIntegration(
        req.session.familyId,
        'gotify',
        config,
        integration.secretEncrypted
      );
      res.json({
        success: true,
        integration: integrationStatus(req.session.familyId).gotify,
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.post(
    '/api/integrations/gotify/test',
    requireAuth,
    requireAdult,
    async (req, res) => {
      if (!getIntegration(req.session.familyId, 'gotify')) {
        return res.status(404).json({
          success: false,
          error: 'Gotify ist noch nicht verbunden.'
        });
      }
      await sendGotifyNotification(req.session.familyId, null, {
        title: 'Test vom LX Family Planner',
        message: `Hallo ${req.activeMember.name}, die Verbindung funktioniert.`,
        priority: 5
      });
      res.json({ success: true });
    }
  );

  app.delete(
    '/api/integrations/gotify',
    requireAuth,
    requireAdult,
    (req, res) => {
      deleteIntegration(req.session.familyId, 'gotify');
      res.json({
        success: true,
        integration: {
          connected: false,
          rules: { ...DEFAULT_GOTIFY_RULES }
        },
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.get('/api/integrations/bring/catalog', requireAuth, async (_req, res) => {
    const catalog = await loadBringCatalog();
    res.set('Cache-Control', 'private, max-age=21600');
    res.json({ success: true, catalog });
  });

  app.post('/api/integrations/bring/login', requireAuth, requireAdult, async (req, res) => {
    const email = requireText(req.body?.email, 'E-Mail', 180);
    const password = requireText(req.body?.password, 'Passwort', 300);
    const client = new BringApi({ mail: email, password });
    await client.login();
    const result = await client.loadLists();
    const lists = Array.isArray(result?.lists)
      ? result.lists.map(list => ({
          listUuid: list.listUuid,
          name: list.name || 'Bring! Liste',
          theme: list.theme || ''
        }))
      : [];
    if (lists.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'In diesem Bring!-Konto wurde keine Liste gefunden.'
      });
    }
    const connectionToken = randomUUID();
    pendingBringLogins.set(connectionToken, {
      familyId: req.session.familyId,
      email,
      password,
      expiresAt: Date.now() + 10 * 60 * 1000
    });
    res.json({ success: true, connectionToken, lists });
  });

  app.post('/api/integrations/bring/connect', requireAuth, requireAdult, async (req, res) => {
    const connectionToken = requireText(
      req.body?.connectionToken,
      'Verbindung',
      100
    );
    const pending = pendingBringLogins.get(connectionToken);
    pendingBringLogins.delete(connectionToken);
    if (
      !pending ||
      pending.expiresAt < Date.now() ||
      pending.familyId !== req.session.familyId
    ) {
      return res.status(410).json({
        success: false,
        error: 'Die Bring!-Anmeldung ist abgelaufen. Bitte erneut anmelden.'
      });
    }
    const listUuid = requireText(req.body?.listUuid, 'Liste', 180);
    const listName = cleanText(req.body?.listName, 'Bring! Liste', 160);
    saveIntegration(
      req.session.familyId,
      'bring',
      { email: pending.email, listUuid, listName },
      encryptJson({ email: pending.email, password: pending.password })
    );
    const { client } = await fetchBringClient(req.session.familyId);
    const bringResponse = await client.getItems(listUuid);
    const records = applyBringRecords(req.session.familyId, bringResponse);
    res.json({
      success: true,
      integration: integrationStatus(req.session.familyId).bring,
      records,
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.post('/api/integrations/bring/sync', requireAuth, async (req, res) => {
    const { client, integration } = await fetchBringClient(req.session.familyId);
    const bringResponse = await client.getItems(integration.config.listUuid);
    const records = applyBringRecords(req.session.familyId, bringResponse);
    res.json({
      success: true,
      records,
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.post('/api/integrations/bring/items', requireAuth, async (req, res) => {
    const requestedItems = Array.isArray(req.body?.items)
      ? req.body.items
      : [req.body];
    if (requestedItems.length === 0 || requestedItems.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Bitte zwischen einem und 50 Artikeln übertragen.'
      });
    }

    const seen = new Set();
    const items = requestedItems
      .map(item => ({
        name: requireText(item?.name, 'Artikel', 160),
        specification: cleanText(
          item?.specification || item?.quantity,
          '',
          160
        )
      }))
      .filter(item => {
        const key = item.name.toLocaleLowerCase('de-DE');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    const { client, integration } = await fetchBringClient(
      req.session.familyId
    );
    for (const item of items) {
      await client.saveItem(
        integration.config.listUuid,
        item.name,
        item.specification
      );
    }
    const bringResponse = await client.getItems(
      integration.config.listUuid
    );
    const records = applyBringRecords(req.session.familyId, bringResponse);
    res.status(201).json({
      success: true,
      records,
      added: items.length,
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.post('/api/integrations/bring/items/toggle', requireAuth, async (req, res) => {
    const name = requireText(req.body?.name, 'Artikel', 160);
    const specification = cleanText(
      req.body?.specification || req.body?.quantity,
      '',
      160
    );
    const inCart = Boolean(req.body?.inCart);
    const { client, integration } = await fetchBringClient(
      req.session.familyId
    );

    if (inCart) {
      await client.moveToRecentList(integration.config.listUuid, name);
    } else {
      await client.saveItem(
        integration.config.listUuid,
        name,
        specification
      );
    }

    const bringResponse = await client.getItems(
      integration.config.listUuid
    );
    const records = applyBringRecords(req.session.familyId, bringResponse);
    res.json({
      success: true,
      records,
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.delete('/api/integrations/bring', requireAuth, requireAdult, (req, res) => {
    deleteIntegration(req.session.familyId, 'bring');
    res.json({
      success: true,
      integration: { connected: false },
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.post('/api/recipes/import', requireAuth, async (req, res) => {
    const rawUrl = requireText(req.body?.url, 'URL', 2000);
    let url;
    try {
      url = new URL(rawUrl);
    } catch {
      return res.status(400).json({ success: false, error: 'Die URL ist ungültig.' });
    }
    if (url.protocol !== 'https:' || !ALLOWED_RECIPE_HOSTS.has(url.hostname.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Diese Rezeptseite ist noch nicht freigegeben.'
      });
    }
    const response = await fetch(url, {
      signal: AbortSignal.timeout(12_000),
      headers: {
        'User-Agent': 'LX-Family-Planner/2.0 (+private recipe import)'
      }
    });
    if (!response.ok) {
      return res.status(502).json({
        success: false,
        error: 'Die Rezeptseite konnte nicht geladen werden.'
      });
    }
    const html = (await response.text()).slice(0, 3_000_000);
    const $ = cheerio.load(html);
    let recipe = null;
    $('script[type="application/ld+json"]').each((_index, element) => {
      if (recipe) return;
      try {
        const parsed = JSON.parse($(element).text());
        recipe = recipeCandidates(parsed)[0] || null;
      } catch {
        // Ignore malformed metadata and continue with the next JSON-LD block.
      }
    });
    if (!recipe) {
      return res.status(422).json({
        success: false,
        error: 'Auf dieser Seite wurden keine lesbaren Rezeptdaten gefunden.'
      });
    }
    const fallbackImage = [
      $('meta[property="og:image"]').attr('content'),
      $('meta[property="og:image:secure_url"]').attr('content'),
      $('meta[name="twitter:image"]').attr('content'),
      $('meta[name="twitter:image:src"]').attr('content'),
      $('link[rel="image_src"]').attr('href'),
      $('[itemprop="image"]').first().attr('content'),
      $('[itemprop="image"]').first().attr('src')
    ].find(Boolean) || '';
    res.json({
      success: true,
      recipe: normalizeRecipe(recipe, url.href, fallbackImage)
    });
  });

  app.use('/api/agent', (req, res, next) => {
    const configuredKey = process.env.AGENT_API_KEY;
    if (!configuredKey) {
      return res.status(503).json({
        success: false,
        error: 'Die Agent-Schnittstelle ist nicht aktiviert.'
      });
    }
    const suppliedKey = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!safeCompare(suppliedKey, configuredKey)) {
      return res.status(401).json({ success: false, error: 'Nicht autorisiert.' });
    }
    const familyId = cleanText(
      req.headers['x-family-id'] || req.body?.familyId || req.query?.familyId,
      '',
      100
    );
    if (!familyId || !getFamily(familyId)) {
      return res.status(400).json({
        success: false,
        error: 'Eine gültige x-family-id wird benötigt.'
      });
    }
    req.agentFamilyId = familyId;
    next();
  });

  app.get('/api/agent/state', (req, res) => {
    res.json({ success: true, ...getBootstrap(req.agentFamilyId) });
  });

  app.post('/api/agent/:type', (req, res) => {
    if (!RECORD_TYPES.has(req.params.type)) {
      return res.status(404).json({ success: false, error: 'Datentyp unbekannt.' });
    }
    const record = createRecord(
      req.agentFamilyId,
      req.params.type,
      sanitizeAgentRecord(req.params.type, req.body, req.agentFamilyId)
    );
    res.status(201).json({ success: true, record });
  });

  const distPath = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath, {
      maxAge: 0,
      index: false,
      setHeaders: (res, filePath) => {
        const normalizedPath = filePath.replaceAll('\\', '/');
        if (IS_PRODUCTION && normalizedPath.includes('/assets/')) {
          res.setHeader(
            'Cache-Control',
            'public, max-age=31536000, immutable'
          );
        } else {
          res.setHeader('Cache-Control', 'no-cache');
        }
      }
    }));
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Route nicht gefunden.' });
  });

  app.use((error, _req, res, _next) => {
    const status = Number(error.statusCode || error.status || 500);
    if (status >= 500) {
      console.error(error);
    }
    res.status(status).json({
      success: false,
      error:
        status >= 500
          ? 'Es ist ein interner Fehler aufgetreten.'
          : error.message || 'Die Anfrage konnte nicht verarbeitet werden.'
    });
  });

  return app;
}

export function startServer(port = Number(process.env.PORT || DEFAULT_PORT)) {
  const app = createApp();
  return app.listen(port, () => {
    if (!IS_PRODUCTION && APP_SECRET.includes('development-secret')) {
      console.warn(
        'Hinweis: Für Produktion APP_SECRET als sichere Umgebungsvariable setzen.'
      );
    }
    console.log(`LX Family Planner läuft auf http://localhost:${port}`);
  });
}
