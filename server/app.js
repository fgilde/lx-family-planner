import express from 'express';
import fs from 'fs';
import path from 'path';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  timingSafeEqual
} from 'crypto';
import { promises as dns } from 'dns';
import { isIP } from 'net';
import BringApi from 'bring-shopping';
import webPush from 'web-push';
import { parseICalendar } from '../shared/icsCalendar.js';
import {
  TASK_REPEAT_RULES,
  normalizeTaskDate
} from '../shared/taskRecurrence.js';
import {
  eventReminderMessage,
  eventStartKey,
  normalizeEventReminders,
  normalizeTrashReminders,
  selectDueEventReminder,
  trashReminderCopy,
  trashReminderEvent
} from '../shared/eventReminders.js';
import {
  DEFAULT_GOTIFY_RULES,
  DEFAULT_WEB_PUSH_PREFERENCES
} from '../shared/notificationEvents.js';
import { releaseNotesForVersion } from '../shared/releaseNotes.js';
import { loadBringCatalog } from './bringCatalog.js';
import { importRecipeFromUrl } from './recipeImporter.js';
import {
  resolveMediaPreview,
  safeCoverUrl
} from './mediaPreview.js';
import {
  RECORD_TYPES,
  acknowledgeMemberReleaseNotes,
  countFamilies,
  countUnreadInboxNotifications,
  createFamilyChatGuestInvite,
  createFamilyLetter,
  createCalendarSubscription,
  createInboxNotifications,
  createFamily,
  createFamilyRelationshipRequest,
  createProblemReport,
  createSharedFamilyEvent,
  createMember,
  createPocketMoneyTransaction,
  createRecord,
  createSession,
  countPushSubscriptionsByEndpoint,
  countNativePushProfilesForInstallation,
  deleteFamily,
  deleteCalendarSubscription,
  deleteFamilyRelationship,
  deleteIntegration,
  deleteSharedFamilyEvent,
  deleteMember,
  deleteNativePushDevice,
  deleteNativePushDeviceById,
  deleteNativePushDevicesByToken,
  deletePushSubscription,
  deletePushSubscriptionById,
  deletePushSubscriptionsByEndpoint,
  deleteRecord,
  deleteTaskRecords,
  deleteSession,
  findFamilyAuthCandidates,
  getBootstrap,
  getCalendarSubscription,
  getFamily,
  getFamilyAuthRow,
  getFamilyChatGuest,
  getFamilyRelationship,
  getFamilyVersion,
  getAppMeta,
  getIntegration,
  getMember,
  getMemberAuthRow,
  getMembers,
  getRecord,
  getSession,
  listPublicFamilies,
  listCalendarSubscriptions,
  listEventReminderDeliveries,
  listEnabledCalendarSubscriptions,
  listFamilyRelationships,
  listFamilyChatGuests,
  listFamilyLetters,
  listAcceptedChatGuestsForHost,
  listIntegrationsByProvider,
  listInboxNotifications,
  listProblemReports,
  listNativePushDevices,
  listPushSubscriptions,
  listRecords,
  redeemRewardRecord,
  requestTaskApprovalRecord,
  replaceRecordsBySource,
  respondFamilyRelationship,
  relationshipAllows,
  saveIntegration,
  saveNativePushDevice,
  savePushSubscription,
  setAppMeta,
  setSessionMember,
  markAllInboxNotificationsRead,
  markEventReminderDeliveries,
  markInboxNotificationRead,
  pruneEventReminderDeliveries,
  reviewTaskRecord,
  toggleTaskRecord,
  updateCalendarSubscription,
  updateCalendarSubscriptionSync,
  updateFamily,
  updateFamilyChatGuestStatus,
  updateFamilyLetterState,
  updateFamilyRelationshipGrants,
  updateMember,
  updateProblemReportStatus,
  updateRecord,
  upsertRecord,
  upsertRecords,
  verifySecret
} from './database.js';
import {
  isExpiredFirebaseTarget,
  publicFirebasePushStatus,
  sendFirebaseNotification
} from './firebasePush.js';
import {
  createNextcloudFolder,
  deleteNextcloudEntry,
  downloadNextcloudFile,
  ensureNextcloudCalendar,
  ensureNextcloudFolder,
  fetchNextcloudAccount,
  inspectNextcloud,
  listNextcloudFiles,
  nextcloudBrowserFolderUrl,
  normalizeNextcloudBaseUrl,
  normalizeNextcloudFolder,
  provisionNextcloudUser,
  revokeNextcloudAppPassword,
  syncNextcloudEvents,
  uploadNextcloudFile,
  uploadNextcloudUserFile
} from './nextcloud.js';
import { createTranslator } from './i18n.js';

const SESSION_COOKIE = 'lx_session';
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;
const DEFAULT_PORT = 3001;
const APP_VERSION = (() => {
  try {
    return JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')
    ).version || '0.0.0';
  } catch {
    return '0.0.0';
  }
})();
const JSON_LIMIT = process.env.JSON_LIMIT || '5mb';
const REWARD_ICON_IMAGE_MAX_LENGTH = 350_000;
const CHAT_ATTACHMENT_MAX_BYTES = 100 * 1024 * 1024;
const CHAT_ATTACHMENT_MAX_COUNT = 8;
const CHAT_ATTACHMENT_FOLDER = 'Familie/Chat';
const PRIVATE_CHAT_ATTACHMENT_FOLDER = '.LX-Privat/Chat';
const CLOUD_SHARED_FOLDER = 'Familie';
const CLOUD_PROFILE_FOLDER = 'Profile';
const NEXTCLOUD_AUTO_PROVISION =
  process.env.NEXTCLOUD_AUTO_PROVISION !== 'false';
const NEXTCLOUD_AUTO_PROVISION_META_PREFIX =
  'nextcloud-auto-provision-disabled:';
const APP_SECRET =
  process.env.APP_SECRET ||
  process.env.SECRET_KEY ||
  'lx-family-development-secret-change-me';
const ENCRYPTION_KEY = createHash('sha256').update(APP_SECRET).digest();
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const SUPPORTED_APP_LANGUAGES = ['de', 'en'];
const APP_LANGUAGE = (() => {
  const configured = String(process.env.APP_LANGUAGE || '')
    .trim()
    .toLowerCase()
    .slice(0, 2);
  return SUPPORTED_APP_LANGUAGES.includes(configured) ? configured : 'de';
})();
const translate = createTranslator(APP_LANGUAGE);
const APP_LOCALE = APP_LANGUAGE === 'en' ? 'en-GB' : 'de-DE';
const REGISTRATION_MODE = (() => {
  const configured = String(
    process.env.REGISTRATION_MODE || 'first-family'
  ).trim().toLowerCase();
  return new Set(['closed', 'first-family', 'invite', 'open']).has(configured)
    ? configured
    : 'first-family';
})();
const REGISTRATION_INVITE_CODE = String(
  process.env.REGISTRATION_INVITE_CODE || ''
).trim();
const PUBLIC_FAMILY_DIRECTORY =
  process.env.PUBLIC_FAMILY_DIRECTORY === 'true';
const CALENDAR_ALLOW_PRIVATE_HOSTS =
  process.env.CALENDAR_ALLOW_PRIVATE_HOSTS === 'true';
const CALENDAR_ALLOW_LOOPBACK_FOR_TESTS =
  process.env.NODE_ENV === 'test' &&
  process.env.CALENDAR_ALLOW_LOOPBACK_FOR_TESTS === 'true';
const CALENDAR_SYNC_INTERVAL_MS = Math.max(
  15,
  Number(process.env.CALENDAR_SYNC_INTERVAL_MINUTES || 60)
) * 60 * 1000;
const CALENDAR_FETCH_TIMEOUT_MS = 12_000;
const CALENDAR_MAX_BYTES = 2 * 1024 * 1024;
const NEXTCLOUD_SYNC_INTERVAL_MS = Math.max(
  5,
  Number(process.env.NEXTCLOUD_SYNC_INTERVAL_MINUTES || 15)
) * 60 * 1000;
const EVENT_REMINDER_INTERVAL_MS = Math.max(
  15,
  Number(process.env.EVENT_REMINDER_INTERVAL_SECONDS || 30)
) * 1000;
const PUBLIC_APP_URL = (() => {
  try {
    const configuredUrl = new URL(
      String(process.env.PUBLIC_APP_URL || '').trim()
    );
    if (!['http:', 'https:'].includes(configuredUrl.protocol)) return '';
    return configuredUrl.origin;
  } catch {
    return '';
  }
})();
const CORS_ALLOWED_ORIGINS = new Set([
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
  'https://familie.laxxx-lab.de',
  ...String(process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean)
]);
const pendingBringLogins = new Map();
const authAttempts = new Map();
const nextcloudSyncLocks = new Map();
const nextcloudBackupLocks = new Map();

const ROLE_TYPES = new Set([
  'adult',
  'child',
  'teen',
  'senior',
  'member',
  'pet'
]);
const ADULT_ROLES = new Set(['adult', 'senior']);
const PROFILE_MODULE_IDS = new Set([
  'chat',
  'calendar',
  'trash',
  'shopping',
  'meals',
  'tasks',
  'family-life',
  'board',
  'cloud',
  'mail'
]);
const ADULT_MANAGED_RESOURCES = new Set([
  'tasks',
  'rewards',
  'trashEvents',
  'familyTree',
  'dashboardLinks',
  'dailyRoutines',
  'savingsGoals',
  'pocketMoneyTransactions',
  'schoolItems',
  'familyPolls',
  'encouragements',
  'familyMissions',
  'familySettings',
  'kidProfiles'
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
  'youtu.be',
  'youtubekids.com',
  'www.youtubekids.com'
]);
const SPOTIFY_HOSTS = new Set(['open.spotify.com']);
const HOME_ASSISTANT_VISIBLE_DOMAINS = new Set([
  'binary_sensor',
  'button',
  'climate',
  'cover',
  'device_tracker',
  'fan',
  'input_boolean',
  'light',
  'media_player',
  'person',
  'scene',
  'script',
  'sensor',
  'sun',
  'switch',
  'vacuum',
  'weather'
]);
const HOME_ASSISTANT_CONTROL_ACTIONS = Object.freeze({
  light: new Set(['turn_on', 'turn_off', 'toggle']),
  switch: new Set(['turn_on', 'turn_off', 'toggle']),
  input_boolean: new Set(['turn_on', 'turn_off', 'toggle']),
  fan: new Set(['turn_on', 'turn_off', 'toggle']),
  cover: new Set(['open_cover', 'close_cover', 'stop_cover']),
  climate: new Set(['turn_on', 'turn_off', 'set_temperature']),
  scene: new Set(['turn_on']),
  script: new Set(['turn_on']),
  button: new Set(['press']),
  vacuum: new Set(['start', 'return_to_base', 'stop']),
  media_player: new Set(['media_play_pause', 'turn_on', 'turn_off'])
});
const WEB_PUSH_VAPID_META_KEY = 'web_push_vapid_keys_v1';
let cachedVapidConfig = null;

function cleanText(value, fallback = '', maxLength = 160) {
  const text = String(value ?? fallback).trim();
  return text.slice(0, maxLength);
}

function constantTimeTextMatch(value, expected) {
  const left = createHash('sha256').update(String(value || '')).digest();
  const right = createHash('sha256').update(String(expected || '')).digest();
  return timingSafeEqual(left, right);
}

function publicRegistrationStatus() {
  const firstFamily = countFamilies() === 0;
  const inviteReady = Boolean(REGISTRATION_INVITE_CODE);
  const allowed =
    REGISTRATION_MODE === 'open' ||
    (REGISTRATION_MODE === 'first-family' && firstFamily) ||
    (REGISTRATION_MODE === 'invite' && inviteReady);
  return {
    mode: REGISTRATION_MODE,
    allowed,
    requiresInvite: REGISTRATION_MODE === 'invite' && inviteReady
  };
}

function ensureObject(value, message = translate('errors.invalidInput')) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
  return value;
}

function safeCloudName(value, fallback = 'Datei') {
  const name = cleanText(value, fallback, 240)
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/^\.+$/, fallback)
    .trim();
  return name || fallback;
}

function cloudProfileFolder(member, familyMembers = []) {
  const baseName = safeCloudName(member?.name, 'Profil');
  const matches = familyMembers.filter(
    candidate =>
      safeCloudName(candidate?.name, 'Profil')
        .localeCompare(baseName, 'de-DE', { sensitivity: 'base' }) === 0
  );
  return `${CLOUD_PROFILE_FOLDER}/${
    matches.length > 1
      ? `${baseName} · ${String(member?.id || '').slice(-4)}`
      : baseName
  }`;
}

function normalizeChatCloudPath(value) {
  const pieces = cleanText(value, '', 1600)
    .replaceAll('\\', '/')
    .split('/')
    .map(piece => piece.trim())
    .filter(Boolean);
  if (
    !pieces.length ||
    pieces.length > 12 ||
    pieces.some(piece => piece === '.' || piece === '..')
  ) {
    const error = new Error(translate('errors.attachmentCloudPathInvalid'));
    error.statusCode = 400;
    throw error;
  }
  const normalized = pieces.join('/');
  if (
    !normalized.startsWith(`${CHAT_ATTACHMENT_FOLDER}/`) &&
    !normalized.startsWith(`${PRIVATE_CHAT_ATTACHMENT_FOLDER}/`)
  ) {
    const error = new Error(
      translate('errors.attachmentNotFromChatArchive')
    );
    error.statusCode = 400;
    throw error;
  }
  return normalized;
}

function publicFamilyCloudPath(value) {
  const normalized = cleanText(value, '', 2000)
    .replaceAll('\\', '/')
    .replace(/^\/+|\/+$/g, '');
  if (
    normalized === '.LX-Privat' ||
    normalized.startsWith('.LX-Privat/')
  ) {
    const error = new Error(translate('errors.privateChatAreaHidden'));
    error.statusCode = 404;
    throw error;
  }
  return normalized;
}

function chatAttachmentKind(mimeType, fileName) {
  const type = cleanText(mimeType, 'application/octet-stream', 200)
    .toLowerCase();
  const name = String(fileName || '').toLowerCase();
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

function decodeLegacyChatPhoto(value) {
  const match = String(value || '').match(
    /^data:(image\/(?:jpeg|png|gif|webp|avif));base64,([a-z0-9+/=\r\n]+)$/i
  );
  if (!match) {
    const error = new Error(
      translate('errors.chatPhotoUnsupportedFormat')
    );
    error.statusCode = 400;
    throw error;
  }
  const content = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!content.length || content.length > CHAT_ATTACHMENT_MAX_BYTES) {
    const error = new Error(
      translate('errors.chatPhotoEmptyOrTooLarge')
    );
    error.statusCode = 400;
    throw error;
  }
  const mimeType = match[1].toLowerCase();
  const extension = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/avif': 'avif'
  }[mimeType] || 'jpg';
  return {
    content,
    mimeType,
    fileName: `Chatfoto-${new Date().toISOString().slice(0, 19).replaceAll(':', '-')}.${extension}`
  };
}

function chatAttachmentClaim(familyId, attachment) {
  return createHmac('sha256', ENCRYPTION_KEY)
    .update([
      cleanText(familyId, '', 200),
      cleanText(attachment?.id, '', 100),
      cleanText(attachment?.cloudPath, '', 1600),
      cleanText(attachment?.name, '', 240),
      String(Math.max(0, Number(attachment?.size) || 0)),
      cleanText(attachment?.chatTarget, 'group', 100),
      attachment?.encrypted ? 'encrypted' : 'plain',
      cleanText(attachment?.encryptionIv, '', 100),
      cleanText(attachment?.encryptionTag, '', 100)
    ].join('\u0000'))
    .digest('base64url');
}

function sanitizeChatAttachments(value, familyId, expectedTarget = 'group') {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    const error = new Error(translate('errors.attachmentsInvalid'));
    error.statusCode = 400;
    throw error;
  }
  if (value.length > CHAT_ATTACHMENT_MAX_COUNT) {
    const error = new Error(
      translate('errors.attachmentLimit', {
        count: CHAT_ATTACHMENT_MAX_COUNT
      })
    );
    error.statusCode = 400;
    throw error;
  }
  return value.map(item => {
    const input = ensureObject(item, translate('errors.chatAttachmentInvalid'));
    const attachment = {
      id: requireText(input.id, translate('fields.attachmentId'), 100),
      name: safeCloudName(input.name, 'Datei'),
      cloudPath: normalizeChatCloudPath(input.cloudPath),
      mimeType: cleanText(
        input.mimeType,
        'application/octet-stream',
        200
      ),
      size: Math.max(0, Number(input.size) || 0),
      uploadedAt: Math.max(0, Number(input.uploadedAt) || Date.now()),
      chatTarget: cleanText(input.chatTarget, 'group', 100),
      encrypted: Boolean(input.encrypted),
      encryptionIv: cleanText(input.encryptionIv, '', 100),
      encryptionTag: cleanText(input.encryptionTag, '', 100)
    };
    if (
      !attachment.size ||
      attachment.size > CHAT_ATTACHMENT_MAX_BYTES
    ) {
      const error = new Error(
        translate('errors.chatAttachmentEmptyOrTooLarge')
      );
      error.statusCode = 400;
      throw error;
    }
    if (attachment.chatTarget !== expectedTarget) {
      const error = new Error(
        translate('errors.attachmentWrongChat')
      );
      error.statusCode = 400;
      throw error;
    }
    if (
      attachment.encrypted &&
      (
        !/^[a-z0-9_-]{16,}$/i.test(attachment.encryptionIv) ||
        !/^[a-z0-9_-]{16,}$/i.test(attachment.encryptionTag)
      )
    ) {
      const error = new Error(
        translate('errors.attachmentEncryptionInvalid')
      );
      error.statusCode = 400;
      throw error;
    }
    const expectedClaim = chatAttachmentClaim(familyId, attachment);
    if (!safeCompare(input.claim, expectedClaim)) {
      const error = new Error(
        translate('errors.attachmentClaimInvalid')
      );
      error.statusCode = 400;
      throw error;
    }
    return {
      ...attachment,
      kind: chatAttachmentKind(attachment.mimeType, attachment.name)
    };
  });
}

function chatAttachmentEncryptionKey(familyId, attachmentId) {
  return createHmac('sha256', ENCRYPTION_KEY)
    .update(`lx-chat-attachment\u0000${familyId}\u0000${attachmentId}`)
    .digest();
}

function encryptPrivateChatAttachment(familyId, attachmentId, content) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    'aes-256-gcm',
    chatAttachmentEncryptionKey(familyId, attachmentId),
    iv
  );
  return {
    content: Buffer.concat([cipher.update(content), cipher.final()]),
    encryptionIv: iv.toString('base64url'),
    encryptionTag: cipher.getAuthTag().toString('base64url')
  };
}

function decryptPrivateChatAttachment(familyId, attachment, content) {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    chatAttachmentEncryptionKey(familyId, attachment.id),
    Buffer.from(attachment.encryptionIv, 'base64url')
  );
  decipher.setAuthTag(Buffer.from(attachment.encryptionTag, 'base64url'));
  return Buffer.concat([decipher.update(content), decipher.final()]);
}

function chatAttachmentMessageCopy(record, fallback = translate('push.newMessage')) {
  if (record?.text) return record.text;
  const attachments = Array.isArray(record?.attachments)
    ? record.attachments
    : [];
  if (attachments.length === 1) {
    return attachments[0].kind === 'image'
      ? translate('push.photoSent')
      : translate('push.fileAttachment', { name: attachments[0].name });
  }
  if (attachments.length > 1) {
    return translate('push.filesAttachment', { count: attachments.length });
  }
  return record?.photo ? translate('push.photoSent') : fallback;
}

function requireText(value, label, maxLength = 160) {
  const text = cleanText(value, '', maxLength);
  if (!text) {
    const error = new Error(translate('errors.required', { label }));
    error.statusCode = 400;
    throw error;
  }
  return text;
}

function sanitizeRewardIconImage(value) {
  const image = cleanText(value, '', REWARD_ICON_IMAGE_MAX_LENGTH + 1);
  if (!image) return '';
  if (
    image.length > REWARD_ICON_IMAGE_MAX_LENGTH ||
    !/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=\r\n]+$/i.test(image)
  ) {
    const error = new Error(
      translate('errors.rewardImageInvalid')
    );
    error.statusCode = 400;
    throw error;
  }
  return image;
}

function sanitizeRewardRecord(familyId, value, existing = {}) {
  const input = {
    ...existing,
    ...ensureObject(value)
  };
  const forMemberId = cleanText(input.forMemberId, 'all', 100) || 'all';
  if (forMemberId !== 'all') {
    const target = getMember(familyId, forMemberId);
    if (!target || !['child', 'teen'].includes(target.role) || target.isManaged) {
      const error = new Error(
        translate('errors.rewardChildOnly')
      );
      error.statusCode = 400;
      throw error;
    }
  }
  const iconImage = sanitizeRewardIconImage(input.iconImage);
  return {
    ...input,
    title: requireText(input.title, translate('fields.reward'), 120),
    costStars: Math.max(
      1,
      Math.min(100_000, Math.round(Number(input.costStars) || 1))
    ),
    forMemberId,
    icon: iconImage
      ? 'custom'
      : cleanText(input.icon, 'preset:gift', 64) || 'preset:gift',
    iconImage
  };
}

function normalizeRole(role) {
  const normalized = cleanText(role, 'member', 20).toLowerCase();
  return ROLE_TYPES.has(normalized) ? normalized : 'member';
}

function isManagedMember(member) {
  return Boolean(
    member &&
    (
      member.isManaged === true ||
      Number(member.is_managed || 0) === 1
    )
  );
}

function isAdultMember(member) {
  return Boolean(
    member &&
    !isManagedMember(member) &&
    ADULT_ROLES.has(member.role)
  );
}

function normalizeMemberInput(value = {}) {
  const member = ensureObject(value);
  const isManaged = member.isManaged === true;
  return {
    ...member,
    name: requireText(member.name, translate('fields.name'), 80),
    role: normalizeRole(member.role),
    position: cleanText(member.position, 'familienmitglied', 40).toLowerCase(),
    avatar: cleanText(member.avatar, '', 1_200_000),
    color: cleanText(member.color, '#2563eb', 24),
    bgColor: cleanText(member.bgColor, '#eff6ff', 24),
    theme: cleanText(member.theme, 'light', 32),
    allowedModules: Array.isArray(member.allowedModules)
      ? [...new Set(
          member.allowedModules
            .map(value => cleanText(value, '', 40))
            .filter(value => PROFILE_MODULE_IDS.has(value))
        )]
      : undefined,
    pin:
      !isManaged && member.pin
        ? cleanText(member.pin, '', 12)
        : undefined,
    isManaged
  };
}

function normalizeTaskSchedule(value = {}) {
  const repeatRule = TASK_REPEAT_RULES.has(value.repeatRule)
    ? value.repeatRule
    : 'none';
  const now = new Date();
  const today = new Date(
    now.getTime() - now.getTimezoneOffset() * 60_000
  ).toISOString().slice(0, 10);
  const dueDate = normalizeTaskDate(
    value.dueDate,
    repeatRule === 'none' ? '' : today
  );
  return {
    repeatRule,
    dueDate,
    repeatAnchorDay: Math.max(
      1,
      Math.min(
        31,
        Number(value.repeatAnchorDay || dueDate.slice(8, 10) || 1)
      )
    ),
    occurrenceDate: normalizeTaskDate(
      value.occurrenceDate,
      dueDate
    )
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

function isAllowedCorsOrigin(req, origin) {
  if (!origin) return false;
  const normalizedOrigin = String(origin).trim().replace(/\/+$/, '');
  const requestOrigin = `${req.protocol}://${req.get('host')}`;
  return (
    normalizedOrigin === requestOrigin ||
    CORS_ALLOWED_ORIGINS.has(normalizedOrigin)
  );
}

function nativeSessionTokenPayload(req, sessionToken) {
  return req.headers['x-lx-client'] === 'native'
    ? { sessionToken }
    : {};
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
    throw new Error(translate('errors.integrationCorrupted'));
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

function calendarSourceKey(subscriptionId) {
  return `calendar-subscription:${subscriptionId}`;
}

function isCalendarSubscriptionEvent(record) {
  return Boolean(
    record?.readOnly &&
    String(record?.source || '').startsWith('calendar-subscription:')
  );
}

function normalizeCalendarFeedUrl(value) {
  let url;
  try {
    url = new URL(requireText(value, translate('fields.calendarLink'), 4000));
  } catch {
    const error = new Error(translate('errors.calendarLinkIncomplete'));
    error.statusCode = 400;
    throw error;
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    const error = new Error(translate('errors.calendarLinkProtocol'));
    error.statusCode = 400;
    throw error;
  }
  if (url.username || url.password) {
    const error = new Error(
      translate('errors.calendarLinkCredentials')
    );
    error.statusCode = 400;
    throw error;
  }
  url.hash = '';
  return url;
}

function ipv4Parts(address) {
  if (isIP(address) !== 4) return null;
  return address.split('.').map(Number);
}

function blockedCalendarAddress(address) {
  const normalized = String(address || '').toLowerCase();
  const mappedIpv4 = normalized.startsWith('::ffff:')
    ? normalized.slice(7)
    : normalized;
  const parts = ipv4Parts(mappedIpv4);
  if (parts) {
    const [first, second] = parts;
    if (first === 127 && CALENDAR_ALLOW_LOOPBACK_FOR_TESTS) {
      return false;
    }
    if (
      first === 0 ||
      first === 127 ||
      first >= 224 ||
      (first === 169 && second === 254)
    ) {
      return true;
    }
    if (CALENDAR_ALLOW_PRIVATE_HOSTS) return false;
    return (
      first === 10 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168) ||
      (first === 100 && second >= 64 && second <= 127)
    );
  }
  if (isIP(normalized) === 6) {
    if (
      normalized === '::' ||
      normalized === '::1' ||
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb') ||
      normalized.startsWith('ff')
    ) {
      return true;
    }
    if (!CALENDAR_ALLOW_PRIVATE_HOSTS) {
      return normalized.startsWith('fc') || normalized.startsWith('fd');
    }
  }
  return false;
}

async function validateCalendarFeedTarget(url) {
  let addresses;
  try {
    addresses = isIP(url.hostname)
      ? [{ address: url.hostname }]
      : await dns.lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    const error = new Error(translate('errors.calendarServerNotFound'));
    error.statusCode = 400;
    throw error;
  }
  if (
    !addresses.length ||
    addresses.some(entry => blockedCalendarAddress(entry.address))
  ) {
    const error = new Error(
      CALENDAR_ALLOW_PRIVATE_HOSTS
        ? translate('errors.calendarLocalAddressesBlocked')
        : translate('errors.calendarPrivateAddressesBlocked')
    );
    error.statusCode = 400;
    throw error;
  }
}

async function readLimitedCalendarBody(response) {
  const announcedLength = Number(response.headers.get('content-length') || 0);
  if (announcedLength > CALENDAR_MAX_BYTES) {
    const error = new Error(translate('errors.calendarFileTooLarge'));
    error.statusCode = 413;
    throw error;
  }
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > CALENDAR_MAX_BYTES) {
      await reader.cancel();
      const error = new Error(translate('errors.calendarFileTooLarge'));
      error.statusCode = 413;
      throw error;
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function fetchCalendarFeed(rawUrl) {
  let url = normalizeCalendarFeedUrl(rawUrl);
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    await validateCalendarFeedTarget(url);
    let response;
    try {
      response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(CALENDAR_FETCH_TIMEOUT_MS),
        headers: {
          accept: 'text/calendar, text/plain;q=0.9, */*;q=0.2',
          'user-agent': `LX-Family-Planner/${APP_VERSION} Calendar-Sync`
        }
      });
    } catch {
      const error = new Error(translate('errors.calendarServerUnavailable'));
      error.statusCode = 502;
      throw error;
    }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location || redirect === 3) {
        const error = new Error(translate('errors.calendarTooManyRedirects'));
        error.statusCode = 502;
        throw error;
      }
      url = normalizeCalendarFeedUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) {
      const error = new Error(
        response.status === 401 || response.status === 403
          ? translate('errors.calendarLinkNotPublic')
          : translate('errors.calendarServerError', { status: response.status })
      );
      error.statusCode = 502;
      throw error;
    }
    const content = await readLimitedCalendarBody(response);
    if (!/BEGIN:VCALENDAR/i.test(content)) {
      const error = new Error(translate('errors.calendarNoIcs'));
      error.statusCode = 422;
      throw error;
    }
    return content;
  }
  throw new Error(translate('errors.calendarLoadFailed'));
}

function calendarEventRecord(subscription, event) {
  const occurrenceKey =
    event.occurrenceKey || `${event.date}T${event.time || ''}`;
  const externalKey = `${subscription.id}|${event.uid}|${occurrenceKey}`;
  const id = `cal-${createHash('sha256')
    .update(externalKey)
    .digest('hex')
    .slice(0, 28)}`;
  return {
    id,
    externalUid: event.uid,
    externalOccurrence: occurrenceKey,
    title: cleanText(event.title, translate('labels.calendarEvent'), 300),
    date: event.date,
    time: event.time || '',
    allDay: Boolean(event.allDay),
    endDate: event.endDate || '',
    endTime: event.endTime || '',
    location: cleanText(event.location, '', 500),
    notes: cleanText(event.notes, '', 4000),
    category: translate('labels.subscriptionCategory', {
      name: subscription.name
    }),
    memberId: subscription.memberId || 'all',
    household: subscription.household || 'familie',
    readOnly: true,
    sourceId: subscription.id,
    sourceName: subscription.name,
    sourceColor: subscription.color
  };
}

async function syncCalendarSubscription(subscription) {
  let url = '';
  try {
    url = decryptJson(subscription.secretEncrypted).url;
    const content = await fetchCalendarFeed(url);
    const now = Date.now();
    const events = parseICalendar(content, {
      targetTimeZone: process.env.TZ || 'Europe/Berlin',
      rangeStart: now - 45 * 86_400_000,
      rangeEnd: now + 730 * 86_400_000,
      maxEvents: 1500
    }).map(event => calendarEventRecord(subscription, event));
    const records = replaceRecordsBySource(
      subscription.familyId,
      'events',
      calendarSourceKey(subscription.id),
      events
    );
    const updated = updateCalendarSubscriptionSync(
      subscription.familyId,
      subscription.id,
      { success: true, eventCount: records.length }
    );
    return { subscription: updated, records };
  } catch (error) {
    updateCalendarSubscriptionSync(
      subscription.familyId,
      subscription.id,
      {
        success: false,
        error: cleanText(
          error.message,
          translate('errors.calendarUpdateFailed'),
          300
        )
      }
    );
    throw error;
  }
}

async function syncAllCalendarSubscriptions() {
  const subscriptions = listEnabledCalendarSubscriptions({
    includeSecret: true
  });
  for (const subscription of subscriptions.slice(0, 100)) {
    try {
      await syncCalendarSubscription(subscription);
    } catch (error) {
      console.warn(
        `Kalender-Abo ${subscription.id} (${subscription.host}) konnte nicht synchronisiert werden:`,
        error.message
      );
    }
  }
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
    transport: 'browser',
    memberId: subscription.memberId,
    deviceName: subscription.deviceName,
    preferences: normalizePushPreferences(subscription.preferences),
    createdAt: subscription.createdAt,
    updatedAt: subscription.updatedAt
  };
}

function publicNativePushDevice(device) {
  return {
    id: device.id,
    transport: 'android',
    memberId: device.memberId,
    installationId: device.installationId,
    platform: device.platform,
    deviceName: device.deviceName,
    appVersion: device.appVersion,
    preferences: normalizePushPreferences(device.preferences),
    createdAt: device.createdAt,
    updatedAt: device.updatedAt
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
    privateBody = translate('push.defaultPrivateBody'),
    url = '/',
    tag = eventKey,
    priority = 'normal',
    allowDuringQuietHours = false,
    ttl = 900
  }
) {
  const familySettings = getRecord(
    familyId,
    'familySettings',
    'family-settings'
  );
  const quietNow =
    familySettings?.quietHoursEnabled &&
    isWithinTimeWindow(
      familySettings.quietStart || '20:00',
      familySettings.quietEnd || '07:00'
    );
  const urgentAllowed =
    familySettings?.urgentDuringQuietHours !== false &&
    (allowDuringQuietHours || eventKey === 'moodHelp');
  if (quietNow && !urgentAllowed) {
    return { sent: 0, failed: 0, quiet: true };
  }
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

async function sendNativePushEvent(
  familyId,
  eventKey,
  {
    recipientMemberIds = null,
    excludeMemberIds = [],
    title,
    body,
    privateTitle = title,
    privateBody = translate('push.defaultPrivateBody'),
    url = '/',
    tag = eventKey,
    priority = 'normal',
    allowDuringQuietHours = false,
    ttl = 900
  }
) {
  if (!publicFirebasePushStatus().configured) {
    return { sent: 0, failed: 0, configured: false };
  }
  const familySettings = getRecord(
    familyId,
    'familySettings',
    'family-settings'
  );
  const quietNow =
    familySettings?.quietHoursEnabled &&
    isWithinTimeWindow(
      familySettings.quietStart || '20:00',
      familySettings.quietEnd || '07:00'
    );
  const urgentAllowed =
    familySettings?.urgentDuringQuietHours !== false &&
    (allowDuringQuietHours || eventKey === 'moodHelp');
  if (quietNow && !urgentAllowed) {
    return { sent: 0, failed: 0, quiet: true, configured: true };
  }

  const recipients = recipientMemberIds
    ? new Set(recipientMemberIds.filter(Boolean))
    : null;
  const excluded = new Set(excludeMemberIds.filter(Boolean));
  const devicesByToken = new Map();
  listNativePushDevices(familyId)
    .filter(device => {
      const preferences = normalizePushPreferences(device.preferences);
      return (
        (!eventKey || preferences[eventKey]) &&
        (!recipients || recipients.has(device.memberId)) &&
        !excluded.has(device.memberId)
      );
    })
    .forEach(device => {
      const existing = devicesByToken.get(device.token);
      if (
        !existing ||
        (
          normalizePushPreferences(existing.preferences).showPreviews &&
          !normalizePushPreferences(device.preferences).showPreviews
        )
      ) {
        devicesByToken.set(device.token, device);
      }
    });
  const devices = [...devicesByToken.values()];
  if (!devices.length) {
    return { sent: 0, failed: 0, configured: true };
  }

  const results = await Promise.allSettled(
    devices.map(async device => {
      const preferences = normalizePushPreferences(device.preferences);
      const revealDetails = preferences.showPreviews;
      try {
        await sendFirebaseNotification({
          token: device.token,
          title: revealDetails ? title : privateTitle,
          body: revealDetails ? body : privateBody,
          tag,
          priority,
          visibility: revealDetails ? 'public' : 'private',
          ttl,
          data: {
            url,
            eventKey: eventKey || 'test',
            tag: tag || eventKey || 'lx-family',
            memberId: device.memberId,
            timestamp: Date.now()
          }
        });
        return true;
      } catch (error) {
        if (isExpiredFirebaseTarget(error)) {
          deleteNativePushDevicesByToken(device.token);
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
        'Android-Benachrichtigung fehlgeschlagen:',
        result.reason?.message || result.reason
      );
    });
  return { sent, failed, configured: true };
}

function queueWebPushEvent(familyId, eventKey, payload) {
  const excluded = new Set((payload.excludeMemberIds || []).filter(Boolean));
  const requestedRecipients = payload.recipientMemberIds
    ? new Set(payload.recipientMemberIds.filter(Boolean))
    : null;
  const inboxMemberIds = getMembers(familyId)
    .filter(member => member.role !== 'pet' && !member.isManaged)
    .filter(member => !requestedRecipients || requestedRecipients.has(member.id))
    .filter(member => !excluded.has(member.id))
    .map(member => member.id);
  const createdNotifications = createInboxNotifications(
    familyId,
    inboxMemberIds,
    {
    eventKey,
    title: payload.title,
    body: payload.body,
    url: payload.url,
    priority: payload.priority,
    dedupeKey: payload.tag
    }
  );
  if (!createdNotifications.length) return [];
  void sendWebPushEvent(familyId, eventKey, {
    ...payload,
    recipientMemberIds: [
      ...new Set(createdNotifications.map(entry => entry.memberId))
    ]
  }).catch(error => {
    console.error(
      'Browser-Benachrichtigung fehlgeschlagen:',
      error.message
    );
  });
  void sendNativePushEvent(familyId, eventKey, {
    ...payload,
    recipientMemberIds: [
      ...new Set(createdNotifications.map(entry => entry.memberId))
    ]
  }).catch(error => {
    console.error(
      'Android-Benachrichtigung fehlgeschlagen:',
      error.message
    );
  });
  return createdNotifications;
}

function signedInMemberIds(familyId) {
  return getMembers(familyId)
    .filter(member => member.role !== 'pet' && !isManagedMember(member))
    .map(member => member.id);
}

function adultMemberIds(familyId) {
  return getMembers(familyId)
    .filter(member => isAdultMember(member) && !isManagedMember(member))
    .map(member => member.id);
}

function childMemberIds(familyId) {
  return getMembers(familyId)
    .filter(
      member =>
        !isManagedMember(member) &&
        ['child', 'teen'].includes(member.role)
    )
    .map(member => member.id);
}

function profileNotificationRecipientIds(familyId, memberId) {
  if (!memberId || memberId === 'all') return signedInMemberIds(familyId);
  const member = getMember(familyId, memberId);
  if (!member) return [];
  if (isManagedMember(member) || member.role === 'pet') {
    return adultMemberIds(familyId);
  }
  return [member.id];
}

function queueNotificationChannels(
  familyId,
  eventKey,
  pushPayload,
  gotifyPayload = null
) {
  const notifications = queueWebPushEvent(
    familyId,
    eventKey,
    pushPayload
  );
  if (gotifyPayload) {
    queueGotifyNotification(familyId, eventKey, gotifyPayload);
  }
  return notifications;
}

function eventReminderRecipientMemberIds(familyId, event) {
  const members = getMembers(familyId);
  const signedInMembers = members.filter(
    member => !isManagedMember(member) && member.role !== 'pet'
  );
  if (
    event?.sharedOwnerFamilyId &&
    event.sharedOwnerFamilyId !== familyId
  ) {
    return signedInMembers.map(member => member.id);
  }
  if (!event?.memberId || event.memberId === 'all') {
    return signedInMembers.map(member => member.id);
  }
  const target = members.find(member => member.id === event.memberId);
  if (!target) return signedInMembers.map(member => member.id);
  if (isManagedMember(target) || target.role === 'pet') {
    return signedInMembers
      .filter(isAdultMember)
      .map(member => member.id);
  }
  return [target.id];
}

const MOOD_NOTIFICATION_COPY = Object.freeze({
  super: {
    label: translate('mood.super.label'),
    title: translate('mood.super.title'),
    detail: translate('mood.super.detail')
  },
  gut: {
    label: translate('mood.gut.label'),
    title: translate('mood.gut.title'),
    detail: translate('mood.gut.detail')
  },
  okay: {
    label: translate('mood.okay.label'),
    title: translate('mood.okay.title'),
    detail: translate('mood.okay.detail')
  },
  hilfe: {
    label: translate('mood.hilfe.label'),
    title: translate('mood.hilfe.title'),
    detail: translate('mood.hilfe.detail')
  }
});

function notifyMoodCheckin(req, record) {
  const member = getMember(req.session.familyId, record.memberId);
  if (!member || !['child', 'teen'].includes(member.role)) return;
  const copy =
    MOOD_NOTIFICATION_COPY[record.mood] ||
    MOOD_NOTIFICATION_COPY.okay;
  const urgent = record.mood === 'hilfe';
  const eventKey = urgent ? 'moodHelp' : 'moodUpdates';
  queueNotificationChannels(
    req.session.familyId,
    eventKey,
    {
      recipientMemberIds: adultMemberIds(req.session.familyId),
      excludeMemberIds: [member.id],
      title: `${member.name} ${copy.title}`,
      body: copy.detail,
      privateTitle: urgent
        ? translate('mood.helpPrivateTitle')
        : translate('mood.updatePrivateTitle'),
      privateBody: urgent
        ? translate('mood.helpPrivateBody')
        : translate('mood.updatePrivateBody'),
      url: '/?view=dashboard',
      tag: `mood-${record.id}`,
      priority: urgent ? 'high' : 'normal',
      allowDuringQuietHours: urgent,
      ttl: urgent ? 300 : 1800
    },
    {
      title: `${member.name} ${copy.title}`,
      message: urgent
        ? translate('mood.urgentGotifyMessage', { detail: copy.detail })
        : copy.detail,
      priority: urgent ? 8 : 4
    }
  );
}

function calendarEventBody(event, prefix = '') {
  const date = new Date(`${event.date}T12:00:00`);
  const dateLabel = Number.isFinite(date.getTime())
    ? date.toLocaleDateString('de-DE', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit'
      })
    : '';
  const timeLabel =
    !event.allDay && event.time
      ? translate('push.eventTimeAt', { time: event.time })
      : translate('push.eventAllDay');
  const details = [dateLabel, timeLabel, event.location]
    .filter(Boolean)
    .join(' · ');
  return [prefix, event.title, details].filter(Boolean).join(' · ');
}

function euroAmount(amountCents) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR'
  }).format(Number(amountCents || 0) / 100);
}

function calendarEventWasMateriallyChanged(before, after) {
  return [
    'title',
    'date',
    'time',
    'endTime',
    'allDay',
    'location',
    'memberId'
  ].some(key => JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]));
}

function notifyCalendarChange(
  req,
  event,
  {
    kind = 'created',
    previous = null
  } = {}
) {
  if (
    kind === 'updated' &&
    !calendarEventWasMateriallyChanged(previous, event)
  ) {
    return;
  }
  const copy = {
    created: {
      title: translate('push.eventCreatedTitle'),
      prefix: '',
      privateBody: translate('push.eventCreatedPrivateBody')
    },
    updated: {
      title: translate('push.eventUpdatedTitle'),
      prefix: translate('push.eventUpdatedPrefix'),
      privateBody: translate('push.eventUpdatedPrivateBody')
    },
    deleted: {
      title: translate('push.eventDeletedTitle'),
      prefix: translate('push.eventDeletedPrefix'),
      privateBody: translate('push.eventDeletedPrivateBody')
    }
  }[kind];
  if (!copy) return;
  const body = calendarEventBody(event, copy.prefix);
  const recipientMemberIds = [
    ...new Set([
      ...eventReminderRecipientMemberIds(req.session.familyId, event),
      ...(
        kind === 'updated' && previous
          ? eventReminderRecipientMemberIds(
              req.session.familyId,
              previous
            )
          : []
      )
    ])
  ];
  queueNotificationChannels(
    req.session.familyId,
    'events',
    {
      recipientMemberIds,
      excludeMemberIds: [req.session.memberId],
      title: copy.title,
      body,
      privateTitle: copy.title,
      privateBody: copy.privateBody,
      url: '/?view=calendar',
      tag: `event-${kind}-${event.sharedEventId || event.id}`
    },
    {
      title: copy.title,
      message: body,
      priority: kind === 'deleted' ? 6 : 4
    }
  );
}

function notifyChatViaWebPush(req, record) {
  const isGroup = !record.target || record.target === 'group';
  const hasAttachment = Boolean(
    record.photo ||
    (Array.isArray(record.attachments) && record.attachments.length)
  );
  const body = cleanText(
    chatAttachmentMessageCopy(record),
    translate('push.newMessage'),
    800
  );
  queueWebPushEvent(req.session.familyId, isGroup ? 'groupChat' : 'directMessages', {
    recipientMemberIds: isGroup ? null : [record.target],
    excludeMemberIds: [record.senderId],
    title: isGroup
      ? translate('push.groupChatTitle', { name: record.senderName })
      : translate('push.directMessageTitle', { name: record.senderName }),
    body,
    privateTitle: isGroup
      ? translate('push.groupChatPrivateTitle')
      : translate('push.directMessagePrivateTitle'),
    privateBody: hasAttachment
      ? translate('push.newMessageWithAttachment')
      : translate('push.newMessageArrived'),
    url: `/?view=chat&chat=${encodeURIComponent(
      isGroup ? 'group' : record.senderId
    )}`,
    tag: `chat-${record.id}`,
    priority: isGroup ? 'normal' : 'high'
  });
  const guestFamilyIds = [];
  if (isGroup) {
    const hostFamily = getFamily(req.session.familyId);
    listAcceptedChatGuestsForHost(req.session.familyId).forEach(invitation => {
      queueNotificationChannels(
        invitation.guestFamily.id,
        'groupChat',
        {
          recipientMemberIds: [invitation.guestMember.id],
          title: translate('push.guestChatTitle', {
            name: record.senderName,
            family: hostFamily.familyName
          }),
          body,
          privateTitle: translate('push.guestChatPrivateTitle', {
            family: hostFamily.familyName
          }),
          privateBody: hasAttachment
            ? translate('push.guestChatAttachmentShared')
            : translate('push.guestChatNewMessage'),
          url: `/?view=chat&chat=guest:${invitation.id}`,
          tag: `guest-chat-${invitation.id}-${record.id}`,
          priority: 'normal'
        }
      );
      guestFamilyIds.push(invitation.guestFamily.id);
    });
  }
  return guestFamilyIds;
}

function notifyCreatedResource(req, type, record) {
  const actorMemberId = req.session.memberId;
  if (type === 'tasks' && record.memberId) {
    queueNotificationChannels(
      req.session.familyId,
      'taskAssigned',
      {
        recipientMemberIds: profileNotificationRecipientIds(
          req.session.familyId,
          record.memberId
        ),
        excludeMemberIds: [actorMemberId],
        title: translate('push.taskAssignedTitle'),
        body: cleanText(
          record.title,
          translate('push.taskAssignedFallbackBody'),
          240
        ),
        privateBody: translate('push.taskAssignedPrivateBody'),
        url: '/?view=tasks',
        tag: `task-${record.id}`
      },
      {
        title: translate('push.taskAssignedGotifyTitle'),
        message: cleanText(
          record.title,
          translate('push.taskAssignedGotifyFallback'),
          240
        ),
        priority: 3
      }
    );
  }
  if (type === 'events') {
    notifyCalendarChange(req, record, { kind: 'created' });
  }
  if (type === 'encouragements' && record.memberId) {
    queueNotificationChannels(
      req.session.familyId,
      'encouragements',
      {
        recipientMemberIds: profileNotificationRecipientIds(
          req.session.familyId,
          record.memberId
        ),
        excludeMemberIds: [actorMemberId],
        title: `${record.icon || '💛'} ${translate('push.encouragementTitle')}`,
        body: cleanText(
          record.message,
          translate('push.encouragementFallbackBody'),
          240
        ),
        privateBody: translate('push.encouragementPrivateBody'),
        url: '/?view=dashboard',
        tag: `encouragement-${record.id}`
      },
      {
        title: translate('push.encouragementGotifyTitle'),
        message: translate('push.encouragementGotifyMessage'),
        priority: 3
      }
    );
  }
  if (type === 'familyPolls') {
    queueNotificationChannels(
      req.session.familyId,
      'familyPolls',
      {
        excludeMemberIds: [actorMemberId],
        title: translate('push.pollTitle'),
        body: cleanText(
          record.question,
          translate('push.pollFallbackBody'),
          240
        ),
        privateBody: translate('push.pollPrivateBody'),
        url: '/?view=family-life',
        tag: `poll-${record.id}`
      },
      {
        title: translate('push.pollTitle'),
        message: cleanText(
          record.question,
          translate('push.pollFallbackBody'),
          240
        ),
        priority: 3
      }
    );
  }
  if (type === 'schoolItems' && record.memberId) {
    const title =
      record.kind === 'exam'
        ? translate('push.examTitle')
        : translate('push.schoolItemTitle');
    queueNotificationChannels(
      req.session.familyId,
      'schoolItems',
      {
        recipientMemberIds: profileNotificationRecipientIds(
          req.session.familyId,
          record.memberId
        ),
        excludeMemberIds: [actorMemberId],
        title,
        body: cleanText(
          record.title,
          translate('push.schoolFallbackBody'),
          240
        ),
        privateBody: translate('push.schoolFallbackBody'),
        url: '/?view=family-life',
        tag: `school-${record.id}`
      },
      {
        title,
        message: cleanText(
          record.title,
          translate('push.schoolFallbackBody'),
          240
        ),
        priority: record.kind === 'exam' ? 5 : 3
      }
    );
  }
  if (type === 'familyMissions') {
    const recipients = Array.isArray(record.memberIds)
      ? record.memberIds.flatMap(memberId =>
          profileNotificationRecipientIds(req.session.familyId, memberId)
        )
      : signedInMemberIds(req.session.familyId);
    queueNotificationChannels(
      req.session.familyId,
      'familyMissions',
      {
        recipientMemberIds: [...new Set(recipients)],
        excludeMemberIds: [actorMemberId],
        title: translate('push.familyMissionTitle'),
        body: cleanText(
          record.title,
          translate('push.familyMissionFallbackBody'),
          240
        ),
        privateBody: translate('push.familyMissionPrivateBody'),
        url: '/?view=family-life',
        tag: `family-mission-${record.id}`
      },
      {
        title: translate('push.familyMissionTitle'),
        message: cleanText(
          record.title,
          translate('push.familyMissionFallbackBody'),
          240
        ),
        priority: 3
      }
    );
  }
  if (type === 'rewards') {
    const recipients = record.forMemberId
      ? profileNotificationRecipientIds(
          req.session.familyId,
          record.forMemberId
        )
      : childMemberIds(req.session.familyId);
    queueNotificationChannels(
      req.session.familyId,
      'rewards',
      {
        recipientMemberIds: recipients,
        excludeMemberIds: [actorMemberId],
        title: translate('push.rewardNewTitle'),
        body: cleanText(
          record.title,
          translate('push.rewardNewFallbackBody'),
          240
        ),
        privateBody: translate('push.rewardNewPrivateBody'),
        url: '/?view=tasks',
        tag: `reward-new-${record.id}`
      },
      {
        title: translate('push.rewardNewGotifyTitle'),
        message: cleanText(
          record.title,
          translate('push.rewardNewGotifyFallback'),
          240
        ),
        priority: 3
      }
    );
  }
}

function notifyTaskCompleted(req, result, actorMemberId) {
  const targetIsManaged = Boolean(result.member?.isManaged);
  const completionMessage = targetIsManaged
    ? translate('push.taskDoneBody', { title: result.task.title })
    : translate('push.taskDoneStarsBody', {
        title: result.task.title,
        stars: result.task.stars ?? 10
      });
  queueGotifyNotification(req.session.familyId, 'taskCompleted', {
    title: translate('push.taskCompletedTitle', {
      name: result.member?.name || translate('labels.someone')
    }),
    message: completionMessage,
    priority: 3
  });
  const adultIds = getMembers(req.session.familyId)
    .filter(isAdultMember)
    .map(entry => entry.id);
  queueWebPushEvent(req.session.familyId, 'taskCompleted', {
    recipientMemberIds: [...new Set([result.task.memberId, ...adultIds].filter(Boolean))],
    excludeMemberIds: [actorMemberId],
    title: translate('push.taskCompletedTitle', {
      name: result.member?.name || translate('labels.someone')
    }),
    body: completionMessage,
    privateTitle: translate('push.taskCompletedPrivateTitle'),
    privateBody: translate('push.taskCompletedPrivateBody'),
    url: '/?view=tasks',
    tag: `task-complete-${result.task.id}`
  });
  if (result.task.createdByExternalFamilyId) {
    queueNotificationChannels(
      result.task.createdByExternalFamilyId,
      'taskCompleted',
      {
        recipientMemberIds: adultMemberIds(
          result.task.createdByExternalFamilyId
        ),
        title: translate('push.externalTaskCompletedTitle', {
          name: result.member?.name || translate('labels.someone')
        }),
        body: result.task.title,
        privateBody:
          translate('push.externalTaskCompletedPrivateBody'),
        url: '/?view=admin',
        tag: `external-task-complete-${result.task.id}`
      },
      {
        title: translate('push.externalTaskCompletedGotifyTitle'),
        message: `${result.member?.name || translate('labels.someone')}: ${result.task.title}`,
        priority: 3
      }
    );
  }
  if (
    result.nextTask?.memberId &&
    result.nextTask.memberId !== result.task.memberId
  ) {
    queueWebPushEvent(req.session.familyId, 'taskAssigned', {
      recipientMemberIds: [result.nextTask.memberId],
      excludeMemberIds: [actorMemberId],
      title: translate('push.taskRotationTitle'),
      body: cleanText(
        result.nextTask.title,
        translate('push.taskRotationFallbackBody'),
        240
      ),
      privateBody: translate('push.taskRotationPrivateBody'),
      url: '/?view=tasks',
      tag: `task-rotation-${result.nextTask.id}`
    });
  }
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
      error: translate('errors.tooManyLoginAttempts')
    });
  }
  return next();
}

function clearAuthAttempts(req) {
  const key = req.ip || req.socket.remoteAddress || 'local';
  authAttempts.delete(key);
}

function sessionMiddleware(req, _res, next) {
  const cookieToken = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  const headerToken =
    req.headers['x-session-token'] ||
    req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const token = cookieToken || headerToken;
  req.sessionToken = token || null;
  req.session = token ? getSession(token) : null;
  next();
}

const DEMO_ALLOWED_MUTATIONS = new Set([
  '/api/auth/family',
  '/api/auth/member',
  '/api/auth/logout',
  '/api/release-notes/acknowledge'
]);

function isReadOnlyDemoFamily(familyId) {
  const configuredFamilyId = String(
    process.env.DEMO_FAMILY_ID || ''
  ).trim();
  return Boolean(
    configuredFamilyId &&
    familyId &&
    configuredFamilyId === familyId
  );
}

function protectReadOnlyDemo(req, res, next) {
  if (
    !req.session ||
    !isReadOnlyDemoFamily(req.session.familyId) ||
    ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ||
    req.path.startsWith('/api/public/') ||
    DEMO_ALLOWED_MUTATIONS.has(req.path)
  ) {
    return next();
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(403).json({
    success: false,
    readOnlyDemo: true,
    error:
      translate('errors.readOnlyDemo')
  });
}

function requireAuth(req, res, next) {
  if (!req.session) {
    return res.status(401).json({
      success: false,
      error: translate('errors.loginRequired')
    });
  }
  return next();
}

function requireAdult(req, res, next) {
  if (!req.session?.memberId) {
    return res.status(403).json({
      success: false,
      error: translate('errors.adultProfileRequired')
    });
  }
  const member = getMember(req.session.familyId, req.session.memberId);
  if (!isAdultMember(member)) {
    return res.status(403).json({
      success: false,
      error: translate('errors.adultsOnlyChange')
    });
  }
  req.activeMember = member;
  return next();
}

function requireResourceManager(req, res, next) {
  const member = req.session?.memberId
    ? getMember(req.session.familyId, req.session.memberId)
    : null;
  if (member?.role === 'pet') {
    return res.status(403).json({
      success: false,
      error: translate('errors.petProfilesProtected')
    });
  }
  if (!ADULT_MANAGED_RESOURCES.has(req.params.type)) return next();
  if (!isAdultMember(member)) {
    return res.status(403).json({
      success: false,
      error: translate('errors.entriesManagedByAdult')
    });
  }
  return next();
}

function rejectPetChatAccess(req, res) {
  if (req.params.type !== 'chatMessages') return false;
  const member = req.session?.memberId
    ? getMember(req.session.familyId, req.session.memberId)
    : null;
  if (member?.role !== 'pet') return false;
  res.status(403).json({
    success: false,
    error: translate('errors.petNoChat')
  });
  return true;
}

function requireChatMember(req, res, next) {
  const member = req.session?.memberId
    ? getMember(req.session.familyId, req.session.memberId)
    : null;
  if (!member) {
    return res.status(403).json({
      success: false,
      error: translate('errors.profileRequired')
    });
  }
  if (member.role === 'pet' || isManagedMember(member)) {
    return res.status(403).json({
      success: false,
      error: translate('errors.profileNoChat')
    });
  }
  req.activeMember = member;
  return next();
}

function normalizeHomeAssistantBaseUrl(value) {
  let url;
  try {
    url = new URL(requireText(value, translate('fields.homeAssistantAddress'), 2000));
  } catch {
    const error = new Error(translate('errors.homeAssistantAddressInvalid'));
    error.statusCode = 400;
    throw error;
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    const error = new Error(
      translate('errors.homeAssistantProtocol')
    );
    error.statusCode = 400;
    throw error;
  }
  if (url.username || url.password || url.search || url.hash) {
    const error = new Error(
      translate('errors.homeAssistantAddressExtras')
    );
    error.statusCode = 400;
    throw error;
  }
  url.pathname = url.pathname.replace(/\/+$/, '');
  return url.href.replace(/\/$/, '');
}

function homeAssistantDomain(entityId) {
  return cleanText(entityId, '', 180).split('.')[0];
}

function normalizeHomeAssistantEntities(value = []) {
  const seen = new Set();
  return (Array.isArray(value) ? value : [])
    .slice(0, 80)
    .map(item => {
      const input = item && typeof item === 'object' ? item : {};
      const entityId = cleanText(input.entityId, '', 180);
      const domain = homeAssistantDomain(entityId);
      if (
        !/^[a-z0-9_]+\.[a-z0-9_]+$/.test(entityId) ||
        !HOME_ASSISTANT_VISIBLE_DOMAINS.has(domain) ||
        seen.has(entityId)
      ) {
        return null;
      }
      seen.add(entityId);
      return {
        entityId,
        name: cleanText(input.name, entityId, 100),
        allowControl: Boolean(
          input.allowControl && HOME_ASSISTANT_CONTROL_ACTIONS[domain]
        ),
        profileIds: [
          ...new Set(
            (Array.isArray(input.profileIds) ? input.profileIds : [])
              .map(id => cleanText(id, '', 100))
              .filter(Boolean)
          )
        ].slice(0, 30)
      };
    })
    .filter(Boolean);
}

function publicHomeAssistantEntity(state, configured = null) {
  const entityId = cleanText(state?.entity_id, '', 180);
  const attributes =
    state?.attributes &&
    typeof state.attributes === 'object' &&
    !Array.isArray(state.attributes)
      ? state.attributes
      : {};
  return {
    entityId,
    domain: homeAssistantDomain(entityId),
    name: cleanText(
      configured?.name || attributes.friendly_name,
      entityId,
      100
    ),
    state: cleanText(state?.state, 'unknown', 100),
    unit: cleanText(attributes.unit_of_measurement, '', 30),
    deviceClass: cleanText(attributes.device_class, '', 60),
    icon: cleanText(attributes.icon, '', 100),
    temperature:
      Number.isFinite(Number(attributes.current_temperature))
        ? Number(attributes.current_temperature)
        : null,
    targetTemperature:
      Number.isFinite(Number(attributes.temperature))
        ? Number(attributes.temperature)
        : null,
    battery:
      Number.isFinite(Number(attributes.battery_level))
        ? Number(attributes.battery_level)
        : null,
    allowControl: Boolean(configured?.allowControl),
    requiresAdult:
      homeAssistantDomain(entityId) === 'cover' &&
      ['garage', 'gate'].includes(cleanText(attributes.device_class, '', 60)),
    lastChanged: state?.last_changed || '',
    lastUpdated: state?.last_updated || ''
  };
}

async function homeAssistantFetch(integration, pathname, options = {}) {
  const secret = decryptJson(integration.secretEncrypted);
  let response;
  try {
    response = await fetch(`${integration.config.baseUrl}${pathname}`, {
      ...options,
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${secret.token}`,
        ...(options.headers || {})
      }
    });
  } catch {
    const error = new Error(
      translate('errors.homeAssistantUnreachable')
    );
    error.statusCode = 502;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(
      response.status === 401 || response.status === 403
        ? translate('errors.homeAssistantTokenRejected')
        : translate('errors.homeAssistantServerError', {
            status: response.status
          })
    );
    error.statusCode = 502;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

async function fetchHomeAssistantEntities(integration) {
  const states = await homeAssistantFetch(integration, '/api/states');
  return (Array.isArray(states) ? states : [])
    .filter(state =>
      HOME_ASSISTANT_VISIBLE_DOMAINS.has(
        homeAssistantDomain(state?.entity_id)
      )
    )
    .slice(0, 1500)
    .map(state => publicHomeAssistantEntity(state))
    .sort((left, right) =>
      left.name.localeCompare(right.name, 'de', { sensitivity: 'base' })
    );
}

function homeAssistantEntityVisibleTo(config, member) {
  if (!member || member.role === 'pet') return false;
  if (isAdultMember(member)) return true;
  return Array.isArray(config.profileIds) && config.profileIds.includes(member.id);
}

async function selectedHomeAssistantStates(familyId, member) {
  const integration = getIntegration(familyId, 'home-assistant');
  if (!integration || integration.config?.enabled === false) return [];
  const selected = normalizeHomeAssistantEntities(
    integration.config?.selectedEntities
  ).filter(config => homeAssistantEntityVisibleTo(config, member));
  if (!selected.length) return [];
  const rawStates = await homeAssistantFetch(integration, '/api/states');
  const byId = new Map(
    (Array.isArray(rawStates) ? rawStates : [])
      .map(state => [state.entity_id, state])
  );
  return selected
    .map(config => {
      const state = byId.get(config.entityId);
      return state ? publicHomeAssistantEntity(state, config) : null;
    })
    .filter(Boolean);
}

function safeNextcloudBrowserFolderUrl(publicBaseUrl, folder) {
  try {
    return nextcloudBrowserFolderUrl(publicBaseUrl, folder);
  } catch {
    return '';
  }
}

function bundledNextcloudAdmin() {
  const username = cleanText(
    process.env.NEXTCLOUD_ADMIN_USER,
    'familyadmin',
    300
  );
  const password = cleanText(
    process.env.NEXTCLOUD_ADMIN_PASSWORD,
    '',
    1000
  );
  if (
    !password ||
    password === 'disabled-profile' ||
    password.startsWith('change-me')
  ) {
    return null;
  }
  return {
    baseUrl: cleanText(
      process.env.NEXTCLOUD_INTERNAL_URL,
      'http://nextcloud',
      2000
    ),
    username,
    password
  };
}

function bundledNextcloudPublicUrl() {
  const configured = cleanText(
    process.env.NEXTCLOUD_PUBLIC_URL,
    '',
    2000
  );
  if (!configured) return '';
  try {
    return normalizeNextcloudBaseUrl(
      configured,
      translate('fields.publicNextcloudAddress')
    );
  } catch {
    return '';
  }
}

function bundledNextcloudQuota() {
  return cleanText(
    process.env.NEXTCLOUD_FAMILY_QUOTA,
    '10GB',
    80
  );
}

function nextcloudAutoProvisionMetaKey(familyId) {
  return `${NEXTCLOUD_AUTO_PROVISION_META_PREFIX}${familyId}`;
}

async function provisionBundledNextcloudForFamily(
  familyId,
  options = {}
) {
  const bundled = bundledNextcloudAdmin();
  if (!bundled) {
    throw Object.assign(
      new Error(
        translate('errors.bundledCloudNotActivated')
      ),
      { statusCode: 503 }
    );
  }
  const family = getFamily(familyId);
  if (!family) {
    throw Object.assign(
      new Error(translate('errors.familyNotFound')),
      { statusCode: 404 }
    );
  }
  const existing = getIntegration(familyId, 'nextcloud');
  if (existing && options.replace !== true) {
    return { integration: existing, created: false };
  }
  const publicBaseUrl = normalizeNextcloudBaseUrl(
    options.publicBaseUrl || bundledNextcloudPublicUrl(),
    translate('fields.nextcloudBrowserAddress')
  );
  const folder = normalizeNextcloudFolder(
    options.folder || existing?.config?.folder || 'LX Family'
  );
  const userId =
    `lx-${createHash('sha256')
      .update(familyId)
      .digest('hex')
      .slice(0, 20)}`;
  const displayName = cleanText(
    `LX Family · ${family.familyName || 'Familie'}`,
    'LX Family',
    200
  );
  const loginPassword = randomBytes(48).toString('base64url');
  const provisioned = await provisionNextcloudUser({
    baseUrl: bundled.baseUrl,
    adminUsername: bundled.username,
    adminPassword: bundled.password,
    userId,
    displayName,
    password: loginPassword,
    quota: bundledNextcloudQuota(),
    appVersion: APP_VERSION
  });
  const connection = {
    baseUrl: bundled.baseUrl,
    username: provisioned.userId,
    appPassword: provisioned.appPassword,
    appVersion: APP_VERSION
  };
  let inspection = await inspectNextcloud(connection);
  if (
    !inspection.calendars.some(calendar =>
      calendar.components.includes('VEVENT')
    )
  ) {
    await ensureNextcloudCalendar(
      connection,
      inspection.userId,
      'LX Family'
    );
    inspection = await inspectNextcloud(connection);
  }
  await ensureNextcloudFolder(
    connection,
    inspection.userId,
    folder
  );
  const eventCalendarHref =
    inspection.calendars.find(calendar =>
      calendar.components.includes('VEVENT')
    )?.href || '';
  if (!eventCalendarHref) {
    throw Object.assign(
      new Error(
        translate('errors.nextcloudNoFamilyCalendar')
      ),
      { statusCode: 502 }
    );
  }
  const config = {
    ...(existing?.config || {}),
    enabled: true,
    bundled: true,
    baseUrl: bundled.baseUrl,
    publicBaseUrl,
    host: new URL(publicBaseUrl).host,
    userId: inspection.userId,
    displayName: inspection.displayName || displayName,
    quota: provisioned.quota,
    nextcloudVersion: inspection.version,
    calendars: inspection.calendars,
    eventCalendarHref,
    eventSyncEnabled: true,
    defaultMemberId: 'all',
    includeGrandparents: Boolean(
      options.includeGrandparents ??
      existing?.config?.includeGrandparents
    ),
    folder,
    backupEnabled: true,
    backupHour: Math.max(
      0,
      Math.min(
        23,
        Number(
          options.backupHour ??
          existing?.config?.backupHour ??
          3
        )
      )
    ),
    lastSyncError: '',
    lastBackupError: ''
  };
  saveIntegration(
    familyId,
    'nextcloud',
    config,
    encryptJson({
      username: provisioned.userId,
      appPassword: provisioned.appPassword,
      loginPassword
    })
  );
  setAppMeta(nextcloudAutoProvisionMetaKey(familyId), 'false');
  return {
    integration: getIntegration(familyId, 'nextcloud'),
    created: !existing
  };
}

function integrationStatus(familyId, member = null) {
  const bring = getIntegration(familyId, 'bring');
  const gotify = getIntegration(familyId, 'gotify');
  const homeAssistant = getIntegration(familyId, 'home-assistant');
  const nextcloud = getIntegration(familyId, 'nextcloud');
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
        },
    homeAssistant: homeAssistant
      ? (() => {
          const selectedEntities = normalizeHomeAssistantEntities(
            homeAssistant.config?.selectedEntities
          ).filter(entity =>
            !member || homeAssistantEntityVisibleTo(entity, member)
          );
          return {
          connected: true,
          enabled: homeAssistant.config?.enabled !== false,
          ...(member && !isAdultMember(member)
            ? {}
            : {
                baseUrl: homeAssistant.config?.baseUrl || '',
                host: homeAssistant.config?.host || ''
              }),
          selectedEntities,
          updatedAt: homeAssistant.updatedAt
          };
        })()
      : {
          connected: false,
          enabled: false,
          selectedEntities: []
        },
    nextcloud: nextcloud
      ? (() => {
          const config = nextcloud.config || {};
          const adultView = !member || isAdultMember(member);
          const configuredPublicUrl = bundledNextcloudPublicUrl();
          const publicBaseUrl =
            config.bundled && configuredPublicUrl
              ? configuredPublicUrl
              : config.publicBaseUrl || config.baseUrl || '';
          return {
            connected: true,
            enabled: config.enabled !== false,
            bundled: Boolean(config.bundled),
            eventSyncEnabled: config.eventSyncEnabled !== false,
            backupEnabled: Boolean(config.backupEnabled),
            lastSyncAt: Number(config.lastSyncAt || 0),
            lastSyncError: cleanText(config.lastSyncError, '', 300),
            lastSyncStats: ensureObject(config.lastSyncStats),
            lastBackupAt: Number(config.lastBackupAt || 0),
            lastBackupError: cleanText(config.lastBackupError, '', 300),
            backupHour: Math.max(
              0,
              Math.min(23, Number(config.backupHour ?? 3))
            ),
            updatedAt: nextcloud.updatedAt,
            ...(adultView
              ? {
                  baseUrl: config.baseUrl || '',
                  publicBaseUrl,
                  bundledPublicBaseUrl: configuredPublicUrl,
                  host: (() => {
                    try {
                      return new URL(publicBaseUrl).host;
                    } catch {
                      return config.host || '';
                    }
                  })(),
                  userId: config.userId || '',
                  displayName: config.displayName || config.userId || '',
                  quota: config.quota || bundledNextcloudQuota(),
                  nextcloudVersion: config.nextcloudVersion || '',
                  calendars: Array.isArray(config.calendars)
                    ? config.calendars
                    : [],
                  eventCalendarHref: config.eventCalendarHref || '',
                  defaultMemberId: config.defaultMemberId || 'all',
                  includeGrandparents: Boolean(config.includeGrandparents),
                  folder: config.folder || 'LX Family',
                  browserFolderUrl: publicBaseUrl
                    ? safeNextcloudBrowserFolderUrl(
                        publicBaseUrl,
                        config.folder || 'LX Family'
                      )
                    : ''
                }
              : {})
          };
        })()
      : {
          connected: false,
          enabled: false,
          bundled: false,
          bundledPublicBaseUrl: bundledNextcloudPublicUrl(),
          eventSyncEnabled: false,
          backupEnabled: false,
          lastSyncAt: 0,
          lastSyncError: '',
          lastBackupAt: 0,
          lastBackupError: ''
        }
  };
}

function nextcloudConnection(integration) {
  const secret = decryptJson(integration.secretEncrypted);
  return {
    baseUrl: integration.config.baseUrl,
    username: secret.username,
    appPassword: secret.appPassword,
    appVersion: APP_VERSION
  };
}

function nextcloudWorkspace(familyId) {
  const integration = getIntegration(familyId, 'nextcloud');
  if (!integration || integration.config?.enabled === false) {
    const error = new Error(translate('errors.familyCloudNotConnected'));
    error.statusCode = 404;
    throw error;
  }
  const connection = nextcloudConnection(integration);
  return {
    integration,
    connection,
    userId:
      cleanText(integration.config?.userId, '', 300) ||
      connection.username,
    folder: normalizeNextcloudFolder(
      integration.config?.folder || 'LX Family'
    )
  };
}

async function ensureFamilyCloudStructure(familyId, workspace) {
  const members = getMembers(familyId)
    .filter(member => !isManagedMember(member) && member.role !== 'pet');
  const relativeFolders = [
    CLOUD_SHARED_FOLDER,
    `${CLOUD_SHARED_FOLDER}/Chat`,
    `${CLOUD_SHARED_FOLDER}/Uploads`,
    CLOUD_PROFILE_FOLDER,
    ...members.map(member => cloudProfileFolder(member, members))
  ];
  for (const relativeFolder of relativeFolders) {
    await ensureNextcloudFolder(
      workspace.connection,
      workspace.userId,
      `${workspace.folder}/${relativeFolder}`
    );
  }
  return relativeFolders;
}

async function listFamilyCloudFolders(workspace, maxDepth = 4) {
  const folders = [];
  const pending = [{ path: '', depth: 0 }];
  const visited = new Set();
  while (pending.length && folders.length < 100) {
    const current = pending.shift();
    if (visited.has(current.path)) continue;
    visited.add(current.path);
    const entries = await listNextcloudFiles(
      workspace.connection,
      workspace.userId,
      workspace.folder,
      current.path
    );
    for (const entry of entries) {
      if (entry.type !== 'folder') continue;
      if (entry.name.startsWith('.LX-')) continue;
      folders.push({
        name: entry.name,
        path: entry.path,
        depth: current.depth
      });
      if (current.depth + 1 < maxDepth) {
        pending.push({
          path: entry.path,
          depth: current.depth + 1
        });
      }
      if (folders.length >= 100) break;
    }
  }
  return folders;
}

function chatArchiveFolder(target = 'group', now = new Date()) {
  const root = target === 'group'
    ? CHAT_ATTACHMENT_FOLDER
    : PRIVATE_CHAT_ATTACHMENT_FOLDER;
  return `${root}/${now.toISOString().slice(0, 7)}`;
}

function chatArchiveFileName(originalName, now = new Date(), encrypted = false) {
  const stamp = now
    .toISOString()
    .replace(/\.\d{3}Z$/, '')
    .replaceAll(':', '-')
    .replace('T', '_');
  const name = safeCloudName(
    `${stamp}_${randomUUID().slice(0, 8)}_${safeCloudName(
      originalName,
      'Datei'
    )}`,
    `Chat-${stamp}`
  );
  return encrypted ? `${name}.lxenc`.slice(0, 240) : name;
}

function chatAttachmentById(message, attachmentId) {
  return (Array.isArray(message?.attachments) ? message.attachments : [])
    .find(attachment => attachment.id === attachmentId) || null;
}

function canInlineChatAttachment(attachment) {
  return [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/avif',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
    'audio/wav',
    'application/pdf'
  ].includes(String(attachment?.mimeType || '').toLowerCase());
}

function nextcloudBackupBundle(familyId) {
  const family = getFamily(familyId);
  const resources = Object.fromEntries(
    [...RECORD_TYPES].map(type => [type, listRecords(familyId, type)])
  );
  return {
    format: 'lx-family-cloud-backup',
    formatVersion: 1,
    appVersion: APP_VERSION,
    createdAt: new Date().toISOString(),
    family,
    members: getMembers(familyId),
    resources,
    calendarSubscriptions: listCalendarSubscriptions(familyId)
  };
}

async function performNextcloudSyncUnlocked(familyId, existing = null) {
  const integration = existing || getIntegration(familyId, 'nextcloud');
  if (
    !integration ||
    integration.config?.enabled === false ||
    integration.config?.eventSyncEnabled === false
  ) {
    return null;
  }
  try {
    const stats = await syncNextcloudEvents({
      familyId,
      connection: nextcloudConnection(integration),
      calendarHref: integration.config.eventCalendarHref,
      defaultMemberId: integration.config.defaultMemberId || 'all',
      includeGrandparents: Boolean(
        integration.config.includeGrandparents
      ),
      timeZone: process.env.TZ || 'Europe/Berlin',
      memberIds: getMembers(familyId).map(member => member.id)
    });
    saveIntegration(
      familyId,
      'nextcloud',
      {
        ...integration.config,
        lastSyncAt: Date.now(),
        lastSyncError: '',
        lastSyncStats: stats
      },
      integration.secretEncrypted
    );
    return stats;
  } catch (error) {
    saveIntegration(
      familyId,
      'nextcloud',
      {
        ...integration.config,
        lastSyncAt: Date.now(),
        lastSyncError: cleanText(
          error.message,
          translate('errors.nextcloudSyncFailed'),
          300
        )
      },
      integration.secretEncrypted
    );
    throw error;
  }
}

async function performNextcloudSync(familyId, existing = null) {
  const running = nextcloudSyncLocks.get(familyId);
  if (running) return running;
  const operation = performNextcloudSyncUnlocked(familyId, existing);
  nextcloudSyncLocks.set(familyId, operation);
  try {
    return await operation;
  } finally {
    if (nextcloudSyncLocks.get(familyId) === operation) {
      nextcloudSyncLocks.delete(familyId);
    }
  }
}

async function performNextcloudBackupUnlocked(familyId, existing = null) {
  const integration = existing || getIntegration(familyId, 'nextcloud');
  if (!integration || integration.config?.enabled === false) {
    return null;
  }
  try {
    const bundle = nextcloudBackupBundle(familyId);
    const encrypted = encryptJson(bundle);
    const date = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = `lx-family-${date}`;
    const folder = `${integration.config.folder || 'LX Family'}/Backups`;
    const connection = nextcloudConnection(integration);
    const backup = await uploadNextcloudFile(
      connection,
      integration.config.userId,
      folder,
      `${baseName}.lxbackup`,
      Buffer.from(encrypted, 'utf8'),
      'application/octet-stream'
    );
    const manifest = {
      format: bundle.format,
      formatVersion: bundle.formatVersion,
      appVersion: APP_VERSION,
      createdAt: bundle.createdAt,
      familyId,
      encrypted: true,
      encryption: 'AES-256-GCM',
      file: backup.fileName,
      sha256: createHash('sha256').update(encrypted).digest('hex')
    };
    await uploadNextcloudFile(
      connection,
      integration.config.userId,
      folder,
      `${baseName}.manifest.json`,
      Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
      'application/json; charset=utf-8'
    );
    saveIntegration(
      familyId,
      'nextcloud',
      {
        ...integration.config,
        lastBackupAt: Date.now(),
        lastBackupAttemptAt: Date.now(),
        lastBackupError: ''
      },
      integration.secretEncrypted
    );
    return { fileName: backup.fileName, createdAt: bundle.createdAt };
  } catch (error) {
    saveIntegration(
      familyId,
      'nextcloud',
      {
        ...integration.config,
        lastBackupAttemptAt: Date.now(),
        lastBackupError: cleanText(
          error.message,
          translate('errors.nextcloudBackupFailed'),
          300
        )
      },
      integration.secretEncrypted
    );
    throw error;
  }
}

async function performNextcloudBackup(familyId, existing = null) {
  const running = nextcloudBackupLocks.get(familyId);
  if (running) return running;
  const operation = performNextcloudBackupUnlocked(familyId, existing);
  nextcloudBackupLocks.set(familyId, operation);
  try {
    return await operation;
  } finally {
    if (nextcloudBackupLocks.get(familyId) === operation) {
      nextcloudBackupLocks.delete(familyId);
    }
  }
}

function nextcloudBackupIsDue(integration, now = new Date()) {
  if (
    !integration?.config?.backupEnabled ||
    integration.config?.enabled === false
  ) {
    return false;
  }
  const wantedHour = Math.max(
    0,
    Math.min(23, Number(integration.config.backupHour ?? 3))
  );
  const lastBackupAt = Number(integration.config.lastBackupAt || 0);
  const lastBackupAttemptAt = Number(
    integration.config.lastBackupAttemptAt || 0
  );
  return (
    now.getHours() >= wantedHour &&
    now.getTime() - lastBackupAt >= 20 * 60 * 60 * 1000 &&
    now.getTime() - lastBackupAttemptAt >= 60 * 60 * 1000
  );
}

function normalizeGotifyBaseUrl(value) {
  let url;
  try {
    url = new URL(requireText(value, translate('fields.gotifyAddress'), 2000));
  } catch {
    const error = new Error(translate('errors.gotifyAddressInvalid'));
    error.statusCode = 400;
    throw error;
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    const error = new Error(translate('errors.gotifyProtocol'));
    error.statusCode = 400;
    throw error;
  }
  if (url.username || url.password || url.search || url.hash) {
    const error = new Error(
      translate('errors.gotifyAddressExtras')
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
    const error = new Error(translate('errors.plannerUrlInvalid'));
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
      message: cleanText(payload.message, translate('push.gotifyDefaultMessage'), 3000),
      priority: Math.max(-2, Math.min(10, Number(payload.priority || 4))),
      extras
    })
  });
  if (!response.ok) {
    const error = new Error(
      translate('errors.gotifyMessageRejected', { status: response.status })
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
  const familySettings = getRecord(
    familyId,
    'familySettings',
    'family-settings'
  );
  const quietNow =
    familySettings?.quietHoursEnabled &&
    isWithinTimeWindow(
      familySettings.quietStart || '20:00',
      familySettings.quietEnd || '07:00'
    );
  const urgentAllowed =
    familySettings?.urgentDuringQuietHours !== false &&
    (priority >= 8 || eventKey === 'moodHelp');
  if (quietNow && !urgentAllowed) return false;
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
        chatAttachmentMessageCopy(record),
        translate('push.newMessage'),
        800
      )
    : (
        record.photo ||
        (Array.isArray(record.attachments) && record.attachments.length)
          ? translate('push.newMessageWithAttachment')
          : translate('push.newMessageArrived')
      );
  queueGotifyNotification(req.session.familyId, eventKey, {
    title: isGroup
      ? translate('push.gotifyGroupChatTitle', { name: record.senderName })
      : translate('push.gotifyDirectMessageTitle', {
          name: record.senderName
        }),
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

function visibleFamilyChatGuests(familyId, member) {
  if (!member || member.role === 'pet') return [];
  return listFamilyChatGuests(familyId).filter(invitation => {
    if (isAdultMember(member)) return true;
    if (invitation.direction === 'host') {
      return invitation.status === 'accepted';
    }
    return invitation.guestMember.id === member.id;
  });
}

function bootstrapForSession(session) {
  const bootstrap = getBootstrap(session.familyId);
  const member = session.memberId
    ? getMember(session.familyId, session.memberId)
    : null;
  const managedMemberIds = new Set(
    bootstrap.members
      .filter(isManagedMember)
      .map(entry => entry.id)
  );
  bootstrap.resources.chatMessages =
    member?.role === 'pet'
      ? []
      : visibleChatMessages(
          bootstrap.resources.chatMessages,
          session.memberId
        );
  if (member && !isAdultMember(member)) {
    bootstrap.members = bootstrap.members.filter(
      entry => !isManagedMember(entry)
    );
    bootstrap.resources.events = bootstrap.resources.events.filter(
      event => !managedMemberIds.has(event.memberId)
    );
    bootstrap.resources.tasks = bootstrap.resources.tasks.filter(
      task => !managedMemberIds.has(task.memberId)
    );
    for (const type of PROFILE_SCOPED_FAMILY_LIFE_TYPES) {
      bootstrap.resources[type] = member.role === 'pet'
        ? []
        : (bootstrap.resources[type] || []).filter(
            record => record.memberId === member.id
          );
    }
  }
  bootstrap.familyRelationships = listFamilyRelationships(session.familyId);
  bootstrap.familyLetters = isAdultMember(member)
    ? listFamilyLetters(session.familyId, session.memberId)
    : [];
  bootstrap.familyChatGuests = visibleFamilyChatGuests(
    session.familyId,
    member
  );
  bootstrap.calendarSubscriptions = listCalendarSubscriptions(
    session.familyId
  ).filter(
    subscription =>
      isAdultMember(member) ||
      !managedMemberIds.has(subscription.memberId)
  );
  bootstrap.notifications = member?.role === 'pet'
    ? []
    : listInboxNotifications(session.familyId, session.memberId);
  bootstrap.unreadNotificationCount = member?.role === 'pet'
    ? 0
    : countUnreadInboxNotifications(session.familyId, session.memberId);
  return bootstrap;
}

function sessionChatRecord(req, record) {
  const input = ensureObject(record);
  const member = req.session.memberId
    ? getMember(req.session.familyId, req.session.memberId)
    : null;
  if (!member) {
    const error = new Error(translate('errors.profileRequired'));
    error.statusCode = 403;
    throw error;
  }
  const target = cleanText(input.target, 'group', 100);
  if (target !== 'group') {
    const targetMember = getMember(req.session.familyId, target);
    if (!targetMember) {
      const error = new Error(translate('errors.targetProfileNotFound'));
      error.statusCode = 404;
      throw error;
    }
    if (targetMember.role === 'pet' || targetMember.isManaged) {
      const error = new Error(
        targetMember.isManaged
          ? translate('errors.managedProfileNoChat')
          : translate('errors.petCannotReceiveChat')
      );
      error.statusCode = 403;
      throw error;
    }
  }
  const text = cleanText(input.text, '', 4000);
  const photo = cleanText(input.photo, '', 2_500_000);
  const attachments = sanitizeChatAttachments(
    input.attachments,
    req.session.familyId,
    target
  );
  if (!text && !photo && !attachments.length) {
    const error = new Error(translate('errors.messageEmpty'));
    error.statusCode = 400;
    throw error;
  }
  return {
    ...input,
    text,
    photo,
    attachments,
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
    (record?.senderId === member.id || isAdultMember(member))
  );
}

function sanitizeDashboardLink(req, value) {
  const input = ensureObject(value);
  const memberId = requireText(input.memberId, translate('fields.childProfile'), 100);
  const member = getMember(req.session.familyId, memberId);
  if (
    !member ||
    member.isManaged ||
    !['child', 'teen'].includes(member.role)
  ) {
    const error = new Error(translate('errors.childProfileRequired'));
    error.statusCode = 400;
    throw error;
  }

  let url;
  try {
    url = new URL(requireText(input.url, translate('fields.mediaAddress'), 2000));
  } catch {
    const error = new Error(translate('errors.mediaUrlInvalid'));
    error.statusCode = 400;
    throw error;
  }
  const hostname = url.hostname.toLowerCase();
  const kind = YOUTUBE_HOSTS.has(hostname)
    ? 'youtube'
    : SPOTIFY_HOSTS.has(hostname)
      ? 'spotify'
      : '';
  if (url.protocol !== 'https:' || !kind) {
    const error = new Error(
      translate('errors.mediaLinkAllowed')
    );
    error.statusCode = 400;
    throw error;
  }
  const requestedKind = cleanText(input.kind, '', 20).toLowerCase();
  if (requestedKind && requestedKind !== kind) {
    const error = new Error(
      translate('errors.mediaKindMismatch', {
        kind: requestedKind === 'spotify' ? 'Spotify' : 'YouTube'
      })
    );
    error.statusCode = 400;
    throw error;
  }
  if (
    kind === 'spotify' &&
    !/^\/(?:playlist|album|artist|track|show|episode)\//i.test(url.pathname)
  ) {
    const error = new Error(
      translate('errors.spotifyDirectLinkRequired')
    );
    error.statusCode = 400;
    throw error;
  }
  const requestedColor = cleanText(input.color, '', 24);
  const color = /^#[0-9a-f]{6}$/i.test(requestedColor)
    ? requestedColor
    : kind === 'spotify'
      ? '#1db954'
      : '#ff4f55';

  return {
    ...input,
    memberId,
    title: requireText(input.title, translate('fields.title'), 80),
    url: url.href,
    kind,
    color,
    coverUrl: safeCoverUrl(input.coverUrl, kind),
    coverCheckedAt: Math.max(0, Number(input.coverCheckedAt) || 0),
    providerTitle: cleanText(input.providerTitle, '', 160),
    description: cleanText(input.description, '', 120),
    createdAt: Number(input.createdAt || Date.now())
  };
}

async function enrichDashboardLinkPreview(value) {
  if (process.env.NODE_ENV === 'test') return value;
  try {
    const preview = await resolveMediaPreview({
      kind: value.kind,
      url: value.url
    });
    return {
      ...value,
      coverUrl:
        safeCoverUrl(preview.coverUrl, value.kind) ||
        safeCoverUrl(value.coverUrl, value.kind),
      providerTitle: cleanText(
        preview.providerTitle || value.providerTitle,
        '',
        160
      ),
      coverCheckedAt: Date.now()
    };
  } catch (error) {
    console.warn(
      `Medien-Cover für ${value.url} konnte nicht geladen werden:`,
      error.message
    );
    return {
      ...value,
      coverCheckedAt: Date.now()
    };
  }
}

const FAMILY_LIFE_TYPES = new Set([
  'dailyRoutines',
  'savingsGoals',
  'schoolItems',
  'familyPolls',
  'encouragements',
  'familyMissions',
  'familySettings',
  'kidProfiles'
]);
const PROFILE_SCOPED_FAMILY_LIFE_TYPES = new Set([
  'dailyRoutines',
  'savingsGoals',
  'pocketMoneyTransactions',
  'schoolItems',
  'encouragements',
  'kidProfiles'
]);

function familyLifeMember(req, memberId, { childrenOnly = false } = {}) {
  const member = getMember(
    req.session.familyId,
    requireText(memberId, translate('fields.familyProfile'), 100)
  );
  if (
    !member ||
    member.role === 'pet' ||
    (childrenOnly &&
      (member.isManaged || !['child', 'teen'].includes(member.role)))
  ) {
    const error = new Error(
      childrenOnly
        ? translate('errors.childProfileRequired')
        : translate('errors.familyProfileNotFound')
    );
    error.statusCode = 400;
    throw error;
  }
  return member;
}

function cleanDate(value, fallback = '') {
  const date = cleanText(value, fallback, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : fallback;
}

function cleanTime(value, fallback = '') {
  const time = cleanText(value, fallback, 5);
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : fallback;
}

function sanitizeCalendarEvent(req, value, existing = null) {
  const input = ensureObject(value);
  const date = cleanDate(input.date, '');
  if (!date) {
    const error = new Error(translate('errors.eventDateInvalid'));
    error.statusCode = 400;
    throw error;
  }
  const memberId = cleanText(input.memberId, 'all', 100) || 'all';
  const targetMember =
    memberId === 'all'
      ? null
      : getMember(req.session.familyId, memberId);
  if (memberId !== 'all' && !targetMember) {
    const error = new Error(translate('errors.selectedFamilyProfileNotFound'));
    error.statusCode = 400;
    throw error;
  }
  if (
    targetMember?.isManaged &&
    !isAdultMember(
      req.activeMember ||
      getMember(req.session.familyId, req.session.memberId)
    )
  ) {
    const error = new Error(
      translate('errors.managedEventsAdultOnly')
    );
    error.statusCode = 403;
    throw error;
  }
  const allDay = Boolean(input.allDay);
  const startTime = allDay ? '' : cleanTime(input.time, '');
  const endDate = cleanDate(input.endDate, '');
  const endTime = allDay ? '' : cleanTime(input.endTime, '');
  if (
    (endDate && endDate < date) ||
    (allDay && endDate && endDate <= date) ||
    (!allDay && endTime && !startTime) ||
    (!allDay && (!endDate || endDate === date) && endTime &&
      endTime <= startTime)
  ) {
    const error = new Error(translate('errors.eventEndInvalid'));
    error.statusCode = 400;
    throw error;
  }
  return {
    ...(existing || {}),
    ...input,
    title: requireText(input.title, translate('fields.eventTitle'), 240),
    date,
    time: startTime,
    endDate,
    endTime,
    allDay,
    memberId,
    location: cleanText(input.location, '', 300),
    notes: cleanText(input.notes, '', 2000),
    category: cleanText(input.category, 'Allgemein', 80),
    reminders: normalizeEventReminders(input.reminders)
  };
}

function sanitizeTrashEvent(value, existing = null) {
  const input = ensureObject(value);
  const date = cleanDate(input.date, '');
  if (!date) {
    const error = new Error(translate('errors.trashDateInvalid'));
    error.statusCode = 400;
    throw error;
  }
  return {
    ...(existing || {}),
    ...input,
    title: requireText(input.title, translate('fields.trashLabel'), 240),
    date,
    type: cleanText(input.type, 'rest', 40),
    household: cleanText(input.household, 'familie', 100),
    reminders: Object.hasOwn(input, 'reminders')
      ? normalizeTrashReminders(input.reminders)
      : normalizeTrashReminders(existing?.reminders)
  };
}

function sanitizeFamilyLifeRecord(req, type, value, existing = null) {
  const input = ensureObject(value);
  const now = Date.now();
  if (type === 'dailyRoutines') {
    const member = familyLifeMember(req, input.memberId, {
      childrenOnly: true
    });
    const steps = (Array.isArray(input.steps) ? input.steps : [])
      .slice(0, 16)
      .map((step, index) => ({
        id: cleanText(step?.id, `step-${index + 1}`, 80),
        title: requireText(
          step?.title,
          translate('fields.routineStepN', { index: index + 1 }),
          100
        ),
        icon: cleanText(step?.icon, '✓', 12)
      }));
    if (!steps.length) {
      const error = new Error(translate('errors.routineStepsRequired'));
      error.statusCode = 400;
      throw error;
    }
    return {
      ...existing,
      ...input,
      memberId: member.id,
      title: requireText(input.title, translate('fields.routineName'), 100),
      icon: cleanText(input.icon, '☀️', 12),
      timeOfDay: ['morning', 'afternoon', 'evening'].includes(input.timeOfDay)
        ? input.timeOfDay
        : 'morning',
      steps,
      completions:
        existing?.completions &&
        typeof existing.completions === 'object' &&
        !Array.isArray(existing.completions)
          ? existing.completions
          : {},
      active: input.active !== false,
      createdAt: Number(existing?.createdAt || input.createdAt || now)
    };
  }
  if (type === 'savingsGoals') {
    const member = familyLifeMember(req, input.memberId, {
      childrenOnly: true
    });
    return {
      ...existing,
      ...input,
      memberId: member.id,
      title: requireText(input.title, translate('fields.savingsGoal'), 100),
      icon: cleanText(input.icon, '🎯', 12),
      targetCents: Math.max(
        100,
        Math.min(10_000_000, Math.trunc(Number(input.targetCents || 0)))
      ),
      color: /^#[0-9a-f]{6}$/i.test(input.color || '')
        ? input.color
        : '#e09b37',
      createdAt: Number(existing?.createdAt || input.createdAt || now)
    };
  }
  if (type === 'schoolItems') {
    const member = familyLifeMember(req, input.memberId, {
      childrenOnly: true
    });
    const kind = ['lesson', 'homework', 'exam', 'bag'].includes(input.kind)
      ? input.kind
      : 'homework';
    return {
      ...existing,
      ...input,
      memberId: member.id,
      kind,
      title: requireText(input.title, translate('fields.schoolItem'), 140),
      subject: cleanText(input.subject, '', 80),
      details: cleanText(input.details, '', 500),
      date: cleanDate(input.date, ''),
      weekday: Math.max(0, Math.min(6, Math.trunc(Number(input.weekday || 0)))),
      time: cleanTime(input.time, ''),
      completed: Boolean(existing?.completed && kind !== 'lesson' && kind !== 'exam'),
      createdAt: Number(existing?.createdAt || input.createdAt || now)
    };
  }
  if (type === 'familyPolls') {
    const options = (Array.isArray(input.options) ? input.options : [])
      .slice(0, 8)
      .map((option, index) => ({
        id: cleanText(option?.id, `option-${index + 1}`, 80),
        label: requireText(
          option?.label,
          translate('fields.answerN', { index: index + 1 }),
          100
        ),
        emoji: cleanText(option?.emoji, ['👍', '🎉', '💛'][index] || '✨', 12)
      }));
    if (options.length < 2) {
      const error = new Error(translate('errors.pollOptionsRequired'));
      error.statusCode = 400;
      throw error;
    }
    return {
      ...existing,
      ...input,
      question: requireText(input.question, translate('fields.question'), 180),
      options,
      votes:
        existing?.votes &&
        typeof existing.votes === 'object' &&
        !Array.isArray(existing.votes)
          ? existing.votes
          : {},
      closesAt: cleanDate(input.closesAt, ''),
      createdByMemberId:
        existing?.createdByMemberId || req.session.memberId || '',
      createdAt: Number(existing?.createdAt || input.createdAt || now)
    };
  }
  if (type === 'encouragements') {
    const member = familyLifeMember(req, input.memberId, {
      childrenOnly: true
    });
    const sender = getMember(req.session.familyId, req.session.memberId);
    return {
      ...existing,
      ...input,
      memberId: member.id,
      message: requireText(input.message, translate('fields.encouragement'), 240),
      icon: cleanText(input.icon, '💛', 12),
      createdByMemberId:
        existing?.createdByMemberId || sender?.id || '',
      createdByName: existing?.createdByName || sender?.name || translate('labels.yourFamily'),
      createdAt: Number(existing?.createdAt || input.createdAt || now)
    };
  }
  if (type === 'familyMissions') {
    const memberIds = [
      ...new Set(
        (Array.isArray(input.memberIds) ? input.memberIds : [])
          .map(id => cleanText(id, '', 100))
          .filter(id => {
            const member = getMember(req.session.familyId, id);
            return (
              member &&
              !member.isManaged &&
              ['child', 'teen'].includes(member.role)
            );
          })
      )
    ];
    if (!memberIds.length) {
      const error = new Error(translate('errors.missionChildRequired'));
      error.statusCode = 400;
      throw error;
    }
    return {
      ...existing,
      ...input,
      title: requireText(input.title, translate('fields.familyMission'), 140),
      description: cleanText(input.description, '', 400),
      icon: cleanText(input.icon, '🤝', 12),
      memberIds,
      completedMemberIds: Array.isArray(existing?.completedMemberIds)
        ? existing.completedMemberIds.filter(id => memberIds.includes(id))
        : [],
      dueDate: cleanDate(input.dueDate, ''),
      createdAt: Number(existing?.createdAt || input.createdAt || now)
    };
  }
  if (type === 'familySettings') {
    return {
      ...existing,
      id: 'family-settings',
      quietHoursEnabled: Boolean(input.quietHoursEnabled),
      quietStart: cleanTime(input.quietStart, '20:00'),
      quietEnd: cleanTime(input.quietEnd, '07:00'),
      urgentDuringQuietHours: input.urgentDuringQuietHours !== false,
      mediaScheduleEnabled: Boolean(input.mediaScheduleEnabled),
      mediaStart: cleanTime(input.mediaStart, '15:00'),
      mediaEnd: cleanTime(input.mediaEnd, '19:30'),
      disabledModules: Object.hasOwn(input, 'disabledModules')
        ? [...new Set(
            (Array.isArray(input.disabledModules) ? input.disabledModules : [])
              .map(value => cleanText(value, '', 40))
              .filter(value => PROFILE_MODULE_IDS.has(value))
          )]
        : Array.isArray(existing?.disabledModules)
          ? existing.disabledModules
          : [],
      emergencyTitle: cleanText(
        input.emergencyTitle,
        translate('labels.emergencyTitle'),
        100
      ),
      emergencyContacts: (Array.isArray(input.emergencyContacts)
        ? input.emergencyContacts
        : []
      ).slice(0, 12).map(contact => ({
        id: cleanText(contact?.id, `contact-${randomUUID()}`, 100),
        name: requireText(contact?.name, translate('fields.contactName'), 80),
        phone: cleanText(contact?.phone, '', 40),
        note: cleanText(contact?.note, '', 160),
        icon: cleanText(contact?.icon, '☎️', 12)
      })),
      emergencyNotes: cleanText(input.emergencyNotes, '', 1200),
      updatedAt: now
    };
  }
  if (type === 'kidProfiles') {
    const member = familyLifeMember(req, input.memberId, {
      childrenOnly: true
    });
    return {
      ...existing,
      ...input,
      id: `kid-profile-${member.id}`,
      memberId: member.id,
      buddy: cleanText(input.buddy, '🦊', 12),
      heroTitle: cleanText(input.heroTitle, 'Familienheld', 40),
      updatedAt: now
    };
  }
  return input;
}

function minutesSinceMidnight(value) {
  const [hours, minutes] = String(value || '00:00').split(':').map(Number);
  return hours * 60 + minutes;
}

function isWithinTimeWindow(start, end, date = new Date()) {
  const current = date.getHours() * 60 + date.getMinutes();
  const from = minutesSinceMidnight(start);
  const until = minutesSinceMidnight(end);
  return from === until
    ? true
    : from < until
      ? current >= from && current < until
      : current >= from || current < until;
}

async function fetchBringClient(familyId) {
  const integration = getIntegration(familyId, 'bring');
  if (!integration) {
    const error = new Error(translate('errors.bringNotConnected'));
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
      text: requireText(input.text || input.message, translate('fields.message'), 2000),
      senderId: cleanText(input.senderId || 'agent', 'agent', 100),
      senderName: cleanText(
        input.senderName || translate('labels.familyAssistant'),
        translate('labels.familyAssistant'),
        100
      ),
      timestamp: Number(input.timestamp || Date.now()),
      isAgent: true
    };
  }
  if (type === 'tasks') {
    return {
      ...record,
      title: requireText(input.title || input.text, translate('fields.task'), 200),
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
  const homeAssistantSockets = new Map();
  const publishLiveEvent = (familyId, eventName, payload) => {
    const clients = liveClients.get(familyId);
    if (!clients?.size) return;
    const message = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
    clients.forEach(client => client.write(message));
  };
  const publishFamilyChange = (familyId, reason = 'update') => {
    publishLiveEvent(familyId, 'family-update', {
      version: getFamilyVersion(familyId),
      reason
    });
  };
  let dashboardCoverRefreshRunning = false;
  app.locals.runDashboardCoverRefresh = async () => {
    if (dashboardCoverRefreshRunning || process.env.NODE_ENV === 'test') {
      return { skipped: true, updated: 0, errors: [] };
    }
    dashboardCoverRefreshRunning = true;
    let updated = 0;
    let processed = 0;
    const errors = [];
    const changedFamilies = new Set();
    const refreshBefore = Date.now() - 7 * 24 * 60 * 60 * 1000;
    try {
      for (const family of listPublicFamilies().slice(0, 500)) {
        const links = listRecords(family.id, 'dashboardLinks')
          .filter(link =>
            !safeCoverUrl(link.coverUrl, link.kind) ||
            Number(link.coverCheckedAt || 0) < refreshBefore
          );
        for (const link of links) {
          if (processed >= 100) break;
          processed += 1;
          try {
            const normalized = sanitizeDashboardLink(
              { session: { familyId: family.id } },
              link
            );
            const enriched =
              await enrichDashboardLinkPreview(normalized);
            updateRecord(family.id, 'dashboardLinks', link.id, {
              coverUrl: enriched.coverUrl,
              coverCheckedAt: enriched.coverCheckedAt,
              providerTitle: enriched.providerTitle
            });
            updated += 1;
            changedFamilies.add(family.id);
          } catch (error) {
            errors.push({
              familyId: family.id,
              linkId: link.id,
              error: error.message
            });
          }
        }
        if (processed >= 100) break;
      }
      changedFamilies.forEach(familyId =>
        publishFamilyChange(familyId, 'dashboard-media-covers')
      );
      return { skipped: false, updated, errors };
    } finally {
      dashboardCoverRefreshRunning = false;
    }
  };
  const nextcloudSyncDebounces = new Map();
  const queueNextcloudEventSync = familyId => {
    if (nextcloudSyncDebounces.has(familyId)) {
      clearTimeout(nextcloudSyncDebounces.get(familyId));
    }
    const timer = setTimeout(async () => {
      nextcloudSyncDebounces.delete(familyId);
      const integration = getIntegration(familyId, 'nextcloud');
      if (
        !integration ||
        integration.config?.enabled === false ||
        integration.config?.eventSyncEnabled === false
      ) {
        return;
      }
      try {
        await performNextcloudSync(familyId, integration);
        publishFamilyChange(familyId, 'nextcloud-events');
      } catch (error) {
        console.warn(
          `Direkte Nextcloud-Synchronisation für Familie ${familyId} ist fehlgeschlagen:`,
          error.message
        );
      }
    }, 2000);
    timer.unref();
    nextcloudSyncDebounces.set(familyId, timer);
  };
  let bundledCloudProvisioning = false;
  app.locals.provisionBundledCloudFamily = async familyId => {
    const integration = getIntegration(familyId, 'nextcloud');
    if (
      !NEXTCLOUD_AUTO_PROVISION ||
      !bundledNextcloudAdmin() ||
      !bundledNextcloudPublicUrl() ||
      (!integration &&
        getAppMeta(nextcloudAutoProvisionMetaKey(familyId)) === 'true') ||
      (integration && !integration.config?.bundled)
    ) {
      return { skipped: true, familyId };
    }
    let repair = false;
    if (integration) {
      try {
        await inspectNextcloud(nextcloudConnection(integration));
        return {
          skipped: true,
          familyId,
          healthy: true
        };
      } catch (error) {
        if (error.remoteStatus !== 401) {
          throw error;
        }
        repair = true;
        console.warn(
          `Das verwaltete Family-Cloud-Konto fÃ¼r Familie ${familyId} fehlt oder besitzt ungÃ¼ltige Zugangsdaten und wird neu eingerichtet.`
        );
      }
    }
    const result = await provisionBundledNextcloudForFamily(familyId, {
      replace: repair
    });
    try {
      await performNextcloudSync(familyId, result.integration);
    } catch (error) {
      console.warn(
        `Erster Nextcloud-Abgleich für Familie ${familyId} ist fehlgeschlagen:`,
        error.message
      );
    }
    publishFamilyChange(familyId, 'nextcloud-provisioned');
    return {
      skipped: false,
      familyId,
      repaired: repair
    };
  };
  app.locals.runBundledCloudProvisioning = async () => {
    if (bundledCloudProvisioning) {
      return { skipped: true, created: 0, errors: [] };
    }
    bundledCloudProvisioning = true;
    let created = 0;
    const errors = [];
    try {
      for (const family of listPublicFamilies().slice(0, 500)) {
        try {
          const result =
            await app.locals.provisionBundledCloudFamily(family.id);
          if (!result.skipped) created += 1;
        } catch (error) {
          errors.push({
            familyId: family.id,
            message: error.message
          });
          console.warn(
            `Family Cloud für Familie ${family.id} konnte nicht automatisch eingerichtet werden:`,
            error.message
          );
        }
      }
      return { skipped: false, created, errors };
    } finally {
      bundledCloudProvisioning = false;
    }
  };
  const cloudWorkspaceForFamily = async familyId => {
    try {
      const workspace = nextcloudWorkspace(familyId);
      await ensureFamilyCloudStructure(familyId, workspace);
      return workspace;
    } catch (error) {
      if (Number(error.statusCode || error.status) !== 404) throw error;
      await app.locals.provisionBundledCloudFamily(familyId);
      const workspace = nextcloudWorkspace(familyId);
      await ensureFamilyCloudStructure(familyId, workspace);
      return workspace;
    }
  };
  const uploadChatAttachmentContent = async (
    familyId,
    {
      fileName,
      mimeType = 'application/octet-stream',
      content,
      chatTarget = 'group'
    }
  ) => {
    fileName = cleanText(fileName, '', 1000);
    if (!fileName) {
      const error = new Error(translate('errors.fileNameMissing'));
      error.statusCode = 400;
      throw error;
    }
    content = Buffer.isBuffer(content)
      ? content
      : Buffer.from(content || '');
    if (!content.length) {
      const error = new Error(translate('errors.fileEmpty'));
      error.statusCode = 400;
      throw error;
    }
    if (content.length > CHAT_ATTACHMENT_MAX_BYTES) {
      const error = new Error(translate('errors.chatAttachmentTooLarge'));
      error.statusCode = 413;
      throw error;
    }
    chatTarget = cleanText(chatTarget, 'group', 100) || 'group';
    if (chatTarget !== 'group') {
      const targetMember = getMember(familyId, chatTarget);
      if (
        !targetMember ||
        targetMember.role === 'pet' ||
        isManagedMember(targetMember)
      ) {
        const error = new Error(
          translate('errors.privateAttachmentTargetNotFound')
        );
        error.statusCode = 404;
        throw error;
      }
    }
    const workspace = await cloudWorkspaceForFamily(familyId);
    const relativeFolder = chatArchiveFolder(chatTarget);
    await ensureNextcloudFolder(
      workspace.connection,
      workspace.userId,
      `${workspace.folder}/${relativeFolder}`
    );
    const originalName = safeCloudName(fileName, 'Datei');
    mimeType = cleanText(mimeType, 'application/octet-stream', 200);
    const attachmentId = `attachment-${randomUUID()}`;
    const encrypted = chatTarget !== 'group';
    const protectedContent = encrypted
      ? encryptPrivateChatAttachment(familyId, attachmentId, content)
      : {
          content,
          encryptionIv: '',
          encryptionTag: ''
        };
    const uploaded = await uploadNextcloudUserFile(
      workspace.connection,
      workspace.userId,
      workspace.folder,
      relativeFolder,
      chatArchiveFileName(originalName, new Date(), encrypted),
      protectedContent.content,
      encrypted ? 'application/octet-stream' : mimeType
    );
    const attachment = {
      id: attachmentId,
      name: originalName,
      cloudPath: uploaded.path,
      mimeType,
      kind: chatAttachmentKind(mimeType, originalName),
      size: content.length,
      uploadedAt: Date.now(),
      chatTarget,
      encrypted,
      encryptionIv: protectedContent.encryptionIv,
      encryptionTag: protectedContent.encryptionTag
    };
    return {
      ...attachment,
      claim: chatAttachmentClaim(familyId, attachment)
    };
  };
  const uploadChatAttachment = async (familyId, req) => {
    let fileName = cleanText(req.headers['x-lx-file-name'], '', 1000);
    try {
      fileName = decodeURIComponent(fileName);
    } catch {
      // Ein bereits dekodierter Dateiname bleibt verwendbar.
    }
    return uploadChatAttachmentContent(familyId, {
      fileName,
      mimeType: req.headers['x-lx-file-type'],
      content: req.body,
      chatTarget: req.headers['x-lx-chat-target']
    });
  };
  const archiveLegacyChatPhoto = async (familyId, record) => {
    if (!record?.photo) return record;
    const target = cleanText(record.target, 'group', 100) || 'group';
    const existingAttachments = Array.isArray(record.attachments)
      ? record.attachments
      : [];
    if (existingAttachments.length >= CHAT_ATTACHMENT_MAX_COUNT) {
      const error = new Error(
        translate('errors.attachmentLimit', {
        count: CHAT_ATTACHMENT_MAX_COUNT
      })
      );
      error.statusCode = 400;
      throw error;
    }
    const legacyPhoto = decodeLegacyChatPhoto(record.photo);
    const uploaded = await uploadChatAttachmentContent(familyId, {
      ...legacyPhoto,
      chatTarget: target
    });
    const [archivedPhoto] = sanitizeChatAttachments(
      [uploaded],
      familyId,
      target
    );
    return {
      ...record,
      photo: '',
      attachments: [...existingAttachments, archivedPhoto]
    };
  };
  let legacyChatPhotoMigrationRunning = false;
  app.locals.migrateLegacyChatPhotosForFamily = async familyId => {
    const messages = listRecords(familyId, 'chatMessages')
      .filter(message => Boolean(message.photo))
      .slice(0, 500);
    let migrated = 0;
    const errors = [];
    for (const message of messages) {
      try {
        const archived = await archiveLegacyChatPhoto(familyId, message);
        updateRecord(familyId, 'chatMessages', message.id, {
          photo: '',
          attachments: archived.attachments,
          cloudPhotoMigratedAt: Date.now()
        });
        migrated += 1;
      } catch (error) {
        errors.push({ messageId: message.id, error: error.message });
        console.warn(
          `Chatfoto ${message.id} der Familie ${familyId} konnte nicht in die Cloud verschoben werden:`,
          error.message
        );
      }
    }
    if (migrated) publishFamilyChange(familyId, 'chat-photo-migration');
    return { familyId, migrated, errors };
  };
  app.locals.runLegacyChatPhotoMigration = async () => {
    if (legacyChatPhotoMigrationRunning) {
      return { skipped: true, migrated: 0, errors: [] };
    }
    legacyChatPhotoMigrationRunning = true;
    let migrated = 0;
    const errors = [];
    try {
      for (const family of listPublicFamilies().slice(0, 500)) {
        const integration = getIntegration(family.id, 'nextcloud');
        if (!integration || integration.config?.enabled === false) continue;
        const result =
          await app.locals.migrateLegacyChatPhotosForFamily(family.id);
        migrated += result.migrated;
        errors.push(...result.errors);
      }
      return { skipped: false, migrated, errors };
    } finally {
      legacyChatPhotoMigrationRunning = false;
    }
  };
  const sendChatAttachmentContent = async (
    res,
    familyId,
    message,
    attachmentId,
    inlineRequested
  ) => {
    const attachment = chatAttachmentById(message, attachmentId);
    if (!attachment) {
      const error = new Error(translate('errors.chatAttachmentNotFound'));
      error.statusCode = 404;
      throw error;
    }
    const workspace = await cloudWorkspaceForFamily(familyId);
    const file = await downloadNextcloudFile(
      workspace.connection,
      workspace.userId,
      workspace.folder,
      attachment.cloudPath
    );
    const content = attachment.encrypted
      ? decryptPrivateChatAttachment(familyId, attachment, file.content)
      : file.content;
    const inline = inlineRequested && canInlineChatAttachment(attachment);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader(
      'Content-Type',
      cleanText(attachment.mimeType, file.contentType, 200)
    );
    res.setHeader('Content-Length', String(content.length));
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${
        encodeURIComponent(attachment.name)
      }`
    );
    if (file.etag) res.setHeader('ETag', file.etag);
    res.end(content);
  };
  let eventReminderSweepRunning = false;
  app.locals.runEventReminderSweep = async (now = Date.now()) => {
    if (eventReminderSweepRunning) {
      return { skipped: true, delivered: 0 };
    }
    eventReminderSweepRunning = true;
    let delivered = 0;
    try {
      for (const family of listPublicFamilies()) {
        const resources = getBootstrap(family.id).resources;
        const reminderCandidates = [
          ...(resources.events || []).map(event => ({
            event,
            eventId: String(event.sharedEventId || event.id || ''),
            recipientMemberIds: eventReminderRecipientMemberIds(
              family.id,
              event
            ),
            notificationCopy: () => ({
              title: `⏰ ${cleanText(
                event.title,
                translate('push.eventReminderFallbackTitle'),
                180
              )}`,
              body: eventReminderMessage(event, now, {
                t: translate,
                locale: APP_LOCALE
              }),
              privateTitle: translate('push.eventReminderFallbackTitle'),
              privateBody: translate('eventReminder.fallback')
            }),
            url: '/?view=calendar',
            tagPrefix: 'event-reminder',
            publishReason: 'event-reminder'
          })),
          ...(resources.trashEvents || []).map(record => {
            const event = trashReminderEvent(record);
            return {
              event,
              eventId: `trash-${String(record.id || '')}`,
              recipientMemberIds: signedInMemberIds(family.id),
              notificationCopy: reminderMinutes => ({
                ...trashReminderCopy(record, reminderMinutes, { t: translate }),
                privateTitle: translate('push.trashReminderPrivateTitle'),
                privateBody: translate('push.trashReminderPrivateBody')
              }),
              url: '/?view=trash',
              tagPrefix: 'trash-reminder',
              publishReason: 'trash-reminder'
            };
          })
        ];
        for (const candidate of reminderCandidates) {
          const {
            event,
            eventId,
            recipientMemberIds,
            notificationCopy,
            publishReason,
            tagPrefix,
            url
          } = candidate;
          if (!normalizeEventReminders(event.reminders).length) continue;
          const startKey = eventStartKey(event);
          if (!eventId) continue;
          try {
            const previousDeliveries = listEventReminderDeliveries(
              family.id,
              eventId,
              startKey
            );
            const due = selectDueEventReminder(
              event,
              previousDeliveries,
              now
            );
            if (!due) continue;
            const copy = notificationCopy(due.reminderMinutes);
            const tag = [
              tagPrefix,
              eventId,
              due.startKey,
              due.reminderMinutes
            ].join('-');
            const notifications = queueWebPushEvent(family.id, 'events', {
              recipientMemberIds,
              title: copy.title,
              body: copy.body,
              privateTitle: copy.privateTitle,
              privateBody: copy.privateBody,
              url,
              tag,
              priority: due.reminderMinutes <= 10 ? 'high' : 'normal',
              allowDuringQuietHours: due.reminderMinutes <= 10,
              ttl: Math.max(300, Math.min(86_400, due.reminderMinutes * 60))
            });
            queueGotifyNotification(family.id, 'events', {
              title: copy.title,
              message: copy.body,
              priority: due.reminderMinutes <= 10 ? 8 : 4
            });
            markEventReminderDeliveries(
              family.id,
              eventId,
              due.startKey,
              due.consumedReminderMinutes,
              now
            );
            delivered += 1;
            if (notifications.length) {
              publishFamilyChange(family.id, publishReason);
            }
          } catch (error) {
            console.error(
              `Terminerinnerung ${eventId} konnte nicht verarbeitet werden:`,
              error.message
            );
          }
        }
      }
      pruneEventReminderDeliveries();
      return { skipped: false, delivered };
    } finally {
      eventReminderSweepRunning = false;
    }
  };
  let nextcloudSweepRunning = false;
  app.locals.runNextcloudSweep = async (now = new Date()) => {
    if (nextcloudSweepRunning) return { skipped: true };
    nextcloudSweepRunning = true;
    try {
      const integrations = listIntegrationsByProvider('nextcloud')
        .slice(0, 100);
      for (const integration of integrations) {
        if (integration.config?.enabled === false) continue;
        if (integration.config?.eventSyncEnabled !== false) {
          try {
            const stats = await performNextcloudSync(
              integration.familyId,
              integration
            );
            if (
              stats &&
              Object.values(stats).some(value => Number(value) > 0)
            ) {
              publishFamilyChange(
                integration.familyId,
                'nextcloud-events'
              );
            }
          } catch (error) {
            console.warn(
              `Nextcloud-Kalender für Familie ${integration.familyId} konnte nicht synchronisiert werden:`,
              error.message
            );
          }
        }
        const refreshed =
          getIntegration(integration.familyId, 'nextcloud') ||
          integration;
        if (nextcloudBackupIsDue(refreshed, now)) {
          try {
            await performNextcloudBackup(
              integration.familyId,
              refreshed
            );
            publishFamilyChange(
              integration.familyId,
              'nextcloud-backup'
            );
          } catch (error) {
            console.warn(
              `Nextcloud-Sicherung für Familie ${integration.familyId} ist fehlgeschlagen:`,
              error.message
            );
          }
        }
      }
      return { skipped: false };
    } finally {
      nextcloudSweepRunning = false;
    }
  };
  const stopHomeAssistantSocket = familyId => {
    const current = homeAssistantSockets.get(familyId);
    if (!current) return;
    current.stopped = true;
    if (current.reconnectTimer) clearTimeout(current.reconnectTimer);
    try {
      current.socket?.close();
    } catch {
      // The connection is already closed.
    }
    homeAssistantSockets.delete(familyId);
  };
  const ensureHomeAssistantSocket = familyId => {
    const integration = getIntegration(familyId, 'home-assistant');
    if (
      !integration ||
      integration.config?.enabled === false ||
      typeof globalThis.WebSocket !== 'function'
    ) {
      stopHomeAssistantSocket(familyId);
      return;
    }
    const current = homeAssistantSockets.get(familyId);
    if (
      current &&
      ['connecting', 'open'].includes(current.status)
    ) {
      return;
    }
    if (current?.reconnectTimer) clearTimeout(current.reconnectTimer);

    const baseUrl = new URL(integration.config.baseUrl);
    baseUrl.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    baseUrl.pathname = `${baseUrl.pathname.replace(/\/+$/, '')}/api/websocket`;
    baseUrl.search = '';
    baseUrl.hash = '';
    const connection = {
      socket: null,
      status: 'connecting',
      reconnectTimer: null,
      stopped: false
    };
    homeAssistantSockets.set(familyId, connection);
    let socket;
    try {
      socket = new globalThis.WebSocket(baseUrl.toString());
      connection.socket = socket;
    } catch {
      connection.status = 'closed';
    }
    const scheduleReconnect = () => {
      if (
        connection.stopped ||
        homeAssistantSockets.get(familyId) !== connection
      ) {
        return;
      }
      connection.status = 'closed';
      connection.reconnectTimer = setTimeout(() => {
        homeAssistantSockets.delete(familyId);
        ensureHomeAssistantSocket(familyId);
      }, 12_000);
      connection.reconnectTimer.unref?.();
    };
    if (!socket) {
      scheduleReconnect();
      return;
    }
    socket.addEventListener('open', () => {
      connection.status = 'open';
    });
    socket.addEventListener('message', event => {
      let message;
      try {
        message = JSON.parse(String(event.data || '{}'));
      } catch {
        return;
      }
      if (message.type === 'auth_required') {
        try {
          const secret = decryptJson(integration.secretEncrypted);
          socket.send(JSON.stringify({
            type: 'auth',
            access_token: secret.token
          }));
        } catch {
          stopHomeAssistantSocket(familyId);
        }
        return;
      }
      if (message.type === 'auth_ok') {
        socket.send(JSON.stringify({
          id: 1,
          type: 'subscribe_events',
          event_type: 'state_changed'
        }));
        return;
      }
      if (
        message.type === 'event' &&
        message.event?.event_type === 'state_changed'
      ) {
        const entityId = message.event?.data?.entity_id;
        const selected = normalizeHomeAssistantEntities(
          getIntegration(familyId, 'home-assistant')
            ?.config?.selectedEntities
        );
        if (selected.some(entity => entity.entityId === entityId)) {
          publishLiveEvent(familyId, 'home-assistant-update', {
            updatedAt: Date.now()
          });
        }
      }
    });
    socket.addEventListener('close', scheduleReconnect);
    socket.addEventListener('error', () => {
      try {
        socket.close();
      } catch {
        scheduleReconnect();
      }
    });
  };
  app.locals.stopHomeAssistantSockets = () => {
    [...homeAssistantSockets.keys()].forEach(stopHomeAssistantSocket);
  };
  app.locals.stopNextcloudSyncDebounces = () => {
    nextcloudSyncDebounces.forEach(timer => clearTimeout(timer));
    nextcloudSyncDebounces.clear();
  };
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const corsAllowed = isAllowedCorsOrigin(req, origin);
    if (origin && corsAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Session-Token, X-Family-Id, X-LX-Client, X-LX-File-Name, X-LX-File-Type, X-LX-Chat-Target'
      );
      res.append('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(corsAllowed ? 204 : 403);
    }
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
        "default-src 'self'; img-src 'self' data: blob: https:; frame-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self' data:"
      );
    }
    next();
  });
  app.use(express.json({ limit: JSON_LIMIT }));
  app.use(sessionMiddleware);
  app.use(protectReadOnlyDemo);

  app.get('/api/config', (_req, res) => {
    res.json({
      success: true,
      language: APP_LANGUAGE,
      supportedLanguages: SUPPORTED_APP_LANGUAGES
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      success: true,
      status: 'ok',
      version: APP_VERSION,
      database: 'sqlite',
      timestamp: new Date().toISOString()
    });
  });

  function findApkCandidates() {
    const candidates = [
      path.join(process.cwd(), 'data/apk/latest.apk'),
      path.join(process.cwd(), 'data/apk/LX-Family-Planner.apk'),
      path.join(process.cwd(), 'public/apk/LX-Family-Planner.apk'),
      path.join(process.cwd(), 'public/apk/latest.apk'),
      path.join(process.cwd(), 'dist/apk/LX-Family-Planner.apk'),
      path.join(process.cwd(), 'dist/apk/latest.apk'),
      path.join(process.cwd(), 'LX-Family-Planner.apk'),
      path.join(process.cwd(), 'dist/LX-Family-Planner.apk')
    ];
    return [...new Set(candidates)].filter(file => fs.existsSync(file));
  }

  function readApkMetadata(apkFile) {
    const candidates = apkFile
      ? [path.join(path.dirname(apkFile), 'version.json')]
      : [];
    for (const file of [...new Set(candidates)]) {
      try {
        const metadata = JSON.parse(
          fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')
        );
        return {
          versionName: cleanText(
            metadata.versionName,
            APP_VERSION,
            40
          ),
          versionCode: Math.max(0, Number(metadata.versionCode) || 0),
          buildKind:
            metadata.buildKind === 'release' ? 'release' : 'debug',
          builtAt: cleanText(metadata.builtAt, '', 80),
          sha256: /^[a-f0-9]{64}$/i.test(metadata.sha256 || '')
            ? metadata.sha256.toLowerCase()
            : ''
        };
      } catch {
        // Try the next local metadata file.
      }
    }
    return {
      versionName: APP_VERSION,
      versionCode: 0,
      buildKind: 'debug',
      builtAt: '',
      sha256: ''
    };
  }

  function availableApkRelease() {
    const releases = findApkCandidates()
      .map(file => ({
        file,
        metadata: readApkMetadata(file),
        stats: fs.statSync(file)
      }))
      .filter(
        release =>
          !IS_PRODUCTION || release.metadata.buildKind === 'release'
      )
      .sort((left, right) => {
        const byVersion =
          right.metadata.versionCode - left.metadata.versionCode;
        if (byVersion !== 0) return byVersion;
        return right.stats.mtimeMs - left.stats.mtimeMs;
      });
    return releases[0] || null;
  }

  app.get('/api/app/version', (req, res) => {
    const release = availableApkRelease();
    const metadata = release?.metadata || {
      versionName: APP_VERSION,
      versionCode: 0,
      buildKind: '',
      builtAt: '',
      sha256: ''
    };
    const requestOrigin = `${req.protocol}://${req.get('host')}`;
    const publicAppOrigin = PUBLIC_APP_URL || requestOrigin;
    let publicApkUrl = null;
    if (release) {
      try {
        publicApkUrl = new URL(
          '/apk/latest.apk',
          publicAppOrigin
        ).href;
      } catch {
        publicApkUrl = null;
      }
    }

    res.json({
      success: true,
      versionName: metadata.versionName,
      versionCode: metadata.versionCode,
      apkUrl: release ? '/apk/latest.apk' : null,
      publicApkUrl,
      buildKind: release ? metadata.buildKind : null,
      fileSizeBytes: release ? release.stats.size : null,
      releasedAt:
        metadata.builtAt ||
        (release
          ? release.stats.mtime.toISOString()
          : null),
      sha256: metadata.sha256 || null
    });
  });

  app.get('/api/public/families', (_req, res) => {
    const demoFamily = process.env.DEMO_FAMILY_ID
      ? getFamily(process.env.DEMO_FAMILY_ID)
      : null;
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      success: true,
      directoryEnabled: PUBLIC_FAMILY_DIRECTORY,
      families: PUBLIC_FAMILY_DIRECTORY ? listPublicFamilies() : [],
      demo: demoFamily
        ? {
            familyName: demoFamily.familyName,
            familyAvatar: demoFamily.familyAvatar,
            badge: demoFamily.badge
          }
        : null,
      registration: publicRegistrationStatus()
    });
  });

  app.post('/api/public/register', authRateLimit, (req, res) => {
    const input = ensureObject(req.body);
    const registration = publicRegistrationStatus();
    if (!registration.allowed) {
      return res.status(403).json({
        success: false,
        error: translate('errors.registrationClosed')
      });
    }
    if (
      registration.requiresInvite &&
      !constantTimeTextMatch(input.inviteCode, REGISTRATION_INVITE_CODE)
    ) {
      return res.status(403).json({
        success: false,
        error: translate('errors.inviteCodeInvalid')
      });
    }
    const familyName = requireText(input.familyName, translate('fields.familyName'), 100);
    const password = requireText(input.password, translate('fields.password'), 100);
    if (password.length < 10) {
      return res.status(400).json({
        success: false,
        error: translate('errors.familyPasswordTooShort')
      });
    }
    const members = Array.isArray(input.members) ? input.members : [];
    if (members.length === 0) {
      return res.status(400).json({
        success: false,
        error: translate('errors.membersRequired')
      });
    }
    const normalizedMembers = members.slice(0, 20).map(normalizeMemberInput);
    if (!normalizedMembers.some(member => !member.isManaged)) {
      return res.status(400).json({
        success: false,
        error: translate('errors.loginProfileRequired')
      });
    }
    const result = createFamily({
      familyName,
      familyAvatar: cleanText(input.familyAvatar, '', 1_200_000),
      badge: cleanText(input.badge, 'Unsere Familie', 60),
      password,
      members: normalizedMembers
    });
    const initialMember =
      result.members.find(isAdultMember) ||
      result.members.find(member => !member.isManaged);
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
      session: publicSessionPayload(session),
      ...nativeSessionTokenPayload(req, sessionToken)
    });
    const cloudProvisioning = setTimeout(() => {
      void app.locals.provisionBundledCloudFamily(result.family.id)
        .catch(error => {
          console.warn(
            `Family Cloud für neue Familie ${result.family.id} konnte nicht eingerichtet werden:`,
            error.message
          );
        });
    }, 250);
    cloudProvisioning.unref();
  });

  app.post('/api/auth/family', authRateLimit, (req, res) => {
    const input = ensureObject(req.body);
    const familyReference = requireText(
      input.familyId || input.familyName,
      translate('fields.family'),
      100
    );
    const password = requireText(input.password, translate('fields.password'), 100);
    const familyRow = findFamilyAuthCandidates(familyReference).find(
      candidate => verifySecret(password, candidate.password_hash)
    );
    if (!familyRow) {
      return res.status(401).json({
        success: false,
        error: translate('errors.familyOrPasswordIncorrect')
      });
    }
    const familyId = familyRow.id;
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
      session: publicSessionPayload(session),
      ...nativeSessionTokenPayload(req, sessionToken)
    });
  });

  app.post('/api/auth/member', requireAuth, (req, res) => {
    const input = ensureObject(req.body);
    const memberId = requireText(input.memberId, translate('fields.profile'), 100);
    const memberRow = getMemberAuthRow(req.session.familyId, memberId);
    if (!memberRow) {
      return res.status(404).json({
        success: false,
        error: translate('errors.profileNotFound')
      });
    }
    if (isManagedMember(memberRow)) {
      return res.status(403).json({
        success: false,
        error:
          translate('errors.managedProfileNoLogin')
      });
    }
    const currentMember = req.session.memberId
      ? getMember(req.session.familyId, req.session.memberId)
      : null;
    const targetIsAdult = isAdultMember(memberRow);
    const currentIsAdult = isAdultMember(currentMember);
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
          error: translate('errors.familyPasswordRequiredForAdult'),
          requiresFamilyPassword: true
        });
      }
    }
    if (memberRow.pin_hash && !verifySecret(cleanText(input.pin, '', 12), memberRow.pin_hash)) {
      return res.status(401).json({
        success: false,
        error: translate('errors.pinIncorrect')
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
    ensureHomeAssistantSocket(req.session.familyId);
    const member = req.session.memberId
      ? getMember(req.session.familyId, req.session.memberId)
      : null;
    const releaseNotes =
      member &&
      isAdultMember(member) &&
      member.lastSeenReleaseVersion !== APP_VERSION
        ? releaseNotesForVersion(APP_VERSION)
        : null;
    res.json({
      success: true,
      ...bootstrapForSession(req.session),
      activeMemberId: req.session.memberId,
      appVersion: APP_VERSION,
      readOnlyDemo: isReadOnlyDemoFamily(req.session.familyId),
      releaseNotes,
      nativePushServer: publicFirebasePushStatus(),
      integrations: integrationStatus(req.session.familyId, member)
    });
  });

  app.post('/api/release-notes/acknowledge', requireAuth, (req, res) => {
    const member = req.session.memberId
      ? getMember(req.session.familyId, req.session.memberId)
      : null;
    if (!member || !isAdultMember(member)) {
      return res.status(403).json({
        success: false,
        error: translate('errors.releaseNotesAdultsOnly')
      });
    }
    const updatedMember = acknowledgeMemberReleaseNotes(
      req.session.familyId,
      member.id,
      APP_VERSION
    );
    res.json({
      success: true,
      version: APP_VERSION,
      member: updatedMember
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

  app.get('/api/notifications', requireAuth, (req, res) => {
    const member = req.session.memberId
      ? getMember(req.session.familyId, req.session.memberId)
      : null;
    if (!member || member.role === 'pet') {
      return res.json({
        success: true,
        notifications: [],
        unreadCount: 0
      });
    }
    res.json({
      success: true,
      notifications: listInboxNotifications(
        req.session.familyId,
        member.id
      ),
      unreadCount: countUnreadInboxNotifications(
        req.session.familyId,
        member.id
      )
    });
  });

  app.patch(
    '/api/notifications/:notificationId',
    requireAuth,
    (req, res) => {
      if (!req.session.memberId) {
        return res.status(403).json({
          success: false,
          error: translate('errors.profileRequired')
        });
      }
      const notification = markInboxNotificationRead(
        req.session.familyId,
        req.session.memberId,
        req.params.notificationId,
        req.body?.read !== false
      );
      if (!notification) {
        return res.status(404).json({
          success: false,
          error: translate('errors.notificationNotFound')
        });
      }
      publishFamilyChange(req.session.familyId, 'notifications');
      res.json({
        success: true,
        notification,
        unreadCount: countUnreadInboxNotifications(
          req.session.familyId,
          req.session.memberId
        ),
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.post('/api/notifications/read-all', requireAuth, (req, res) => {
    if (!req.session.memberId) {
      return res.status(403).json({
        success: false,
        error: translate('errors.profileRequired')
      });
    }
    const changed = markAllInboxNotificationsRead(
      req.session.familyId,
      req.session.memberId
    );
    if (changed) {
      publishFamilyChange(req.session.familyId, 'notifications');
    }
    res.json({
      success: true,
      changed,
      unreadCount: 0,
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.post('/api/problem-reports', requireAuth, (req, res) => {
    if (!req.session.memberId) {
      return res.status(403).json({
        success: false,
        error: translate('errors.profileRequired')
      });
    }
    const category = cleanText(req.body?.category, 'problem', 40);
    const report = createProblemReport(
      req.session.familyId,
      req.session.memberId,
      {
        category: ['problem', 'idea', 'content'].includes(category)
          ? category
          : 'problem',
        title: requireText(req.body?.title, translate('fields.shortTitle'), 120),
        description: requireText(
          req.body?.description,
          translate('fields.description'),
          4000
        ),
        page: cleanText(req.body?.page, '', 300),
        appVersion: APP_VERSION,
        clientInfo: cleanText(req.body?.clientInfo, '', 500)
      }
    );
    publishFamilyChange(req.session.familyId, 'problem-reports');
    const reporter = getMember(
      req.session.familyId,
      req.session.memberId
    );
    queueNotificationChannels(
      req.session.familyId,
      'problemReports',
      {
        recipientMemberIds: adultMemberIds(req.session.familyId),
        excludeMemberIds: [req.session.memberId],
        title: translate('push.problemReportNewTitle'),
        body: `${reporter?.name || translate('labels.someone')}: ${report.title}`,
        privateTitle: translate('push.problemReportNewTitle'),
        privateBody:
          translate('push.problemReportNewPrivateBody'),
        url: '/?view=admin',
        tag: `problem-new-${report.id}`,
        priority: 'high'
      },
      {
        title: translate('push.problemReportNewTitle'),
        message: `${reporter?.name || translate('labels.someone')}: ${report.title}`,
        priority: 6
      }
    );
    res.status(201).json({ success: true, report });
  });

  app.get(
    '/api/problem-reports',
    requireAuth,
    requireAdult,
    (req, res) => {
      res.json({
        success: true,
        reports: listProblemReports(req.session.familyId)
      });
    }
  );

  app.patch(
    '/api/problem-reports/:reportId',
    requireAuth,
    requireAdult,
    (req, res) => {
      const status = cleanText(req.body?.status, '', 20);
      if (!['open', 'resolved'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: translate('errors.reportStatusInvalid')
        });
      }
      const report = updateProblemReportStatus(
        req.session.familyId,
        req.params.reportId,
        status
      );
      if (!report) {
        return res.status(404).json({
          success: false,
          error: translate('errors.problemReportNotFound')
        });
      }
      publishFamilyChange(req.session.familyId, 'problem-reports');
      const resolved = status === 'resolved';
      queueNotificationChannels(
        req.session.familyId,
        'problemReports',
        {
          recipientMemberIds: [report.memberId].filter(Boolean),
          excludeMemberIds: [req.session.memberId],
          title: resolved
            ? translate('push.problemResolvedTitle')
            : translate('push.problemReopenedTitle'),
          body: report.title,
          privateTitle: translate('push.problemFeedbackPrivateTitle'),
          privateBody:
            translate('push.problemFeedbackPrivateBody'),
          url: '/?view=dashboard',
          tag: `problem-${status}-${report.id}`
        },
        {
          title: resolved
            ? translate('push.problemResolvedGotifyTitle')
            : translate('push.problemReopenedGotifyTitle'),
          message: report.title,
          priority: 3
        }
      );
      res.json({ success: true, report });
    }
  );

  app.get('/api/calendar/subscriptions', requireAuth, (req, res) => {
    res.json({
      success: true,
      subscriptions: listCalendarSubscriptions(req.session.familyId),
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.post(
    '/api/calendar/subscriptions',
    requireAuth,
    requireAdult,
    async (req, res) => {
      const input = ensureObject(req.body);
      const url = normalizeCalendarFeedUrl(input.url);
      const memberId = cleanText(input.memberId, 'all', 100) || 'all';
      if (
        memberId !== 'all' &&
        !getMember(req.session.familyId, memberId)
      ) {
        return res.status(400).json({
          success: false,
          error: translate('errors.selectedProfileNotFound')
        });
      }
      const household = ['familie', 'grosseltern'].includes(input.household)
        ? input.household
        : 'familie';
      const color = /^#[0-9a-f]{6}$/i.test(String(input.color || ''))
        ? String(input.color)
        : '#2563eb';
      const created = createCalendarSubscription(req.session.familyId, {
        name: requireText(input.name, translate('fields.calendarName'), 100),
        host: url.hostname,
        secretEncrypted: encryptJson({ url: url.toString() }),
        color,
        memberId,
        household,
        enabled: true
      });
      let syncResult = null;
      let warning = '';
      try {
        syncResult = await syncCalendarSubscription(
          getCalendarSubscription(
            req.session.familyId,
            created.id,
            { includeSecret: true }
          )
        );
      } catch (error) {
        warning = error.message;
      }
      publishFamilyChange(req.session.familyId, 'calendar-subscriptions');
      res.status(201).json({
        success: true,
        subscription:
          syncResult?.subscription ||
          getCalendarSubscription(req.session.familyId, created.id),
        records: syncResult?.records || [],
        warning,
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.patch(
    '/api/calendar/subscriptions/:subscriptionId',
    requireAuth,
    requireAdult,
    async (req, res) => {
      const existing = getCalendarSubscription(
        req.session.familyId,
        req.params.subscriptionId,
        { includeSecret: true }
      );
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: translate('errors.calendarSourceNotFound')
        });
      }
      const input = ensureObject(req.body);
      const memberId = Object.hasOwn(input, 'memberId')
        ? cleanText(input.memberId, 'all', 100) || 'all'
        : existing.memberId;
      if (
        memberId !== 'all' &&
        !getMember(req.session.familyId, memberId)
      ) {
        return res.status(400).json({
          success: false,
          error: translate('errors.selectedProfileNotFound')
        });
      }
      const nextUrl = Object.hasOwn(input, 'url')
        ? normalizeCalendarFeedUrl(input.url)
        : null;
      const updated = updateCalendarSubscription(
        req.session.familyId,
        existing.id,
        {
          name: Object.hasOwn(input, 'name')
            ? requireText(input.name, translate('fields.calendarName'), 100)
            : existing.name,
          host: nextUrl?.hostname || existing.host,
          secretEncrypted: nextUrl
            ? encryptJson({ url: nextUrl.toString() })
            : existing.secretEncrypted,
          color:
            Object.hasOwn(input, 'color') &&
            /^#[0-9a-f]{6}$/i.test(String(input.color))
              ? String(input.color)
              : existing.color,
          memberId,
          household: Object.hasOwn(input, 'household') &&
            ['familie', 'grosseltern'].includes(input.household)
              ? input.household
              : existing.household,
          enabled: Object.hasOwn(input, 'enabled')
            ? Boolean(input.enabled)
            : existing.enabled
        }
      );
      let syncResult = null;
      let warning = '';
      if (updated.enabled) {
        try {
          syncResult = await syncCalendarSubscription(
            getCalendarSubscription(
              req.session.familyId,
              updated.id,
              { includeSecret: true }
            )
          );
        } catch (error) {
          warning = error.message;
        }
      } else {
        replaceRecordsBySource(
          req.session.familyId,
          'events',
          calendarSourceKey(updated.id),
          []
        );
      }
      publishFamilyChange(req.session.familyId, 'calendar-subscriptions');
      res.json({
        success: true,
        subscription:
          syncResult?.subscription ||
          getCalendarSubscription(req.session.familyId, updated.id),
        records: syncResult?.records || [],
        warning,
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.post(
    '/api/calendar/subscriptions/:subscriptionId/sync',
    requireAuth,
    requireAdult,
    async (req, res) => {
      const subscription = getCalendarSubscription(
        req.session.familyId,
        req.params.subscriptionId,
        { includeSecret: true }
      );
      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: translate('errors.calendarSourceNotFound')
        });
      }
      const result = await syncCalendarSubscription(subscription);
      publishFamilyChange(req.session.familyId, 'calendar-subscriptions');
      res.json({
        success: true,
        ...result,
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.post(
    '/api/calendar/subscriptions/sync-all',
    requireAuth,
    requireAdult,
    async (req, res) => {
      const subscriptions = listCalendarSubscriptions(req.session.familyId)
        .filter(subscription => subscription.enabled);
      const results = [];
      for (const subscription of subscriptions) {
        try {
          const synced = await syncCalendarSubscription(
            getCalendarSubscription(
              req.session.familyId,
              subscription.id,
              { includeSecret: true }
            )
          );
          results.push({
            id: subscription.id,
            success: true,
            eventCount: synced.records.length
          });
        } catch (error) {
          results.push({
            id: subscription.id,
            success: false,
            error: error.message
          });
        }
      }
      publishFamilyChange(req.session.familyId, 'calendar-subscriptions');
      res.json({
        success: true,
        results,
        subscriptions: listCalendarSubscriptions(req.session.familyId),
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.delete(
    '/api/calendar/subscriptions/:subscriptionId',
    requireAuth,
    requireAdult,
    (req, res) => {
      const subscription = getCalendarSubscription(
        req.session.familyId,
        req.params.subscriptionId
      );
      if (!subscription) {
        return res.status(404).json({
          success: false,
          error: translate('errors.calendarSourceNotFound')
        });
      }
      replaceRecordsBySource(
        req.session.familyId,
        'events',
        calendarSourceKey(subscription.id),
        []
      );
      deleteCalendarSubscription(req.session.familyId, subscription.id);
      publishFamilyChange(req.session.familyId, 'calendar-subscriptions');
      res.json({
        success: true,
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

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
      translate('fields.relatedFamily'),
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
        error: translate('errors.relationTypeUnsupported')
      });
    }
    const relationship = createFamilyRelationshipRequest(
      req.session.familyId,
      targetFamilyId,
      relationType,
      req.session.memberId
    );
    const sourceFamily = getFamily(req.session.familyId);
    publishFamilyChange(req.session.familyId, 'family-relationships');
    publishFamilyChange(targetFamilyId, 'family-relationships');
    queueNotificationChannels(
      targetFamilyId,
      'familyConnections',
      {
        recipientMemberIds: adultMemberIds(targetFamilyId),
        title: translate('push.familyRequestTitle'),
        body: translate('push.familyRequestBody', {
          family: sourceFamily.familyName
        }),
        privateBody:
          translate('push.familyRequestPrivateBody'),
        url: '/?view=admin',
        tag: `family-connection-request-${relationship.id}`
      },
      {
        title: translate('push.familyRequestTitle'),
        message: translate('push.familyRequestBody', {
          family: sourceFamily.familyName
        }),
        priority: 5
      }
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
          error: translate('errors.respondAcceptOrDecline')
        });
      }
      const pendingRelationship = getFamilyRelationship(
        req.session.familyId,
        req.params.relationshipId
      );
      const relationship = respondFamilyRelationship(
        req.session.familyId,
        req.params.relationshipId,
        status === 'accepted',
        req.session.memberId
      );
      if (!relationship) {
        return res.status(404).json({
          success: false,
          error: translate('errors.pendingFamilyRequestNotFound')
        });
      }
      const requesterFamilyId =
        pendingRelationship?.otherFamily?.id;
      const responderFamily = getFamily(req.session.familyId);
      if (requesterFamilyId) {
        publishFamilyChange(
          requesterFamilyId,
          'family-relationships'
        );
        queueNotificationChannels(
          requesterFamilyId,
          'familyConnections',
          {
            recipientMemberIds: adultMemberIds(requesterFamilyId),
            title:
              status === 'accepted'
                ? translate('push.familyRequestAcceptedTitle')
                : translate('push.familyRequestDeclinedTitle'),
            body:
              status === 'accepted'
                ? translate('push.familyRequestAcceptedBody', {
                    family: responderFamily.familyName
                  })
                : translate('push.familyRequestDeclinedBody', {
                    family: responderFamily.familyName
                  }),
            privateBody:
              translate('push.familyRequestStatusPrivateBody'),
            url: '/?view=admin',
            tag: `family-connection-${status}-${req.params.relationshipId}`
          },
          {
            title:
              status === 'accepted'
                ? translate('push.familyConnectedGotifyTitle')
                : translate('push.familyRequestDeclinedTitle'),
            message:
              status === 'accepted'
                ? translate('push.familyRequestAcceptedBody', {
                    family: responderFamily.familyName
                  })
                : translate('push.familyRequestDeclinedBody', {
                    family: responderFamily.familyName
                  }),
            priority: 4
          }
        );
      }
      publishFamilyChange(req.session.familyId, 'family-relationships');
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
      const relationship = getFamilyRelationship(
        req.session.familyId,
        req.params.relationshipId
      );
      if (
        !deleteFamilyRelationship(
          req.session.familyId,
          req.params.relationshipId
        )
      ) {
        return res.status(404).json({
          success: false,
          error: translate('errors.familyLinkNotFound')
        });
      }
      const otherFamilyId = relationship?.otherFamily?.id;
      const actorFamily = getFamily(req.session.familyId);
      if (otherFamilyId) {
        publishFamilyChange(otherFamilyId, 'family-relationships');
        queueNotificationChannels(
          otherFamilyId,
          'familyConnections',
          {
            recipientMemberIds: adultMemberIds(otherFamilyId),
            title: translate('push.familyConnectionEndedTitle'),
            body: translate('push.familyConnectionEndedBody', {
              family: actorFamily.familyName
            }),
            privateBody:
              translate('push.familyConnectionEndedPrivateBody'),
            url: '/?view=admin',
            tag: `family-connection-deleted-${req.params.relationshipId}`
          },
          {
            title: translate('push.familyConnectionEndedTitle'),
            message: translate('push.familyConnectionEndedBody', {
              family: actorFamily.familyName
            }),
            priority: 4
          }
        );
      }
      publishFamilyChange(req.session.familyId, 'family-relationships');
      res.json({
        success: true,
        relationships: listFamilyRelationships(req.session.familyId),
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.patch(
    '/api/family/relationships/:relationshipId/grants',
    requireAuth,
    requireAdult,
    (req, res) => {
      const input = ensureObject(req.body || {});
      const grants = Object.fromEntries(
        ['sharedCalendar', 'tasks', 'rewards', 'pocketMoney']
          .filter(key => Object.hasOwn(input, key))
          .map(key => [key, Boolean(input[key])])
      );
      const relationship = updateFamilyRelationshipGrants(
        req.session.familyId,
        req.params.relationshipId,
        grants
      );
      if (!relationship) {
        return res.status(404).json({
          success: false,
          error: translate('errors.confirmedFamilyConnectionNotFound')
        });
      }
      publishFamilyChange(req.session.familyId, 'family-relationship-grants');
      publishFamilyChange(
        relationship.otherFamily.id,
        'family-relationship-grants'
      );
      const actorFamily = getFamily(req.session.familyId);
      queueNotificationChannels(
        relationship.otherFamily.id,
        'familyConnections',
        {
          recipientMemberIds: adultMemberIds(
            relationship.otherFamily.id
          ),
          title: translate('push.familyGrantsChangedTitle'),
          body: translate('push.familyGrantsChangedBody', {
            family: actorFamily.familyName
          }),
          privateBody:
            translate('push.familyGrantsChangedPrivateBody'),
          url: '/?view=admin',
          tag: `family-connection-grants-${relationship.id}-${Date.now()}`
        },
        {
          title: translate('push.familyGrantsChangedGotifyTitle'),
          message: translate('push.familyGrantsChangedBody', {
            family: actorFamily.familyName
          }),
          priority: 3
        }
      );
      res.json({
        success: true,
        relationship,
        relationships: listFamilyRelationships(req.session.familyId),
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.get('/api/family/mail', requireAuth, requireAdult, (req, res) => {
    res.json({
      success: true,
      letters: listFamilyLetters(
        req.session.familyId,
        req.session.memberId,
        {
          includeArchived: req.query.archived === 'true'
        }
      ),
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.post('/api/family/mail', requireAuth, requireAdult, (req, res) => {
    const input = ensureObject(req.body);
    const recipientFamilyId = requireText(
      input.recipientFamilyId,
      translate('fields.recipientFamily'),
      100
    );
    const relationship = listFamilyRelationships(
      req.session.familyId
    ).find(entry =>
      entry.status === 'accepted' &&
      entry.otherFamily?.id === recipientFamilyId
    );
    if (!relationship) {
      return res.status(403).json({
        success: false,
        error:
          translate('errors.lettersRequireConfirmedConnection')
      });
    }
    const letter = createFamilyLetter(
      req.session.familyId,
      req.session.memberId,
      recipientFamilyId,
      {
        subject: requireText(input.subject, translate('fields.subject'), 120),
        body: requireText(input.body, translate('fields.letterBody'), 6000),
        replyToId: cleanText(input.replyToId, '', 120)
      }
    );
    const senderFamily = getFamily(req.session.familyId);
    publishFamilyChange(req.session.familyId, 'family-mail');
    publishFamilyChange(recipientFamilyId, 'family-mail');
    queueNotificationChannels(
      recipientFamilyId,
      'familyMail',
      {
        recipientMemberIds: adultMemberIds(recipientFamilyId),
        title: translate('push.familyMailTitle', {
          family: senderFamily.familyName
        }),
        body: letter.subject,
        privateBody: translate('push.familyMailPrivateBody'),
        url: '/?view=mail',
        tag: `family-letter-${letter.id}`,
        priority: 'normal'
      },
      {
        title: translate('push.familyMailTitle', {
          family: senderFamily.familyName
        }),
        message: letter.subject,
        priority: 4
      }
    );
    res.status(201).json({
      success: true,
      letter,
      letters: listFamilyLetters(
        req.session.familyId,
        req.session.memberId
      ),
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.patch(
    '/api/family/mail/:letterId',
    requireAuth,
    requireAdult,
    (req, res) => {
      const letter = updateFamilyLetterState(
        req.session.familyId,
        req.session.memberId,
        req.params.letterId,
        {
          read: Object.hasOwn(req.body || {}, 'read')
            ? Boolean(req.body.read)
            : undefined,
          archived: Object.hasOwn(req.body || {}, 'archived')
            ? Boolean(req.body.archived)
            : undefined
        }
      );
      if (!letter) {
        return res.status(404).json({
          success: false,
          error: translate('errors.letterNotFound')
        });
      }
      res.json({
        success: true,
        letter,
        letters: listFamilyLetters(
          req.session.familyId,
          req.session.memberId
        ),
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.get('/api/family/chat-guests', requireAuth, (req, res) => {
    const member = req.session.memberId
      ? getMember(req.session.familyId, req.session.memberId)
      : null;
    res.json({
      success: true,
      invitations: visibleFamilyChatGuests(req.session.familyId, member),
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.post(
    '/api/family/chat-guests',
    requireAuth,
    requireAdult,
    (req, res) => {
      const invitation = createFamilyChatGuestInvite(
        req.session.familyId,
        requireText(req.body?.relationshipId, translate('fields.familyConnection'), 120),
        requireText(req.body?.guestMemberId, translate('fields.guestProfile'), 120),
        req.session.memberId
      );
      publishFamilyChange(invitation.hostFamily.id, 'family-chat-guests');
      publishFamilyChange(invitation.guestFamily.id, 'family-chat-guests');
      queueNotificationChannels(
        invitation.guestFamily.id,
        'familyChatInvites',
        {
          recipientMemberIds: [invitation.guestMember.id],
          title: translate('push.invitationFrom', {
            family: invitation.hostFamily.familyName
          }),
          body: translate('push.chatInviteBody'),
          privateBody: translate('push.chatInvitePrivateBody'),
          url: '/?view=mail',
          tag: `family-chat-invite-${invitation.id}`,
          priority: 'high'
        },
        {
          title: translate('push.chatInviteGotifyTitle'),
          message:
            translate('push.chatInviteGotifyMessage', {
              name: invitation.guestMember.name,
              family: invitation.hostFamily.familyName
            }),
          priority: 5
        }
      );
      res.status(201).json({
        success: true,
        invitation,
        invitations: visibleFamilyChatGuests(
          req.session.familyId,
          req.activeMember
        ),
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.patch(
    '/api/family/chat-guests/:invitationId',
    requireAuth,
    (req, res) => {
      const invitation = getFamilyChatGuest(
        req.session.familyId,
        req.params.invitationId
      );
      if (!invitation) {
        return res.status(404).json({
          success: false,
          error: translate('errors.chatInviteNotFound')
        });
      }
      const member = getMember(
        req.session.familyId,
        req.session.memberId
      );
      const requestedStatus = cleanText(req.body?.status, '', 20);
      let nextStatus = '';
      if (['accepted', 'declined'].includes(requestedStatus)) {
        const canRespond =
          invitation.direction === 'guest' &&
          invitation.guestMember.id === member?.id;
        if (!canRespond || invitation.status !== 'pending') {
          return res.status(403).json({
            success: false,
            error: translate('errors.inviteNotAnswerableByProfile')
          });
        }
        nextStatus = requestedStatus;
      } else if (requestedStatus === 'revoked') {
        if (
          invitation.direction !== 'host' ||
          !isAdultMember(member)
        ) {
          return res.status(403).json({
            success: false,
            error: translate('errors.onlyHostCanRevokeGuest')
          });
        }
        nextStatus = 'revoked';
      } else {
        return res.status(400).json({
          success: false,
          error: translate('errors.inviteRespondOptions')
        });
      }
      const updated = updateFamilyChatGuestStatus(
        req.session.familyId,
        invitation.id,
        nextStatus
      );
      publishFamilyChange(updated.hostFamily.id, 'family-chat-guests');
      publishFamilyChange(updated.guestFamily.id, 'family-chat-guests');
      if (nextStatus === 'accepted') {
        queueNotificationChannels(
          updated.hostFamily.id,
          'familyChatInvites',
          {
            recipientMemberIds: adultMemberIds(updated.hostFamily.id),
            title: translate('push.chatGuestJoinedTitle', {
              name: updated.guestMember.name
            }),
            body: translate('push.chatGuestJoinedBody', {
              family: updated.guestFamily.familyName
            }),
            privateBody: translate('push.chatGuestJoinedPrivateBody'),
            url: '/?view=chat',
            tag: `family-chat-accepted-${updated.id}`
          }
        );
      }
      res.json({
        success: true,
        invitation: updated,
        invitations: visibleFamilyChatGuests(
          req.session.familyId,
          member
        ),
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.get(
    '/api/family/chat-guests/:invitationId/messages',
    requireAuth,
    (req, res) => {
      const invitation = getFamilyChatGuest(
        req.session.familyId,
        req.params.invitationId
      );
      const member = getMember(
        req.session.familyId,
        req.session.memberId
      );
      const canRead =
        invitation?.status === 'accepted' &&
        member?.role !== 'pet' &&
        (
          invitation.direction === 'host' ||
          invitation.guestMember.id === member?.id
        );
      if (!canRead) {
        return res.status(403).json({
          success: false,
          error: translate('errors.guestChatNotAllowed')
        });
      }
      const messages = listRecords(
        invitation.hostFamily.id,
        'chatMessages'
      )
        .filter(message =>
          (message.target === 'group' || !message.target) &&
          Number(message.timestamp || 0) >= Number(invitation.acceptedAt || 0)
        )
        .sort((left, right) =>
          Number(left.timestamp || 0) - Number(right.timestamp || 0)
        )
        .slice(-500);
      res.json({
        success: true,
        invitation,
        messages
      });
    }
  );

  app.put(
    '/api/family/chat-guests/:invitationId/attachments',
    requireAuth,
    express.raw({
      type: 'application/octet-stream',
      limit: '100mb'
    }),
    async (req, res) => {
      const invitation = getFamilyChatGuest(
        req.session.familyId,
        req.params.invitationId
      );
      const member = getMember(
        req.session.familyId,
        req.session.memberId
      );
      if (
        invitation?.status !== 'accepted' ||
        invitation.direction !== 'guest' ||
        invitation.guestMember.id !== member?.id ||
        member?.role === 'pet'
      ) {
        return res.status(403).json({
          success: false,
          error: translate('errors.guestChatNotAllowed')
        });
      }
      const attachment = await uploadChatAttachment(
        invitation.hostFamily.id,
        req
      );
      res.status(201).json({ success: true, attachment });
    }
  );

  app.get(
    '/api/family/chat-guests/:invitationId/messages/:messageId/attachments/:attachmentId',
    requireAuth,
    async (req, res) => {
      const invitation = getFamilyChatGuest(
        req.session.familyId,
        req.params.invitationId
      );
      const member = getMember(
        req.session.familyId,
        req.session.memberId
      );
      const canRead =
        invitation?.status === 'accepted' &&
        member?.role !== 'pet' &&
        (
          invitation.direction === 'host' ||
          invitation.guestMember.id === member?.id
        );
      if (!canRead) {
        return res.status(403).json({
          success: false,
          error: translate('errors.guestChatNotAllowed')
        });
      }
      const message = getRecord(
        invitation.hostFamily.id,
        'chatMessages',
        req.params.messageId
      );
      if (
        !message ||
        (message.target && message.target !== 'group') ||
        Number(message.timestamp || 0) < Number(invitation.acceptedAt || 0)
      ) {
        return res.status(404).json({
          success: false,
          error: translate('errors.chatMessageNotFound')
        });
      }
      await sendChatAttachmentContent(
        res,
        invitation.hostFamily.id,
        message,
        req.params.attachmentId,
        req.query.inline === 'true'
      );
    }
  );

  app.post(
    '/api/family/chat-guests/:invitationId/messages',
    requireAuth,
    async (req, res) => {
      const invitation = getFamilyChatGuest(
        req.session.familyId,
        req.params.invitationId
      );
      const member = getMember(
        req.session.familyId,
        req.session.memberId
      );
      if (
        invitation?.status !== 'accepted' ||
        invitation.direction !== 'guest' ||
        invitation.guestMember.id !== member?.id
      ) {
        return res.status(403).json({
          success: false,
          error: translate('errors.onlyInvitedProfileCanWrite')
        });
      }
      const text = cleanText(req.body?.text, '', 4000);
      const photo = cleanText(req.body?.photo, '', 2_500_000);
      const attachments = sanitizeChatAttachments(
        req.body?.attachments,
        invitation.hostFamily.id
      );
      if (!text && !photo && !attachments.length) {
        return res.status(400).json({
          success: false,
          error: translate('errors.messageEmpty')
        });
      }
      const preparedMessage = await archiveLegacyChatPhoto(
        invitation.hostFamily.id,
        {
          text,
          photo,
          attachments,
          target: 'group'
        }
      );
      const record = createRecord(
        invitation.hostFamily.id,
        'chatMessages',
        {
          id: `guest-message-${randomUUID()}`,
          senderId: member.id,
          senderName:
            `${member.name} · ${invitation.guestFamily.familyName}`,
          senderAvatar: member.avatar,
          senderColor: member.color,
          guestInvitationId: invitation.id,
          guestFamilyId: invitation.guestFamily.id,
          text: preparedMessage.text,
          photo: preparedMessage.photo,
          attachments: preparedMessage.attachments,
          target: 'group',
          timestamp: Date.now()
        }
      );
      publishFamilyChange(invitation.hostFamily.id, 'chatMessages');
      publishFamilyChange(invitation.guestFamily.id, 'guest-chat');
      queueNotificationChannels(
        invitation.hostFamily.id,
        'groupChat',
        {
          recipientMemberIds: signedInMemberIds(invitation.hostFamily.id),
          title: translate('push.groupChatTitle', { name: member.name }),
          body: chatAttachmentMessageCopy(record),
          privateBody: photo || attachments.length
            ? translate('push.guestSharedAttachment')
            : translate('push.guestSentMessage'),
          url: '/?view=chat',
          tag: `guest-chat-message-${record.id}`
        }
      );
      res.status(201).json({
        success: true,
        message: record
      });
    }
  );

  app.post(
    '/api/family/shared-events',
    requireAuth,
    requireAdult,
    (req, res) => {
      const input = ensureObject(req.body);
      const recipientFamilyIds = Array.isArray(input.recipientFamilyIds)
        ? input.recipientFamilyIds
        : [];
      const event = createSharedFamilyEvent(
        req.session.familyId,
        req.session.memberId,
        {
          id: cleanText(input.id, `shared-event-${randomUUID()}`, 100),
          title: requireText(input.title, translate('fields.eventTitle'), 240),
          date: cleanDate(input.date, ''),
          time: cleanTime(input.time, ''),
          endTime: cleanTime(input.endTime, ''),
          allDay: Boolean(input.allDay),
          location: cleanText(input.location, '', 300),
          notes: cleanText(input.notes, '', 2000),
          category: cleanText(input.category, 'Familienzeit', 80),
          memberId: cleanText(input.memberId, 'all', 100),
          reminders: normalizeEventReminders(input.reminders),
          household: 'familie',
          createdByMemberId: req.activeMember.id,
          createdByName: req.activeMember.name
        },
        recipientFamilyIds
      );
      const ownerFamily = getFamily(req.session.familyId);
      event.sharedWithFamilies.forEach(family => {
        publishFamilyChange(family.id, 'shared-events');
        queueNotificationChannels(
          family.id,
          'events',
          {
            title: translate('push.invitationFrom', {
              family: ownerFamily.familyName
            }),
            body: calendarEventBody(event),
            privateBody:
              translate('push.sharedEventCreatedPrivateBody'),
            url: '/?view=calendar',
            tag: `shared-event-${event.sharedEventId}`
          },
          {
            title: translate('push.invitationFrom', {
              family: ownerFamily.familyName
            }),
            message: calendarEventBody(event),
            priority: 4
          }
        );
      });
      publishFamilyChange(req.session.familyId, 'shared-events');
      res.status(201).json({
        success: true,
        event,
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.delete(
    '/api/family/shared-events/:eventId',
    requireAuth,
    requireAdult,
    (req, res) => {
      const result = deleteSharedFamilyEvent(
        req.session.familyId,
        req.params.eventId
      );
      if (!result) {
        return res.status(404).json({
          success: false,
          error: translate('errors.sharedEventNotFound')
        });
      }
      const ownerFamily = getFamily(req.session.familyId);
      result.recipientFamilyIds.forEach(familyId => {
        publishFamilyChange(familyId, 'shared-events');
        queueNotificationChannels(
          familyId,
          'events',
          {
            title: translate('push.sharedEventCancelledTitle'),
            body: calendarEventBody(result.event, translate('push.eventDeletedPrefix')),
            privateBody:
              translate('push.sharedEventCancelledPrivateBody'),
            url: '/?view=calendar',
            tag: `shared-event-deleted-${result.event.sharedEventId}`,
            priority: 'high'
          },
          {
            title: translate('push.sharedEventCancelledTitle'),
            message: `${ownerFamily.familyName}: ${calendarEventBody(
              result.event
            )}`,
            priority: 6
          }
        );
      });
      publishFamilyChange(req.session.familyId, 'shared-events');
      res.json({
        success: true,
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.post(
    '/api/family/relationships/:relationshipId/tasks',
    requireAuth,
    requireAdult,
    (req, res) => {
      const relationship = getFamilyRelationship(
        req.session.familyId,
        req.params.relationshipId
      );
      const targetFamilyId = relationship?.otherFamily?.id;
      if (
        !relationship ||
        relationship.status !== 'accepted' ||
        !relationshipAllows(targetFamilyId, req.session.familyId, 'tasks')
      ) {
        return res.status(403).json({
          success: false,
          error: translate('errors.tasksNotShared')
        });
      }
      const targetMember = getMember(
        targetFamilyId,
        requireText(req.body?.memberId, translate('fields.grandchild'), 100)
      );
      if (
        !targetMember ||
        targetMember.isManaged ||
        !['child', 'teen'].includes(targetMember.role)
      ) {
        return res.status(404).json({
          success: false,
          error: translate('errors.selectedChildProfileNotFound')
        });
      }
      const rewardsAllowed = relationshipAllows(
        targetFamilyId,
        req.session.familyId,
        'rewards'
      );
      const actorFamily = getFamily(req.session.familyId);
      const task = createRecord(targetFamilyId, 'tasks', {
        id: `task-${randomUUID()}`,
        ...normalizeTaskSchedule(req.body || {}),
        title: requireText(req.body?.title, translate('fields.task'), 200),
        memberId: targetMember.id,
        category: cleanText(req.body?.category, 'Familie', 80),
        stars: rewardsAllowed
          ? Math.max(0, Math.min(1000, Number(req.body?.stars || 0)))
          : 0,
        completed: false,
        completionStatus: 'open',
        createdByMemberId: null,
        createdByName: req.activeMember.name,
        createdByExternalFamilyId: req.session.familyId,
        createdByFamilyName: actorFamily.familyName,
        createdAt: Date.now()
      });
      publishFamilyChange(targetFamilyId, 'tasks');
      queueNotificationChannels(
        targetFamilyId,
        'taskAssigned',
        {
          recipientMemberIds: [targetMember.id],
          title: translate('push.taskFromTitle', { name: req.activeMember.name }),
          body: task.title,
          privateBody: translate('push.taskWaitingPrivateBody'),
          url: '/?view=tasks',
          tag: `task-${task.id}`
        },
        {
          title: translate('push.taskFromTitle', { name: req.activeMember.name }),
          message: `${targetMember.name}: ${task.title}`,
          priority: 3
        }
      );
      res.status(201).json({ success: true, task });
    }
  );

  app.post(
    '/api/family/relationships/:relationshipId/rewards',
    requireAuth,
    requireAdult,
    (req, res) => {
      const relationship = getFamilyRelationship(
        req.session.familyId,
        req.params.relationshipId
      );
      const targetFamilyId = relationship?.otherFamily?.id;
      if (
        !relationship ||
        relationship.status !== 'accepted' ||
        !relationshipAllows(targetFamilyId, req.session.familyId, 'rewards')
      ) {
        return res.status(403).json({
          success: false,
          error: translate('errors.rewardsNotShared')
        });
      }
      const targetMember = getMember(
        targetFamilyId,
        requireText(req.body?.memberId, translate('fields.grandchild'), 100)
      );
      if (
        !targetMember ||
        targetMember.isManaged ||
        !['child', 'teen'].includes(targetMember.role)
      ) {
        return res.status(404).json({
          success: false,
          error: translate('errors.selectedChildProfileNotFound')
        });
      }
      const actorFamily = getFamily(req.session.familyId);
      const rewardInput = sanitizeRewardRecord(targetFamilyId, {
        ...req.body,
        forMemberId: targetMember.id
      });
      const reward = createRecord(targetFamilyId, 'rewards', {
        id: `reward-${randomUUID()}`,
        ...rewardInput,
        createdByName: req.activeMember.name,
        createdByExternalFamilyId: req.session.familyId,
        createdByFamilyName: actorFamily.familyName,
        createdAt: Date.now()
      });
      publishFamilyChange(targetFamilyId, 'rewards');
      queueNotificationChannels(
        targetFamilyId,
        'rewards',
        {
          recipientMemberIds: [targetMember.id],
          title: translate('push.rewardFromTitle', { name: req.activeMember.name }),
          body: reward.title,
          privateBody:
            translate('push.rewardWaitingPrivateBody'),
          url: '/?view=tasks',
          tag: `reward-new-${reward.id}`
        },
        {
          title: translate('push.rewardFromTitle', { name: req.activeMember.name }),
          message: `${targetMember.name}: ${reward.title}`,
          priority: 3
        }
      );
      res.status(201).json({ success: true, reward });
    }
  );

  app.post(
    '/api/family/relationships/:relationshipId/pocket-money',
    requireAuth,
    requireAdult,
    (req, res) => {
      const relationship = getFamilyRelationship(
        req.session.familyId,
        req.params.relationshipId
      );
      const targetFamilyId = relationship?.otherFamily?.id;
      if (
        !relationship ||
        relationship.status !== 'accepted' ||
        !relationshipAllows(targetFamilyId, req.session.familyId, 'pocketMoney')
      ) {
        return res.status(403).json({
          success: false,
          error: translate('errors.pocketMoneyNotShared')
        });
      }
      const targetMember = getMember(
        targetFamilyId,
        requireText(req.body?.memberId, translate('fields.grandchild'), 100)
      );
      if (
        !targetMember ||
        targetMember.isManaged ||
        !['child', 'teen'].includes(targetMember.role)
      ) {
        return res.status(404).json({
          success: false,
          error: translate('errors.selectedChildProfileNotFound')
        });
      }
      const actorFamily = getFamily(req.session.familyId);
      const result = createPocketMoneyTransaction(
        targetFamilyId,
        targetMember.id,
        {
          id: `pocket-${randomUUID()}`,
          amountCents: Number(req.body?.amountCents || 0),
          starCost: 0,
          note: requireText(req.body?.note, translate('fields.transactionNote'), 160),
          icon: cleanText(req.body?.icon, '💶', 12),
          createdByMemberId: null,
          createdByName: req.activeMember.name,
          createdByExternalFamilyId: req.session.familyId,
          createdByFamilyName: actorFamily.familyName,
          createdAt: Date.now()
        }
      );
      publishFamilyChange(targetFamilyId, 'pocketMoneyTransactions');
      const amount = euroAmount(result.transaction.amountCents);
      queueNotificationChannels(
        targetFamilyId,
        'pocketMoney',
        {
          recipientMemberIds: [targetMember.id],
          title:
            result.transaction.amountCents > 0
              ? translate('push.pocketMoneyReceivedTitle')
              : translate('push.pocketMoneyChangedTitle'),
          body: `${amount} · ${result.transaction.note}`,
          privateBody:
            translate('push.pocketMoneyPrivateBody'),
          url: '/?view=family-life',
          tag: `pocket-money-${result.transaction.id}`
        },
        {
          title: translate('push.pocketMoneyGotifyTitle', {
            name: targetMember.name
          }),
          message: `${amount} · ${result.transaction.note}`,
          priority: 3
        }
      );
      res.status(201).json({ success: true, ...result });
    }
  );

  app.patch('/api/family', requireAuth, requireAdult, (req, res) => {
    const input = ensureObject(req.body);
    const changes = {};
    if (Object.hasOwn(input, 'familyName')) {
      changes.familyName = requireText(input.familyName, translate('fields.familyName'), 100);
    }
    if (Object.hasOwn(input, 'familyAvatar')) {
      changes.familyAvatar = cleanText(input.familyAvatar, '', 1_200_000);
    }
    if (Object.hasOwn(input, 'badge')) {
      changes.badge = cleanText(input.badge, 'Familie', 60);
    }
    if (Object.hasOwn(input, 'grandparentsHouseholdEnabled')) {
      if (typeof input.grandparentsHouseholdEnabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: translate('errors.secondHouseholdSettingInvalid')
        });
      }
      changes.grandparentsHouseholdEnabled =
        input.grandparentsHouseholdEnabled;
    }
    if (input.password) {
      changes.password = requireText(input.password, translate('fields.password'), 100);
      if (changes.password.length < 10) {
        return res.status(400).json({
          success: false,
          error: translate('errors.passwordTooShort')
        });
      }
    }
    const family = updateFamily(req.session.familyId, changes);
    res.json({ success: true, family, version: getFamilyVersion(req.session.familyId) });
  });

  app.delete('/api/family', requireAuth, requireAdult, (req, res) => {
    const input = ensureObject(req.body || {});
    const password = requireText(input.password, translate('fields.password'), 100);
    const familyRow = getFamilyAuthRow(req.session.familyId);
    if (!familyRow || !verifySecret(password, familyRow.password_hash)) {
      return res.status(401).json({
        success: false,
        error: translate('errors.familyPasswordIncorrect')
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
      return res
        .status(404)
        .json({ success: false, error: translate('errors.profileNotFound') });
    }
    const active = req.session.memberId
      ? getMember(req.session.familyId, req.session.memberId)
      : null;
    const isSelf = active?.id === target.id;
    const isAdult = isAdultMember(active);
    if (!isSelf && !isAdult) {
      return res.status(403).json({
        success: false,
        error: translate('errors.cannotEditProfile')
      });
    }
    const input = ensureObject(req.body);
    const changes = {};
    const allowedSelfFields = ['name', 'avatar', 'color', 'bgColor', 'theme', 'pin'];
    const allowedAdultFields = [
      ...allowedSelfFields,
      'role',
      'position',
      'stars',
      'isManaged',
      'allowedModules'
    ];
    for (const key of isAdult ? allowedAdultFields : allowedSelfFields) {
      if (Object.hasOwn(input, key)) changes[key] = input[key];
    }
    if (Object.hasOwn(changes, 'name')) {
      changes.name = requireText(changes.name, translate('fields.name'), 80);
    }
    if (Object.hasOwn(changes, 'role')) {
      changes.role = normalizeRole(changes.role);
    }
    if (Object.hasOwn(changes, 'position')) {
      changes.position = cleanText(changes.position, 'familienmitglied', 40);
    }
    if (Object.hasOwn(changes, 'allowedModules')) {
      changes.allowedModules = Array.isArray(changes.allowedModules)
        ? [...new Set(
            changes.allowedModules
              .map(value => cleanText(value, '', 40))
              .filter(value => PROFILE_MODULE_IDS.has(value))
          )]
        : [];
    }
    if (Object.hasOwn(changes, 'isManaged')) {
      changes.isManaged = changes.isManaged === true;
      if (isSelf && changes.isManaged) {
        return res.status(409).json({
          success: false,
          error:
            translate('errors.cannotDemoteActiveProfile')
        });
      }
      if (changes.isManaged) changes.pin = '';
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
        error: translate('errors.cannotDeleteActiveProfile')
      });
    }
    if (!deleteMember(req.session.familyId, req.params.memberId)) {
      return res
        .status(404)
        .json({ success: false, error: translate('errors.profileNotFound') });
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
      if (!target || target.role === 'pet') {
        return res.status(404).json({
          success: false,
          error: translate('errors.familyProfileNotFound')
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
        error: translate('errors.selectedProfileNotFound')
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

  app.put(
    '/api/chat/attachments',
    requireAuth,
    requireChatMember,
    express.raw({
      type: 'application/octet-stream',
      limit: '100mb'
    }),
    async (req, res) => {
      const attachment = await uploadChatAttachment(
        req.session.familyId,
        req
      );
      res.status(201).json({ success: true, attachment });
    }
  );

  app.get(
    '/api/chat/messages/:messageId/attachments/:attachmentId',
    requireAuth,
    requireChatMember,
    async (req, res) => {
      const message = getRecord(
        req.session.familyId,
        'chatMessages',
        req.params.messageId
      );
      if (
        !message ||
        !visibleChatMessages(
          [message],
          req.session.memberId
        ).length
      ) {
        return res.status(404).json({
          success: false,
          error: translate('errors.chatMessageNotFound')
        });
      }
      await sendChatAttachmentContent(
        res,
        req.session.familyId,
        message,
        req.params.attachmentId,
        req.query.inline === 'true'
      );
    }
  );

  app.get('/api/resources/:type', requireAuth, (req, res) => {
    if (rejectPetChatAccess(req, res)) return;
    let records = listRecords(req.session.familyId, req.params.type);
    const activeMember = req.session.memberId
      ? getMember(req.session.familyId, req.session.memberId)
      : null;
    if (req.params.type === 'chatMessages') {
      records = visibleChatMessages(records, req.session.memberId);
    }
    if (
      activeMember &&
      !isAdultMember(activeMember) &&
      ['events', 'tasks'].includes(req.params.type)
    ) {
      const managedMemberIds = new Set(
        getMembers(req.session.familyId)
          .filter(isManagedMember)
          .map(member => member.id)
      );
      records = records.filter(
        record => !managedMemberIds.has(record.memberId)
      );
    }
    if (PROFILE_SCOPED_FAMILY_LIFE_TYPES.has(req.params.type)) {
      const member = activeMember;
      if (member && !isAdultMember(member)) {
        records = member.role === 'pet'
          ? []
          : records.filter(record => record.memberId === member.id);
      }
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
        error: translate('errors.bulkImportUnavailable')
      });
    }
    if (!Array.isArray(req.body?.records)) {
      return res.status(400).json({
        success: false,
        error: translate('errors.recordListRequired')
      });
    }
    const inputRecords = req.body.records
      .slice(0, 500)
      .map(record => ensureObject(record))
      .map(record =>
        req.params.type === 'trashEvents'
          ? sanitizeTrashEvent(record)
          : record
      );
    const records = upsertRecords(
      req.session.familyId,
      req.params.type,
      inputRecords
    );
    const version = getFamilyVersion(req.session.familyId);
    if (records.length) {
      publishFamilyChange(req.session.familyId, req.params.type);
    }
    res.json({ success: true, records, version });
  });

  app.post('/api/resources/:type', requireAuth, requireResourceManager, async (req, res) => {
    if (rejectPetChatAccess(req, res)) return;
    let input = ensureObject(req.body);
    if (req.params.type === 'pocketMoneyTransactions') {
      return res.status(405).json({
        success: false,
        error: translate('errors.pocketMoneyProtectedEndpoint')
      });
    }
    if (req.params.type === 'chatMessages') {
      input = sessionChatRecord(req, input);
      input = await archiveLegacyChatPhoto(
        req.session.familyId,
        input
      );
    }
    if (req.params.type === 'moodCheckins') {
      if (!req.session.memberId) {
        return res.status(403).json({
          success: false,
          error: translate('errors.profileRequired')
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
      input = await enrichDashboardLinkPreview(input);
    }
    if (FAMILY_LIFE_TYPES.has(req.params.type)) {
      input = sanitizeFamilyLifeRecord(req, req.params.type, input);
    }
    if (req.params.type === 'rewards') {
      input = sanitizeRewardRecord(req.session.familyId, input);
    }
    if (req.params.type === 'events') {
      input = sanitizeCalendarEvent(req, input);
    }
    if (req.params.type === 'trashEvents') {
      input = sanitizeTrashEvent(input);
    }
    if (req.params.type === 'tasks') {
      const creator = getMember(req.session.familyId, req.session.memberId);
      const memberId = requireText(input.memberId, translate('fields.targetProfile'), 100);
      const targetMember = getMember(req.session.familyId, memberId);
      if (!targetMember) {
        return res.status(400).json({
          success: false,
          error: translate('errors.selectedProfileNotFound')
        });
      }
      const rotationMemberIds = targetMember.isManaged ? [] : [
        ...new Set(
          (Array.isArray(input.rotationMemberIds)
            ? input.rotationMemberIds
            : []
          )
            .map(id => cleanText(id, '', 100))
            .filter(id => {
              const rotationMember = getMember(req.session.familyId, id);
              return Boolean(
                rotationMember &&
                !rotationMember.isManaged &&
                rotationMember.role !== 'pet'
              );
            })
        )
      ];
      if (rotationMemberIds.length && !rotationMemberIds.includes(memberId)) {
        rotationMemberIds.unshift(memberId);
      }
      input = {
        ...input,
        ...normalizeTaskSchedule(input),
        title: requireText(input.title, translate('fields.task'), 200),
        description: cleanText(input.description, '', 2000),
        memberId,
        rotationMemberIds,
        rotationIndex: Math.max(0, rotationMemberIds.indexOf(memberId)),
        category: cleanText(input.category, 'Haushalt', 80),
        dueTime: cleanTime(input.dueTime, ''),
        stars: targetMember.isManaged
          ? 0
          : Math.max(0, Math.min(1000, Number(input.stars ?? 10))),
        completed: false,
        completionStatus: 'open',
        createdByMemberId: creator?.id || null,
        createdByName: creator?.name || translate('labels.parent'),
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
      notifyChatViaWebPush(req, record).forEach(familyId =>
        publishFamilyChange(familyId, 'guest-chat')
      );
    }
    notifyCreatedResource(req, req.params.type, record);
    if (req.params.type === 'moodCheckins') {
      notifyMoodCheckin(req, record);
    }
    publishFamilyChange(req.session.familyId, req.params.type);
    if (req.params.type === 'events') {
      queueNextcloudEventSync(req.session.familyId);
    }
    res.status(201).json({
      success: true,
      record,
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.patch('/api/resources/:type/:id', requireAuth, requireResourceManager, async (req, res) => {
    if (rejectPetChatAccess(req, res)) return;
    let existingEvent = null;
    let existingTrashEvent = null;
    if (req.params.type === 'events') {
      existingEvent = getRecord(
        req.session.familyId,
        'events',
        req.params.id
      );
      if (isCalendarSubscriptionEvent(existingEvent)) {
        return res.status(409).json({
          success: false,
          error:
            translate('errors.eventReadOnlySubscription')
        });
      }
    }
    if (req.params.type === 'trashEvents') {
      existingTrashEvent = getRecord(
        req.session.familyId,
        'trashEvents',
        req.params.id
      );
    }
    if (req.params.type === 'chatMessages') {
      const existing = getRecord(
        req.session.familyId,
        'chatMessages',
        req.params.id
      );
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: translate('errors.messageNotFound')
        });
      }
      if (!canModifyChatRecord(req, existing)) {
        return res.status(403).json({
          success: false,
          error: translate('errors.cannotEditMessage')
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
          error: translate('errors.dashboardLinkNotFound')
        });
      }
      changes = await enrichDashboardLinkPreview(sanitizeDashboardLink(req, {
        ...existing,
        ...ensureObject(req.body)
      }));
    } else if (req.params.type === 'tasks') {
      const existing = getRecord(
        req.session.familyId,
        'tasks',
        req.params.id
      );
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: translate('errors.entryNotFound')
        });
      }
      const candidate = {
        ...existing,
        ...Object.fromEntries(
          Object.entries(ensureObject(req.body)).filter(
            ([key]) => !PROTECTED_TASK_FIELDS.has(key)
          )
        )
      };
      const memberId = requireText(
        candidate.memberId,
        translate('fields.targetProfile'),
        100
      );
      const targetMember = getMember(req.session.familyId, memberId);
      if (!targetMember) {
        return res.status(400).json({
          success: false,
          error: translate('errors.selectedProfileNotFound')
        });
      }
      const rotationMemberIds = targetMember.isManaged ? [] : [
        ...new Set(
          (Array.isArray(candidate.rotationMemberIds)
            ? candidate.rotationMemberIds
            : []
          )
            .map(id => cleanText(id, '', 100))
            .filter(id => {
              const rotationMember = getMember(req.session.familyId, id);
              return Boolean(
                rotationMember &&
                !rotationMember.isManaged &&
                rotationMember.role !== 'pet'
              );
            })
        )
      ];
      if (rotationMemberIds.length && !rotationMemberIds.includes(memberId)) {
        rotationMemberIds.unshift(memberId);
      }
      changes = {
        ...normalizeTaskSchedule(candidate),
        title: requireText(candidate.title, translate('fields.task'), 200),
        description: cleanText(candidate.description, '', 2000),
        memberId,
        rotationMemberIds,
        rotationIndex: Math.max(0, rotationMemberIds.indexOf(memberId)),
        category: cleanText(candidate.category, 'Haushalt', 80),
        dueTime: cleanTime(candidate.dueTime, ''),
        stars: targetMember.isManaged
          ? 0
          : Math.max(0, Math.min(1000, Number(candidate.stars ?? 10)))
      };
    } else if (req.params.type === 'rewards') {
      const existing = getRecord(
        req.session.familyId,
        'rewards',
        req.params.id
      );
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: translate('errors.rewardNotFound')
        });
      }
      changes = sanitizeRewardRecord(
        req.session.familyId,
        ensureObject(req.body),
        existing
      );
    } else if (req.params.type === 'events') {
      if (!existingEvent) {
        return res.status(404).json({
          success: false,
          error: translate('errors.eventNotFound')
        });
      }
      changes = sanitizeCalendarEvent(
        req,
        {
          ...existingEvent,
          ...ensureObject(req.body)
        },
        existingEvent
      );
    } else if (req.params.type === 'trashEvents') {
      if (!existingTrashEvent) {
        return res.status(404).json({
          success: false,
          error: translate('errors.trashEventNotFound')
        });
      }
      changes = sanitizeTrashEvent(
        {
          ...existingTrashEvent,
          ...ensureObject(req.body)
        },
        existingTrashEvent
      );
    } else if (FAMILY_LIFE_TYPES.has(req.params.type)) {
      const existing = getRecord(
        req.session.familyId,
        req.params.type,
        req.params.id
      );
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: translate('errors.entryNotFound')
        });
      }
      changes = sanitizeFamilyLifeRecord(
        req,
        req.params.type,
        {
          ...existing,
          ...ensureObject(req.body)
        },
        existing
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
      return res
        .status(404)
        .json({ success: false, error: translate('errors.entryNotFound') });
    }
    if (req.params.type === 'events') {
      notifyCalendarChange(req, record, {
        kind: 'updated',
        previous: existingEvent
      });
    }
    publishFamilyChange(req.session.familyId, req.params.type);
    if (req.params.type === 'events') {
      queueNextcloudEventSync(req.session.familyId);
    }
    res.json({
      success: true,
      record,
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.delete('/api/resources/:type/:id', requireAuth, requireResourceManager, (req, res) => {
    if (rejectPetChatAccess(req, res)) return;
    let existingEvent = null;
    if (req.params.type === 'events') {
      existingEvent = getRecord(
        req.session.familyId,
        'events',
        req.params.id
      );
      if (isCalendarSubscriptionEvent(existingEvent)) {
        return res.status(409).json({
          success: false,
          error:
            translate('errors.eventReadOnlySubscription')
        });
      }
    }
    if (req.params.type === 'chatMessages') {
      const existing = getRecord(
        req.session.familyId,
        'chatMessages',
        req.params.id
      );
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: translate('errors.messageNotFound')
        });
      }
      if (!canModifyChatRecord(req, existing)) {
        return res.status(403).json({
          success: false,
          error: translate('errors.cannotDeleteMessage')
        });
      }
    }
    if (!deleteRecord(req.session.familyId, req.params.type, req.params.id)) {
      return res
        .status(404)
        .json({ success: false, error: translate('errors.entryNotFound') });
    }
    if (existingEvent) {
      notifyCalendarChange(req, existingEvent, { kind: 'deleted' });
      queueNextcloudEventSync(req.session.familyId);
    }
    publishFamilyChange(req.session.familyId, req.params.type);
    res.json({
      success: true,
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.post('/api/routines/:routineId/toggle', requireAuth, (req, res) => {
    const routine = getRecord(
      req.session.familyId,
      'dailyRoutines',
      req.params.routineId
    );
    if (!routine) {
      return res.status(404).json({
        success: false,
        error: translate('errors.routineNotFound')
      });
    }
    const member = req.session.memberId
      ? getMember(req.session.familyId, req.session.memberId)
      : null;
    const isAdult = isAdultMember(member);
    if (!member || (!isAdult && routine.memberId !== member.id)) {
      return res.status(403).json({
        success: false,
        error: translate('errors.onlyOwnRoutine')
      });
    }
    const stepId = requireText(req.body?.stepId, translate('fields.routineStep'), 80);
    if (!routine.steps?.some(step => step.id === stepId)) {
      return res.status(404).json({
        success: false,
        error: translate('errors.routineStepNotFound')
      });
    }
    const today = new Date().toLocaleDateString('en-CA');
    const date = cleanDate(req.body?.date, today);
    if (!isAdult && date !== today) {
      return res.status(403).json({
        success: false,
        error: translate('errors.childrenOnlyToday')
      });
    }
    const completed = new Set(
      Array.isArray(routine.completions?.[date])
        ? routine.completions[date]
        : []
    );
    if (completed.has(stepId)) completed.delete(stepId);
    else completed.add(stepId);
    const completions = {
      ...(routine.completions || {}),
      [date]: [...completed]
    };
    const recentDates = Object.keys(completions).sort().slice(-45);
    const trimmedCompletions = Object.fromEntries(
      recentDates.map(key => [key, completions[key]])
    );
    const record = updateRecord(
      req.session.familyId,
      'dailyRoutines',
      routine.id,
      { completions: trimmedCompletions }
    );
    const completedToday =
      completed.size === (routine.steps?.length || 0);
    if (completedToday && !isAdult) {
      queueNotificationChannels(
        req.session.familyId,
        'taskCompleted',
        {
          recipientMemberIds: adultMemberIds(req.session.familyId),
          excludeMemberIds: [member.id],
          title: translate('push.routineCompletedTitle', { name: member.name }),
          body: routine.title,
          privateBody:
            translate('push.routineCompletedPrivateBody'),
          url: '/?view=family-life',
          tag: `routine-complete-${routine.id}-${date}`
        },
        {
          title: translate('push.routineCompletedTitle', { name: member.name }),
          message: routine.title,
          priority: 3
        }
      );
    }
    publishFamilyChange(req.session.familyId, 'dailyRoutines');
    res.json({
      success: true,
      record,
      completedToday,
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.post('/api/school/:itemId/toggle', requireAuth, (req, res) => {
    const item = getRecord(
      req.session.familyId,
      'schoolItems',
      req.params.itemId
    );
    if (!item) {
      return res.status(404).json({
        success: false,
        error: translate('errors.schoolItemNotFound')
      });
    }
    if (!['homework', 'bag'].includes(item.kind)) {
      return res.status(409).json({
        success: false,
        error: translate('errors.schoolItemNotToggleable')
      });
    }
    const member = req.session.memberId
      ? getMember(req.session.familyId, req.session.memberId)
      : null;
    const isAdult = isAdultMember(member);
    if (!member || (!isAdult && item.memberId !== member.id)) {
      return res.status(403).json({
        success: false,
        error: translate('errors.onlyOwnSchoolItems')
      });
    }
    const record = updateRecord(
      req.session.familyId,
      'schoolItems',
      item.id,
      { completed: !item.completed, completedAt: !item.completed ? Date.now() : null }
    );
    if (record.completed && !isAdult) {
      queueNotificationChannels(
        req.session.familyId,
        'schoolItems',
        {
          recipientMemberIds: adultMemberIds(req.session.familyId),
          excludeMemberIds: [member.id],
          title: translate('push.schoolCompletedTitle', { name: member.name }),
          body: item.title,
          privateBody:
            translate('push.schoolCompletedPrivateBody'),
          url: '/?view=family-life',
          tag: `school-complete-${item.id}`
        },
        {
          title: translate('push.schoolCompletedTitle', { name: member.name }),
          message: item.title,
          priority: 3
        }
      );
    }
    publishFamilyChange(req.session.familyId, 'schoolItems');
    res.json({
      success: true,
      record,
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.post('/api/polls/:pollId/vote', requireAuth, (req, res) => {
    const poll = getRecord(
      req.session.familyId,
      'familyPolls',
      req.params.pollId
    );
    if (!poll) {
      return res.status(404).json({
        success: false,
        error: translate('errors.pollNotFound')
      });
    }
    const member = req.session.memberId
      ? getMember(req.session.familyId, req.session.memberId)
      : null;
    if (!member || member.role === 'pet') {
      return res.status(403).json({
        success: false,
        error: translate('errors.familyProfileRequired')
      });
    }
    if (poll.closesAt && new Date().toLocaleDateString('en-CA') > poll.closesAt) {
      return res.status(409).json({
        success: false,
        error: translate('errors.pollClosed')
      });
    }
    const optionId = requireText(req.body?.optionId, translate('fields.answer'), 80);
    if (!poll.options?.some(option => option.id === optionId)) {
      return res.status(404).json({
        success: false,
        error: translate('errors.pollOptionNotFound')
      });
    }
    const record = updateRecord(
      req.session.familyId,
      'familyPolls',
      poll.id,
      {
        votes: {
          ...(poll.votes || {}),
          [member.id]: optionId
        }
      }
    );
    publishFamilyChange(req.session.familyId, 'familyPolls');
    res.json({
      success: true,
      record,
      version: getFamilyVersion(req.session.familyId)
    });
  });

  app.post(
    '/api/family-missions/:missionId/toggle',
    requireAuth,
    (req, res) => {
      const mission = getRecord(
        req.session.familyId,
        'familyMissions',
        req.params.missionId
      );
      if (!mission) {
        return res.status(404).json({
          success: false,
          error: translate('errors.familyMissionNotFound')
        });
      }
      const active = req.session.memberId
        ? getMember(req.session.familyId, req.session.memberId)
        : null;
      const isAdult = isAdultMember(active);
      const memberId = isAdult
        ? cleanText(req.body?.memberId, active.id, 100)
        : active?.id;
      if (
        !active ||
        !memberId ||
        !mission.memberIds?.includes(memberId) ||
        (!isAdult && memberId !== active.id)
      ) {
        return res.status(403).json({
          success: false,
          error: translate('errors.familyMissionNotAllowed')
        });
      }
      const completed = new Set(mission.completedMemberIds || []);
      const wasCompleted = completed.has(memberId);
      if (wasCompleted) completed.delete(memberId);
      else completed.add(memberId);
      const record = updateRecord(
        req.session.familyId,
        'familyMissions',
        mission.id,
        { completedMemberIds: [...completed] }
      );
      if (!wasCompleted) {
        const completedMember = getMember(
          req.session.familyId,
          memberId
        );
        const recipients = [
          ...adultMemberIds(req.session.familyId),
          ...(mission.memberIds || []).flatMap(id =>
            profileNotificationRecipientIds(req.session.familyId, id)
          )
        ];
        queueNotificationChannels(
          req.session.familyId,
          'familyMissions',
          {
            recipientMemberIds: [...new Set(recipients)],
            excludeMemberIds: [active.id],
            title: translate('push.familyMissionCompletedTitle', {
              name: completedMember?.name || translate('labels.someone')
            }),
            body: mission.title,
            privateBody:
              translate('push.familyMissionCompletedPrivateBody'),
            url: '/?view=family-life',
            tag: `family-mission-complete-${mission.id}-${memberId}`
          },
          {
            title: translate('push.familyMissionCompletedGotifyTitle'),
            message: `${
              completedMember?.name || translate('labels.someone')
            }: ${mission.title}`,
            priority: 3
          }
        );
      }
      publishFamilyChange(req.session.familyId, 'familyMissions');
      res.json({
        success: true,
        record,
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.post(
    '/api/pocket-money/transactions',
    requireAuth,
    requireAdult,
    (req, res) => {
      const memberId = requireText(req.body?.memberId, translate('fields.childProfile'), 100);
      const result = createPocketMoneyTransaction(
        req.session.familyId,
        memberId,
        {
          id: cleanText(
            req.body?.id,
            `pocket-${randomUUID()}`,
            100
          ),
          amountCents: Number(req.body?.amountCents || 0),
          starCost: Number(req.body?.starCost || 0),
          note: requireText(req.body?.note, translate('fields.transactionNote'), 160),
          icon: cleanText(req.body?.icon, '💶', 12),
          createdByMemberId: req.activeMember.id,
          createdByName: req.activeMember.name,
          createdAt: Date.now()
        }
      );
      publishFamilyChange(req.session.familyId, 'pocketMoneyTransactions');
      const amount = euroAmount(result.transaction.amountCents);
      queueNotificationChannels(
        req.session.familyId,
        'pocketMoney',
        {
          recipientMemberIds: [memberId],
          excludeMemberIds: [req.activeMember.id],
          title:
            result.transaction.amountCents > 0
              ? translate('push.pocketMoneyReceivedTitle')
              : translate('push.pocketMoneyChangedTitle'),
          body: `${amount} · ${result.transaction.note}`,
          privateBody:
            translate('push.pocketMoneyPrivateBody'),
          url: '/?view=family-life',
          tag: `pocket-money-${result.transaction.id}`
        },
        {
          title: translate('push.pocketMoneyGotifyTitle', {
            name: result.member.name
          }),
          message: `${amount} · ${result.transaction.note}`,
          priority: 3
        }
      );
      res.status(201).json({
        success: true,
        ...result,
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.put(
    '/api/kids/:memberId/style',
    requireAuth,
    (req, res) => {
      const target = familyLifeMember(req, req.params.memberId, {
        childrenOnly: true
      });
      const active = req.session.memberId
        ? getMember(req.session.familyId, req.session.memberId)
        : null;
      if (
        !active ||
        (active.id !== target.id && !isAdultMember(active))
      ) {
        return res.status(403).json({
          success: false,
          error: translate('errors.cannotEditKidWorld')
        });
      }
      const existing = getRecord(
        req.session.familyId,
        'kidProfiles',
        `kid-profile-${target.id}`
      );
      const record = upsertRecord(
        req.session.familyId,
        'kidProfiles',
        sanitizeFamilyLifeRecord(
          req,
          'kidProfiles',
          {
            ...existing,
            ...ensureObject(req.body),
            memberId: target.id
          },
          existing
        )
      );
      publishFamilyChange(req.session.familyId, 'kidProfiles');
      res.json({
        success: true,
        record,
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.post('/api/tasks/:taskId/toggle', requireAuth, (req, res) => {
    const task = getRecord(req.session.familyId, 'tasks', req.params.taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: translate('errors.taskNotFound')
      });
    }
    const member = req.session.memberId
      ? getMember(req.session.familyId, req.session.memberId)
      : null;
    if (member?.role === 'pet') {
      return res.status(403).json({
        success: false,
        error: translate('errors.petCarePointsAdultOnly')
      });
    }
    if (!member || (!isAdultMember(member) && task.memberId !== member.id)) {
      return res.status(403).json({
        success: false,
        error: translate('errors.onlyOwnMissions')
      });
    }

    let result;
    if (!isAdultMember(member)) {
      if (task.completed) {
        return res.status(409).json({
          success: false,
          error: translate('errors.taskAlreadyApproved')
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
              .filter(isAdultMember)
              .map(entry => entry.id);
        queueGotifyNotification(req.session.familyId, 'taskApproval', {
          title: translate('push.taskApprovalTitle', { name: member.name }),
          message: translate('push.taskApprovalBody', { title: task.title }),
          priority: 6
        });
        queueWebPushEvent(req.session.familyId, 'taskApproval', {
          recipientMemberIds,
          excludeMemberIds: [member.id],
          title: translate('push.taskApprovalTitle', { name: member.name }),
          body: translate('push.taskApprovalBody', { title: task.title }),
          privateTitle: translate('push.taskApprovalPrivateTitle'),
          privateBody: translate('push.taskApprovalPrivateBody'),
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
          error: translate('errors.taskApprovalOnlyBy', {
            name: task.createdByName || translate('labels.theCreator')
          })
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
          error: translate('errors.taskNotFound')
        });
      }
      if (
        task.createdByMemberId &&
        getMember(req.session.familyId, task.createdByMemberId) &&
        task.createdByMemberId !== req.activeMember.id
      ) {
        return res.status(403).json({
          success: false,
          error: translate('errors.taskReviewOnlyBy', {
            name: task.createdByName || translate('labels.theCreator')
          })
        });
      }
      if (task.completionStatus !== 'pending_approval' || task.completed) {
        return res.status(409).json({
          success: false,
          error: translate('errors.noPendingReview')
        });
      }
      if (typeof req.body?.approved !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: translate('errors.reviewDecisionRequired')
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
        queueNotificationChannels(
          req.session.familyId,
          'taskApproval',
          {
            recipientMemberIds: [task.memberId],
            excludeMemberIds: [req.activeMember.id],
            title: translate('push.taskRejectedTitle'),
            body: translate('push.taskRejectedBody', { title: task.title }),
            privateTitle: translate('push.taskRejectedPrivateTitle'),
            privateBody:
              translate('push.taskRejectedPrivateBody'),
            url: '/?view=tasks',
            tag: `task-rejected-${task.id}`
          },
          {
            title: translate('push.taskRejectedGotifyTitle'),
            message: task.title,
            priority: 4
          }
        );
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
        error: translate('errors.selectProfile')
      });
    }
    const activeMember = req.session.memberId
      ? getMember(req.session.familyId, req.session.memberId)
      : null;
    if (
      activeMember &&
      !isAdultMember(activeMember) &&
      activeMember.id !== memberId
    ) {
      return res.status(403).json({
        success: false,
        error: translate('errors.redeemOnlySelf')
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
        error: translate('errors.rewardOrProfileNotFound')
      });
    }
    const recipientMemberIds = [
      result.member.id,
      ...adultMemberIds(req.session.familyId)
    ];
    queueNotificationChannels(
      req.session.familyId,
      'rewards',
      {
        recipientMemberIds: [...new Set(recipientMemberIds)],
        excludeMemberIds: [activeMember?.id],
        title: translate('push.rewardRedeemedTitle', { name: result.member.name }),
        body: result.reward.title,
        privateTitle: translate('push.rewardRedeemedPrivateTitle'),
        privateBody:
          translate('push.rewardRedeemedPrivateBody'),
        url: '/?view=tasks',
        tag: `reward-redeemed-${result.reward.id}-${Date.now()}`
      },
      {
        title: translate('push.rewardRedeemedTitle', { name: result.member.name }),
        message: result.reward.title,
        priority: 5
      }
    );
    if (result.reward.createdByExternalFamilyId) {
      queueNotificationChannels(
        result.reward.createdByExternalFamilyId,
        'rewards',
        {
          recipientMemberIds: adultMemberIds(
            result.reward.createdByExternalFamilyId
          ),
          title: translate('push.externalRewardRedeemedTitle', {
            name: result.member.name
          }),
          body: result.reward.title,
          privateBody:
            translate('push.externalRewardRedeemedPrivateBody'),
          url: '/?view=admin',
          tag: `external-reward-redeemed-${result.reward.id}-${Date.now()}`
        },
        {
          title: translate('push.externalRewardRedeemedGotifyTitle'),
          message: `${result.member.name}: ${result.reward.title}`,
          priority: 4
        }
      );
    }
    publishFamilyChange(req.session.familyId, 'rewards');
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
        error: translate('errors.familyProfileRequired')
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

  app.get('/api/native-push/status', requireAuth, (req, res) => {
    res.setHeader('Cache-Control', 'private, no-store');
    if (!req.session.memberId) {
      return res.status(403).json({
        success: false,
        error: translate('errors.familyProfileRequired')
      });
    }
    const installationId = cleanText(
      req.query?.installationId,
      '',
      120
    );
    const devices = listNativePushDevices(req.session.familyId, {
      memberId: req.session.memberId
    });
    const currentDevice = installationId
      ? devices.find(device => device.installationId === installationId)
      : null;
    res.json({
      success: true,
      server: publicFirebasePushStatus(),
      defaults: { ...DEFAULT_WEB_PUSH_PREFERENCES },
      currentDeviceId: currentDevice?.id || '',
      devices: devices.map(publicNativePushDevice)
    });
  });

  app.post('/api/native-push/devices', requireAuth, (req, res) => {
    if (!req.session.memberId) {
      return res.status(403).json({
        success: false,
        error: translate('errors.familyProfileRequired')
      });
    }
    const firebaseStatus = publicFirebasePushStatus();
    if (!firebaseStatus.configured) {
      return res.status(503).json({
        success: false,
        error:
          translate('errors.nativePushNotConfigured'),
        server: firebaseStatus
      });
    }
    const input = ensureObject(req.body);
    const installationId = requireText(
      input.installationId,
      translate('fields.installationId'),
      120
    );
    if (!/^[a-z0-9][a-z0-9._:-]{15,119}$/i.test(installationId)) {
      return res.status(400).json({
        success: false,
        error: translate('errors.installationIdInvalid')
      });
    }
    const token = requireText(input.token, translate('fields.firebaseToken'), 4096);
    if (token.length < 20 || /\s/.test(token)) {
      return res.status(400).json({
        success: false,
        error: translate('errors.firebaseTokenInvalid')
      });
    }
    const existing = listNativePushDevices(req.session.familyId, {
      memberId: req.session.memberId,
      installationId
    })[0];
    const saved = saveNativePushDevice({
      familyId: req.session.familyId,
      memberId: req.session.memberId,
      installationId,
      token,
      platform: 'android',
      deviceName: cleanText(input.deviceName, translate('labels.androidDevice'), 100),
      appVersion: cleanText(input.appVersion, APP_VERSION, 30),
      preferences: normalizePushPreferences(
        Object.hasOwn(input, 'preferences')
          ? input.preferences
          : existing?.preferences
      )
    });
    res.status(existing ? 200 : 201).json({
      success: true,
      device: publicNativePushDevice(saved)
    });
  });

  app.delete('/api/native-push/devices', requireAuth, (req, res) => {
    if (!req.session.memberId) {
      return res.status(403).json({
        success: false,
        error: translate('errors.familyProfileRequired')
      });
    }
    const installationId = requireText(
      req.body?.installationId,
      translate('fields.installationId'),
      120
    );
    deleteNativePushDevice(
      req.session.familyId,
      req.session.memberId,
      installationId
    );
    res.json({
      success: true,
      unregisterApp:
        countNativePushProfilesForInstallation(
          req.session.familyId,
          installationId
        ) === 0
    });
  });

  app.post('/api/native-push/test', requireAuth, async (req, res) => {
    if (!req.session.memberId) {
      return res.status(403).json({
        success: false,
        error: translate('errors.familyProfileRequired')
      });
    }
    if (!publicFirebasePushStatus().configured) {
      return res.status(503).json({
        success: false,
        error:
          translate('errors.nativePushNotConfigured')
      });
    }
    const installationId = requireText(
      req.body?.installationId,
      translate('fields.installationId'),
      120
    );
    const device = listNativePushDevices(req.session.familyId, {
      memberId: req.session.memberId,
      installationId
    })[0];
    if (!device) {
      return res.status(409).json({
        success: false,
        error: translate('errors.appNotRegistered')
      });
    }
    const member = getMember(req.session.familyId, req.session.memberId);
    await sendFirebaseNotification({
      token: device.token,
      title: translate('push.testGreeting', { name: member?.name || '' }),
      body: translate('push.nativeTestBody'),
      tag: `native-push-test-${device.id}`,
      priority: 'high',
      ttl: 300,
      data: {
        url: '/?view=dashboard',
        eventKey: 'test',
        tag: `native-push-test-${device.id}`,
        memberId: device.memberId,
        timestamp: Date.now()
      }
    });
    res.json({ success: true, sent: 1 });
  });

  app.post('/api/push/subscriptions', requireAuth, (req, res) => {
    if (!req.session.memberId) {
      return res.status(403).json({
        success: false,
        error: translate('errors.familyProfileRequired')
      });
    }
    const input = ensureObject(req.body);
    const subscriptionInput = ensureObject(
      input.subscription,
      translate('errors.browserSubscriptionMissing')
    );
    const endpoint = requireText(
      subscriptionInput.endpoint,
      translate('fields.pushEndpoint'),
      4000
    );
    let endpointUrl;
    try {
      endpointUrl = new URL(endpoint);
    } catch {
      return res.status(400).json({
        success: false,
        error: translate('errors.pushEndpointInvalid')
      });
    }
    if (endpointUrl.protocol !== 'https:') {
      return res.status(400).json({
        success: false,
        error: translate('errors.pushEndpointHttpsRequired')
      });
    }
    const keys = ensureObject(
      subscriptionInput.keys,
      translate('errors.browserKeysMissing')
    );
    const saved = savePushSubscription({
      familyId: req.session.familyId,
      memberId: req.session.memberId,
      endpoint,
      keys: {
        p256dh: requireText(keys.p256dh, translate('fields.browserKey'), 1000),
        auth: requireText(keys.auth, translate('fields.browserAuthKey'), 1000)
      },
      deviceName: cleanText(input.deviceName, translate('labels.thisDevice'), 100),
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
        error: translate('errors.familyProfileRequired')
      });
    }
    const endpoint = requireText(req.body?.endpoint, translate('fields.pushEndpoint'), 4000);
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
        error: translate('errors.familyProfileRequired')
      });
    }
    const member = getMember(req.session.familyId, req.session.memberId);
    const result = await sendWebPushEvent(req.session.familyId, null, {
      recipientMemberIds: [req.session.memberId],
      title: translate('push.testGreeting', { name: member?.name || '' }),
      body: translate('push.webTestBody'),
      privateTitle: 'LX Family Planner',
      privateBody: translate('push.testPrivateBody'),
      url: '/?view=dashboard',
      tag: `push-test-${req.session.memberId}`,
      ttl: 300
    });
    if (!result.sent) {
      return res.status(409).json({
        success: false,
        error: translate('errors.noReachableDevice')
      });
    }
    res.json({ success: true, ...result });
  });

  app.get('/api/push/devices', requireAuth, requireAdult, (req, res) => {
    const membersById = new Map(
      getMembers(req.session.familyId).map(member => [member.id, member])
    );
    const browserDevices = listPushSubscriptions(req.session.familyId).map(
      subscription => ({
        ...publicPushDevice(subscription),
        memberName:
          membersById.get(subscription.memberId)?.name || translate('labels.familyProfile')
      })
    );
    const nativeDevices = listNativePushDevices(req.session.familyId).map(
      device => ({
        ...publicNativePushDevice(device),
        memberName:
          membersById.get(device.memberId)?.name || translate('labels.familyProfile')
      })
    );
    const devices = [...nativeDevices, ...browserDevices].sort(
      (left, right) => right.updatedAt - left.updatedAt
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
      ) || deleteNativePushDeviceById(
        req.session.familyId,
        req.params.deviceId
      );
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: translate('errors.deviceNotFound')
        });
      }
      res.json({ success: true });
    }
  );

  app.get('/api/integrations', requireAuth, (req, res) => {
    const member = req.session.memberId
      ? getMember(req.session.familyId, req.session.memberId)
      : null;
    res.json({
      success: true,
      integrations: integrationStatus(req.session.familyId, member)
    });
  });

  app.post(
    '/api/integrations/nextcloud/bundled-setup',
    requireAuth,
    requireAdult,
    async (req, res) => {
      const existing = getIntegration(
        req.session.familyId,
        'nextcloud'
      );
      await provisionBundledNextcloudForFamily(
        req.session.familyId,
        {
          replace: true,
          publicBaseUrl: req.body?.publicBaseUrl,
          folder: req.body?.folder,
          includeGrandparents: req.body?.includeGrandparents,
          backupHour: req.body?.backupHour
        }
      );
      const syncStats = await performNextcloudSync(
        req.session.familyId
      );
      publishFamilyChange(req.session.familyId, 'nextcloud');
      res.status(existing ? 200 : 201).json({
        success: true,
        integration: integrationStatus(
          req.session.familyId,
          req.activeMember
        ).nextcloud,
        syncStats,
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.get(
    '/api/integrations/nextcloud/access',
    requireAuth,
    requireAdult,
    (req, res) => {
      const integration = getIntegration(
        req.session.familyId,
        'nextcloud'
      );
      if (!integration?.config?.bundled) {
        return res.status(404).json({
          success: false,
          error:
            translate('errors.nextcloudSelfManaged')
        });
      }
      const secret = decryptJson(integration.secretEncrypted);
      if (!secret.username || !secret.loginPassword) {
        return res.status(409).json({
          success: false,
          error:
            translate('errors.nextcloudLegacyNoWebAccess')
        });
      }
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        success: true,
        access: {
          username: secret.username,
          password: secret.loginPassword,
          url:
            bundledNextcloudPublicUrl() ||
            integration.config.publicBaseUrl ||
            integration.config.baseUrl
        }
      });
    }
  );

  app.get(
    '/api/integrations/nextcloud/files',
    requireAuth,
    requireAdult,
    async (req, res) => {
      const workspace = await cloudWorkspaceForFamily(req.session.familyId);
      const currentPath = publicFamilyCloudPath(req.query.path);
      const [entries, account] = await Promise.all([
        listNextcloudFiles(
          workspace.connection,
          workspace.userId,
          workspace.folder,
          currentPath
        ),
        fetchNextcloudAccount(workspace.connection)
      ]);
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        success: true,
        path: currentPath,
        folder: workspace.folder,
        storage: account.storage,
        entries: entries.filter(entry => !entry.name.startsWith('.LX-'))
      });
    }
  );

  app.get(
    '/api/integrations/nextcloud/folders',
    requireAuth,
    requireAdult,
    async (req, res) => {
      const workspace = await cloudWorkspaceForFamily(req.session.familyId);
      const folders = await listFamilyCloudFolders(workspace);
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        success: true,
        folders
      });
    }
  );

  app.get(
    '/api/integrations/nextcloud/files/content',
    requireAuth,
    requireAdult,
    async (req, res) => {
      const workspace = await cloudWorkspaceForFamily(req.session.familyId);
      const file = await downloadNextcloudFile(
        workspace.connection,
        workspace.userId,
        workspace.folder,
        publicFamilyCloudPath(req.query.path)
      );
      const disposition =
        req.query.inline === 'true' ? 'inline' : 'attachment';
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('Content-Type', file.contentType);
      res.setHeader('Content-Length', String(file.content.length));
      res.setHeader(
        'Content-Disposition',
        `${disposition}; filename*=UTF-8''${encodeURIComponent(file.fileName)}`
      );
      if (file.etag) res.setHeader('ETag', file.etag);
      res.end(file.content);
    }
  );

  app.post(
    '/api/integrations/nextcloud/files/folder',
    requireAuth,
    requireAdult,
    async (req, res) => {
      const workspace = await cloudWorkspaceForFamily(req.session.familyId);
      const entry = await createNextcloudFolder(
        workspace.connection,
        workspace.userId,
        workspace.folder,
        publicFamilyCloudPath(req.body?.path),
        requireText(req.body?.name, translate('fields.folderName'), 240)
      );
      res.status(201).json({ success: true, entry });
    }
  );

  app.put(
    '/api/integrations/nextcloud/files/file',
    requireAuth,
    requireAdult,
    express.raw({
      type: 'application/octet-stream',
      limit: '100mb'
    }),
    async (req, res) => {
      const workspace = await cloudWorkspaceForFamily(req.session.familyId);
      const targetPath = publicFamilyCloudPath(req.query.path);
      if (!targetPath) {
        return res.status(400).json({
          success: false,
          error:
            translate('errors.folderRequired')
        });
      }
      let fileName = cleanText(
        req.headers['x-lx-file-name'],
        '',
        1000
      );
      try {
        fileName = decodeURIComponent(fileName);
      } catch {
        // An already decoded ASCII file name remains usable.
      }
      if (!fileName) {
        return res.status(400).json({
          success: false,
          error: translate('errors.fileNameMissing')
        });
      }
      const content = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(req.body || '');
      if (!content.length) {
        return res.status(400).json({
          success: false,
          error: translate('errors.fileEmpty')
        });
      }
      const uploaded = await uploadNextcloudUserFile(
        workspace.connection,
        workspace.userId,
        workspace.folder,
        targetPath,
        fileName,
        content,
        cleanText(
          req.headers['x-lx-file-type'],
          'application/octet-stream',
          200
        )
      );
      res.status(201).json({
        success: true,
        file: uploaded
      });
    }
  );

  app.delete(
    '/api/integrations/nextcloud/files/entry',
    requireAuth,
    requireAdult,
    async (req, res) => {
      const workspace = await cloudWorkspaceForFamily(req.session.familyId);
      await deleteNextcloudEntry(
        workspace.connection,
        workspace.userId,
        workspace.folder,
        publicFamilyCloudPath(req.query.path)
      );
      res.json({ success: true });
    }
  );

  app.post(
    '/api/integrations/nextcloud/setup',
    requireAuth,
    requireAdult,
    async (req, res) => {
      const baseUrl = normalizeNextcloudBaseUrl(
        req.body?.baseUrl,
        translate('fields.internalNextcloudAddress')
      );
      const publicBaseUrl = normalizeNextcloudBaseUrl(
        req.body?.publicBaseUrl || baseUrl,
        translate('fields.nextcloudBrowserAddress')
      );
      const username = requireText(
        req.body?.username,
        translate('fields.nextcloudUser'),
        300
      );
      const appPassword = requireText(
        req.body?.appPassword,
        translate('fields.nextcloudAppPassword'),
        1000
      );
      const folder = normalizeNextcloudFolder(
        req.body?.folder || 'LX Family'
      );
      const connection = {
        baseUrl,
        username,
        appPassword,
        appVersion: APP_VERSION
      };
      let inspection = await inspectNextcloud(connection);
      if (
        !inspection.calendars.some(calendar =>
          calendar.components.includes('VEVENT')
        )
      ) {
        await ensureNextcloudCalendar(
          connection,
          inspection.userId,
          'LX Family'
        );
        inspection = await inspectNextcloud(connection);
      }
      await ensureNextcloudFolder(
        connection,
        inspection.userId,
        folder
      );
      const eventCalendars = inspection.calendars.filter(calendar =>
        calendar.components.includes('VEVENT')
      );
      const requestedCalendar = cleanText(
        req.body?.eventCalendarHref,
        '',
        2000
      );
      const eventCalendarHref = eventCalendars.some(
        calendar => calendar.href === requestedCalendar
      )
        ? requestedCalendar
        : eventCalendars[0]?.href || '';
      const requestedMemberId = cleanText(
        req.body?.defaultMemberId,
        'all',
        100
      );
      const defaultMemberId =
        requestedMemberId === 'all' ||
        Boolean(getMember(req.session.familyId, requestedMemberId))
          ? requestedMemberId
          : 'all';
      const existing = getIntegration(
        req.session.familyId,
        'nextcloud'
      );
      const config = {
        ...(existing?.config || {}),
        enabled: true,
        bundled: false,
        baseUrl,
        publicBaseUrl,
        host: new URL(publicBaseUrl).host,
        userId: inspection.userId,
        displayName: inspection.displayName,
        nextcloudVersion: inspection.version,
        calendars: inspection.calendars,
        eventCalendarHref,
        eventSyncEnabled:
          Boolean(eventCalendarHref) &&
          req.body?.eventSyncEnabled !== false,
        defaultMemberId,
        includeGrandparents: Boolean(req.body?.includeGrandparents),
        folder,
        backupEnabled: req.body?.backupEnabled !== false,
        backupHour: Math.max(
          0,
          Math.min(23, Number(req.body?.backupHour ?? 3))
        ),
        lastSyncError: '',
        lastBackupError: ''
      };
      saveIntegration(
        req.session.familyId,
        'nextcloud',
        config,
        encryptJson({ username, appPassword })
      );
      let syncStats = null;
      if (config.eventSyncEnabled && req.body?.syncNow !== false) {
        syncStats = await performNextcloudSync(req.session.familyId);
      }
      await cloudWorkspaceForFamily(req.session.familyId);
      await app.locals.migrateLegacyChatPhotosForFamily(
        req.session.familyId
      );
      publishFamilyChange(req.session.familyId, 'nextcloud');
      res.status(existing ? 200 : 201).json({
        success: true,
        integration: integrationStatus(
          req.session.familyId,
          req.activeMember
        ).nextcloud,
        syncStats,
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.patch(
    '/api/integrations/nextcloud',
    requireAuth,
    requireAdult,
    async (req, res) => {
      const integration = getIntegration(
        req.session.familyId,
        'nextcloud'
      );
      if (!integration) {
        return res.status(404).json({
          success: false,
          error: translate('errors.nextcloudNotConnected')
        });
      }
      const calendars = Array.isArray(integration.config.calendars)
        ? integration.config.calendars
        : [];
      const requestedCalendar = Object.hasOwn(
        req.body || {},
        'eventCalendarHref'
      )
        ? cleanText(req.body.eventCalendarHref, '', 2000)
        : integration.config.eventCalendarHref;
      if (
        requestedCalendar &&
        !calendars.some(
          calendar =>
            calendar.href === requestedCalendar &&
            calendar.components?.includes('VEVENT')
        )
      ) {
        return res.status(400).json({
          success: false,
          error: translate('errors.nextcloudCalendarUnavailable')
        });
      }
      const requestedMemberId = Object.hasOwn(
        req.body || {},
        'defaultMemberId'
      )
        ? cleanText(req.body.defaultMemberId, 'all', 100)
        : integration.config.defaultMemberId || 'all';
      if (
        requestedMemberId !== 'all' &&
        !getMember(req.session.familyId, requestedMemberId)
      ) {
        return res.status(400).json({
          success: false,
          error: translate('errors.defaultProfileNotFound')
        });
      }
      const folder = Object.hasOwn(req.body || {}, 'folder')
        ? normalizeNextcloudFolder(req.body.folder)
        : integration.config.folder || 'LX Family';
      const publicBaseUrl = Object.hasOwn(
        req.body || {},
        'publicBaseUrl'
      )
        ? normalizeNextcloudBaseUrl(
            req.body.publicBaseUrl,
            translate('fields.nextcloudBrowserAddress')
          )
        : integration.config.publicBaseUrl;
      const config = {
        ...integration.config,
        enabled: Object.hasOwn(req.body || {}, 'enabled')
          ? Boolean(req.body.enabled)
          : integration.config.enabled !== false,
        publicBaseUrl,
        host: new URL(publicBaseUrl).host,
        eventCalendarHref: requestedCalendar,
        eventSyncEnabled: Object.hasOwn(
          req.body || {},
          'eventSyncEnabled'
        )
          ? Boolean(req.body.eventSyncEnabled && requestedCalendar)
          : integration.config.eventSyncEnabled !== false,
        defaultMemberId: requestedMemberId,
        includeGrandparents: Object.hasOwn(
          req.body || {},
          'includeGrandparents'
        )
          ? Boolean(req.body.includeGrandparents)
          : Boolean(integration.config.includeGrandparents),
        folder,
        backupEnabled: Object.hasOwn(req.body || {}, 'backupEnabled')
          ? Boolean(req.body.backupEnabled)
          : Boolean(integration.config.backupEnabled),
        backupHour: Object.hasOwn(req.body || {}, 'backupHour')
          ? Math.max(0, Math.min(23, Number(req.body.backupHour)))
          : Number(integration.config.backupHour ?? 3)
      };
      await ensureNextcloudFolder(
        nextcloudConnection(integration),
        integration.config.userId,
        folder
      );
      saveIntegration(
        req.session.familyId,
        'nextcloud',
        config,
        integration.secretEncrypted
      );
      publishFamilyChange(req.session.familyId, 'nextcloud');
      res.json({
        success: true,
        integration: integrationStatus(
          req.session.familyId,
          req.activeMember
        ).nextcloud,
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.post(
    '/api/integrations/nextcloud/test',
    requireAuth,
    requireAdult,
    async (req, res) => {
      const integration = getIntegration(
        req.session.familyId,
        'nextcloud'
      );
      if (!integration) {
        return res.status(404).json({
          success: false,
          error: translate('errors.nextcloudNotConnected')
        });
      }
      const inspection = await inspectNextcloud(
        nextcloudConnection(integration)
      );
      await ensureNextcloudFolder(
        nextcloudConnection(integration),
        inspection.userId,
        integration.config.folder || 'LX Family'
      );
      const availableHrefs = new Set(
        inspection.calendars.map(calendar => calendar.href)
      );
      saveIntegration(
        req.session.familyId,
        'nextcloud',
        {
          ...integration.config,
          userId: inspection.userId,
          displayName: inspection.displayName,
          nextcloudVersion: inspection.version,
          calendars: inspection.calendars,
          eventCalendarHref: availableHrefs.has(
            integration.config.eventCalendarHref
          )
            ? integration.config.eventCalendarHref
            : inspection.calendars.find(
                calendar => calendar.components.includes('VEVENT')
              )?.href || '',
          lastSyncError: '',
          lastBackupError: ''
        },
        integration.secretEncrypted
      );
      res.json({
        success: true,
        message:
          translate('messages.nextcloudTest', {
            version: inspection.version,
            count: inspection.calendars.length
          }),
        integration: integrationStatus(
          req.session.familyId,
          req.activeMember
        ).nextcloud,
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.post(
    '/api/integrations/nextcloud/sync',
    requireAuth,
    requireAdult,
    async (req, res) => {
      if (!getIntegration(req.session.familyId, 'nextcloud')) {
        return res.status(404).json({
          success: false,
          error: translate('errors.nextcloudNotConnected')
        });
      }
      const stats = await performNextcloudSync(req.session.familyId);
      publishFamilyChange(req.session.familyId, 'events');
      res.json({
        success: true,
        stats,
        integration: integrationStatus(
          req.session.familyId,
          req.activeMember
        ).nextcloud,
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.post(
    '/api/integrations/nextcloud/backup',
    requireAuth,
    requireAdult,
    async (req, res) => {
      if (!getIntegration(req.session.familyId, 'nextcloud')) {
        return res.status(404).json({
          success: false,
          error: translate('errors.nextcloudNotConnected')
        });
      }
      const backup = await performNextcloudBackup(
        req.session.familyId
      );
      publishFamilyChange(req.session.familyId, 'nextcloud-backup');
      res.json({
        success: true,
        backup,
        integration: integrationStatus(
          req.session.familyId,
          req.activeMember
        ).nextcloud,
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.delete(
    '/api/integrations/nextcloud',
    requireAuth,
    requireAdult,
    async (req, res) => {
      const integration = getIntegration(
        req.session.familyId,
        'nextcloud'
      );
      if (integration) {
        await revokeNextcloudAppPassword(
          nextcloudConnection(integration)
        );
      }
      deleteIntegration(req.session.familyId, 'nextcloud');
      setAppMeta(
        nextcloudAutoProvisionMetaKey(req.session.familyId),
        'true'
      );
      publishFamilyChange(req.session.familyId, 'nextcloud');
      res.json({
        success: true,
        integration: {
          connected: false,
          enabled: false,
          eventSyncEnabled: false,
          backupEnabled: false
        },
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.post(
    '/api/integrations/gotify/setup',
    requireAuth,
    requireAdult,
    async (req, res) => {
      if (getIntegration(req.session.familyId, 'gotify')) {
        return res.status(409).json({
          success: false,
          error: translate('errors.gotifyAlreadyConfigured')
        });
      }
      const baseUrl = normalizeGotifyBaseUrl(req.body?.baseUrl);
      const username = requireText(req.body?.username, translate('fields.gotifyUser'), 160);
      const password = requireText(
        req.body?.password,
        translate('fields.gotifyPassword'),
        300
      );
      const plannerUrl = normalizePlannerUrl(req.body?.plannerUrl);
      const rules = gotifyRules(req.body?.rules);

      const versionResponse = await gotifyFetch(baseUrl, '/version');
      if (!versionResponse.ok) {
        return res.status(502).json({
          success: false,
          error: translate('errors.gotifyServerNotResponding')
        });
      }

      const family = getFamily(req.session.familyId);
      const applicationName = `LX Family Planner · ${family.familyName}`;
      const form = new FormData();
      form.set('name', applicationName);
      form.set(
        'description',
        translate('messages.gotifyAppDescription')
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
              ? translate('errors.gotifyCredentialsIncorrect')
              : translate('errors.gotifyAppCreateFailed')
        });
      }
      const application = await applicationResponse.json();
      const token = cleanText(application.token, '', 500);
      if (!token) {
        return res.status(502).json({
          success: false,
          error: translate('errors.gotifyNoToken')
        });
      }

      await postGotifyMessage(
        baseUrl,
        token,
        {
          title: translate('push.gotifyConnectedTitle'),
          message:
            translate('push.gotifyConnectedMessage'),
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
          error: translate('errors.gotifyNotConnected')
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
          error: translate('errors.gotifyNotConnected')
        });
      }
      await sendGotifyNotification(req.session.familyId, null, {
        title: translate('push.gotifyTestTitle'),
        message: translate('push.gotifyTestMessage', {
          name: req.activeMember.name
        }),
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

  app.post(
    '/api/integrations/home-assistant/setup',
    requireAuth,
    requireAdult,
    async (req, res) => {
      const baseUrl = normalizeHomeAssistantBaseUrl(req.body?.baseUrl);
      const token = requireText(
        req.body?.token,
        translate('fields.accessToken'),
        4000
      );
      const existing = getIntegration(
        req.session.familyId,
        'home-assistant'
      );
      const candidate = {
        config: { baseUrl },
        secretEncrypted: encryptJson({ token })
      };
      await homeAssistantFetch(candidate, '/api/');
      const entities = await fetchHomeAssistantEntities(candidate);
      saveIntegration(
        req.session.familyId,
        'home-assistant',
        {
          baseUrl,
          host: new URL(baseUrl).host,
          enabled: true,
          selectedEntities:
            existing?.config?.baseUrl === baseUrl
              ? normalizeHomeAssistantEntities(
                  existing.config.selectedEntities
                )
              : [],
          lastValidatedAt: Date.now()
        },
        candidate.secretEncrypted
      );
      stopHomeAssistantSocket(req.session.familyId);
      ensureHomeAssistantSocket(req.session.familyId);
      res.status(existing ? 200 : 201).json({
        success: true,
        integration:
          integrationStatus(req.session.familyId).homeAssistant,
        entities,
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.get(
    '/api/integrations/home-assistant/entities',
    requireAuth,
    requireAdult,
    async (req, res) => {
      const integration = getIntegration(
        req.session.familyId,
        'home-assistant'
      );
      if (!integration) {
        return res.status(404).json({
          success: false,
          error: translate('errors.homeAssistantNotConnected')
        });
      }
      const entities = await fetchHomeAssistantEntities(integration);
      res.json({ success: true, entities });
    }
  );

  app.patch(
    '/api/integrations/home-assistant',
    requireAuth,
    requireAdult,
    async (req, res) => {
      const integration = getIntegration(
        req.session.familyId,
        'home-assistant'
      );
      if (!integration) {
        return res.status(404).json({
          success: false,
          error: translate('errors.homeAssistantNotConnected')
        });
      }
      const allMembers = new Set(
        getMembers(req.session.familyId).map(member => member.id)
      );
      let selectedEntities = normalizeHomeAssistantEntities(
        Object.hasOwn(req.body || {}, 'selectedEntities')
          ? req.body.selectedEntities
          : integration.config.selectedEntities
      ).map(entity => ({
        ...entity,
        profileIds: entity.profileIds.filter(id => allMembers.has(id))
      }));
      if (Object.hasOwn(req.body || {}, 'selectedEntities')) {
        const available = new Set(
          (await fetchHomeAssistantEntities(integration))
            .map(entity => entity.entityId)
        );
        selectedEntities = selectedEntities.filter(entity =>
          available.has(entity.entityId)
        );
      }
      saveIntegration(
        req.session.familyId,
        'home-assistant',
        {
          ...integration.config,
          enabled: Object.hasOwn(req.body || {}, 'enabled')
            ? Boolean(req.body.enabled)
            : integration.config.enabled !== false,
          selectedEntities
        },
        integration.secretEncrypted
      );
      stopHomeAssistantSocket(req.session.familyId);
      ensureHomeAssistantSocket(req.session.familyId);
      publishFamilyChange(req.session.familyId, 'home-assistant');
      res.json({
        success: true,
        integration:
          integrationStatus(req.session.familyId).homeAssistant,
        version: getFamilyVersion(req.session.familyId)
      });
    }
  );

  app.post(
    '/api/integrations/home-assistant/test',
    requireAuth,
    requireAdult,
    async (req, res) => {
      const integration = getIntegration(
        req.session.familyId,
        'home-assistant'
      );
      if (!integration) {
        return res.status(404).json({
          success: false,
          error: translate('errors.homeAssistantNotConnected')
        });
      }
      const entities = await fetchHomeAssistantEntities(integration);
      res.json({
        success: true,
        entityCount: entities.length,
        message: translate('messages.homeAssistantTest', { count: entities.length })
      });
    }
  );

  app.get(
    '/api/integrations/home-assistant/states',
    requireAuth,
    async (req, res) => {
      const member = req.session.memberId
        ? getMember(req.session.familyId, req.session.memberId)
        : null;
      if (!member || member.role === 'pet') {
        return res.json({ success: true, entities: [] });
      }
      const entities = await selectedHomeAssistantStates(
        req.session.familyId,
        member
      );
      ensureHomeAssistantSocket(req.session.familyId);
      res.set('Cache-Control', 'no-store');
      res.json({ success: true, entities, fetchedAt: Date.now() });
    }
  );

  app.post(
    '/api/integrations/home-assistant/actions',
    requireAuth,
    async (req, res) => {
      const member = req.session.memberId
        ? getMember(req.session.familyId, req.session.memberId)
        : null;
      if (!member || member.role === 'pet') {
        return res.status(403).json({
          success: false,
          error: translate('errors.homeControlNotAllowed')
        });
      }
      const integration = getIntegration(
        req.session.familyId,
        'home-assistant'
      );
      if (!integration || integration.config?.enabled === false) {
        return res.status(404).json({
          success: false,
          error: translate('errors.homeAssistantInactive')
        });
      }
      const entityId = requireText(req.body?.entityId, translate('fields.device'), 180);
      const action = requireText(req.body?.action, translate('fields.action'), 60);
      const config = normalizeHomeAssistantEntities(
        integration.config?.selectedEntities
      ).find(entity => entity.entityId === entityId);
      const domain = homeAssistantDomain(entityId);
      if (
        !config ||
        !config.allowControl ||
        !homeAssistantEntityVisibleTo(config, member) ||
        !HOME_ASSISTANT_CONTROL_ACTIONS[domain]?.has(action)
      ) {
        return res.status(403).json({
          success: false,
          error: translate('errors.actionNotAllowedByParents')
        });
      }
      const currentState = await homeAssistantFetch(
        integration,
        `/api/states/${encodeURIComponent(entityId)}`
      );
      const publicState = publicHomeAssistantEntity(currentState, config);
      if (publicState.requiresAdult && !isAdultMember(member)) {
        return res.status(403).json({
          success: false,
          error: translate('errors.garageAdultsOnly')
        });
      }
      const serviceData = { entity_id: entityId };
      if (action === 'set_temperature') {
        const temperature = Number(req.body?.temperature);
        if (!Number.isFinite(temperature) || temperature < 5 || temperature > 35) {
          return res.status(400).json({
            success: false,
            error: translate('errors.temperatureRange')
          });
        }
        serviceData.temperature = temperature;
      }
      await homeAssistantFetch(
        integration,
        `/api/services/${domain}/${action}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(serviceData)
        }
      );
      publishLiveEvent(req.session.familyId, 'home-assistant-update', {
        updatedAt: Date.now()
      });
      res.json({
        success: true,
        entities: await selectedHomeAssistantStates(
          req.session.familyId,
          member
        )
      });
    }
  );

  app.delete(
    '/api/integrations/home-assistant',
    requireAuth,
    requireAdult,
    (req, res) => {
      deleteIntegration(req.session.familyId, 'home-assistant');
      stopHomeAssistantSocket(req.session.familyId);
      publishFamilyChange(req.session.familyId, 'home-assistant');
      res.json({
        success: true,
        integration: {
          connected: false,
          enabled: false,
          selectedEntities: []
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
    const email = requireText(req.body?.email, translate('fields.email'), 180);
    const password = requireText(req.body?.password, translate('fields.password'), 300);
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
        error: translate('errors.bringNoLists')
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
      translate('fields.connection'),
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
        error: translate('errors.bringLoginExpired')
      });
    }
    const listUuid = requireText(req.body?.listUuid, translate('fields.list'), 180);
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
        error: translate('errors.bringItemCount')
      });
    }

    const seen = new Set();
    const items = requestedItems
      .map(item => ({
        name: requireText(item?.name, translate('fields.item'), 160),
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
    const name = requireText(req.body?.name, translate('fields.item'), 160);
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
    const rawUrl = requireText(req.body?.url, translate('fields.url'), 2000);
    const imported = await importRecipeFromUrl(rawUrl);
    res.json({
      success: true,
      ...imported
    });
  });

  app.use('/api/agent', (req, res, next) => {
    const configuredKey = process.env.AGENT_API_KEY;
    if (!configuredKey) {
      return res.status(503).json({
        success: false,
        error: translate('errors.agentApiDisabled')
      });
    }
    const suppliedKey = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!safeCompare(suppliedKey, configuredKey)) {
      return res.status(401).json({ success: false, error: translate('errors.unauthorized') });
    }
    const familyId = cleanText(
      req.headers['x-family-id'] || req.body?.familyId || req.query?.familyId,
      '',
      100
    );
    if (!familyId || !getFamily(familyId)) {
      return res.status(400).json({
        success: false,
        error: translate('errors.familyIdHeaderRequired')
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
      return res
        .status(404)
        .json({ success: false, error: translate('errors.unknownRecordType') });
    }
    const record = createRecord(
      req.agentFamilyId,
      req.params.type,
      sanitizeAgentRecord(req.params.type, req.body, req.agentFamilyId)
    );
    res.status(201).json({ success: true, record });
  });

  const serveApkFile = (_req, res) => {
    const release = availableApkRelease();
    if (!release) {
      return res
        .status(404)
        .send(translate('errors.apkNotAvailable'));
    }
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="LX-Family-Planner.apk"');
    res.setHeader('Cache-Control', 'private, no-store');
    res.sendFile(release.file);
  };

  app.get('/apk', serveApkFile);
  app.get('/app', serveApkFile);
  app.get('/apk/latest.apk', serveApkFile);
  app.get('/apk/LX-Family-Planner.apk', serveApkFile);
  app.get('/LX-Family-Planner.apk', serveApkFile);

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
    res.status(404).json({ success: false, error: translate('errors.routeNotFound') });
  });

  app.use((error, _req, res, _next) => {
    const status = Number(error.statusCode || error.status || 500);
    if (status >= 500) {
      console.error(error);
    }
    res.status(status).json({
      success: false,
      error:
        status === 413
          ? error.type === 'entity.too.large'
            ? translate('errors.payloadTooLarge')
            : error.message || translate('errors.importedPageTooLarge')
          : status >= 500
          ? translate('errors.internal')
          : error.message || translate('errors.requestFailed')
    });
  });

  return app;
}

export function startServer(port = Number(process.env.PORT || DEFAULT_PORT)) {
  const app = createApp();
  const server = app.listen(port, () => {
    if (!IS_PRODUCTION && APP_SECRET.includes('development-secret')) {
      console.warn(
        'Hinweis: Für Produktion APP_SECRET als sichere Umgebungsvariable setzen.'
      );
    }
    console.log(`LX Family Planner läuft auf http://localhost:${port}`);
  });
  const calendarSyncTimer = setInterval(() => {
    void syncAllCalendarSubscriptions();
  }, CALENDAR_SYNC_INTERVAL_MS);
  calendarSyncTimer.unref();
  const eventReminderTimer = setInterval(() => {
    void app.locals.runEventReminderSweep();
  }, EVENT_REMINDER_INTERVAL_MS);
  eventReminderTimer.unref();
  const nextcloudSyncTimer = setInterval(() => {
    void app.locals.runNextcloudSweep();
  }, NEXTCLOUD_SYNC_INTERVAL_MS);
  nextcloudSyncTimer.unref();
  const bundledCloudProvisioningTimer = setInterval(() => {
    void app.locals.runBundledCloudProvisioning();
  }, 10 * 60 * 1000);
  bundledCloudProvisioningTimer.unref();
  const legacyChatPhotoMigrationTimer = setInterval(() => {
    void app.locals.runLegacyChatPhotoMigration().catch(error => {
      console.warn(
        'Die regelmäßige Chatfoto-Cloudprüfung ist fehlgeschlagen:',
        error.message
      );
    });
  }, 15 * 60 * 1000);
  legacyChatPhotoMigrationTimer.unref();
  const dashboardCoverRefreshTimer = setInterval(() => {
    void app.locals.runDashboardCoverRefresh().catch(error => {
      console.warn(
        'Die regelmäßige Medien-Cover-Prüfung ist fehlgeschlagen:',
        error.message
      );
    });
  }, 12 * 60 * 60 * 1000);
  dashboardCoverRefreshTimer.unref();
  const initialCalendarSync = setTimeout(() => {
    void syncAllCalendarSubscriptions();
  }, 20_000);
  initialCalendarSync.unref();
  const initialEventReminderSweep = setTimeout(() => {
    void app.locals.runEventReminderSweep();
  }, 5_000);
  initialEventReminderSweep.unref();
  const initialNextcloudSweep = setTimeout(() => {
    void app.locals.runNextcloudSweep();
  }, 35_000);
  initialNextcloudSweep.unref();
  const initialBundledCloudProvisioning = setTimeout(() => {
    void app.locals.runBundledCloudProvisioning();
  }, 12_000);
  initialBundledCloudProvisioning.unref();
  const initialLegacyChatPhotoMigration = setTimeout(() => {
    void app.locals.runLegacyChatPhotoMigration().catch(error => {
      console.warn(
        'Vorhandene Chatfotos konnten nicht vollständig in die Cloud verschoben werden:',
        error.message
      );
    });
  }, 18_000);
  initialLegacyChatPhotoMigration.unref();
  const initialDashboardCoverRefresh = setTimeout(() => {
    void app.locals.runDashboardCoverRefresh().catch(error => {
      console.warn(
        'Vorhandene Medien-Widgets konnten nicht vollständig ergänzt werden:',
        error.message
      );
    });
  }, 25_000);
  initialDashboardCoverRefresh.unref();
  server.on('close', () => {
    clearInterval(calendarSyncTimer);
    clearInterval(eventReminderTimer);
    clearInterval(nextcloudSyncTimer);
    clearInterval(bundledCloudProvisioningTimer);
    clearInterval(legacyChatPhotoMigrationTimer);
    clearInterval(dashboardCoverRefreshTimer);
    clearTimeout(initialCalendarSync);
    clearTimeout(initialEventReminderSweep);
    clearTimeout(initialNextcloudSweep);
    clearTimeout(initialBundledCloudProvisioning);
    clearTimeout(initialLegacyChatPhotoMigration);
    clearTimeout(initialDashboardCoverRefresh);
    app.locals.stopHomeAssistantSockets?.();
    app.locals.stopNextcloudSyncDebounces?.();
  });
  return server;
}
