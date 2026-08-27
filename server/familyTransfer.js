import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync
} from 'node:crypto';

export const FAMILY_TRANSFER_FORMAT = 'lx-family-transfer';
export const FAMILY_TRANSFER_VERSION = 1;
export const FAMILY_TRANSFER_MAX_BYTES = 15 * 1024 * 1024;

function transferError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function transferKey(passphrase, salt) {
  const value = String(passphrase || '');
  if (value.length < 12) {
    throw transferError('Das Umzugskennwort muss mindestens 12 Zeichen lang sein.');
  }
  return scryptSync(value, salt, 32);
}

export function encryptFamilyTransfer(payload, passphrase) {
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  if (plaintext.length > FAMILY_TRANSFER_MAX_BYTES) {
    throw transferError('Die Familienumzugsdatei ist zu groß. Medien bleiben in eurer Cloud und werden nicht mit exportiert.');
  }
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', transferKey(passphrase, salt), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return {
    format: FAMILY_TRANSFER_FORMAT,
    version: FAMILY_TRANSFER_VERSION,
    encryption: 'aes-256-gcm+scrypt',
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    data: encrypted.toString('base64'),
    tag: cipher.getAuthTag().toString('base64')
  };
}

export function decryptFamilyTransfer(bundle, passphrase) {
  if (
    !bundle ||
    bundle.format !== FAMILY_TRANSFER_FORMAT ||
    Number(bundle.version) !== FAMILY_TRANSFER_VERSION ||
    bundle.encryption !== 'aes-256-gcm+scrypt'
  ) {
    throw transferError('Das ist keine gültige LX-Familienumzugsdatei.');
  }
  try {
    const salt = Buffer.from(String(bundle.salt || ''), 'base64');
    const iv = Buffer.from(String(bundle.iv || ''), 'base64');
    const encrypted = Buffer.from(String(bundle.data || ''), 'base64');
    const tag = Buffer.from(String(bundle.tag || ''), 'base64');
    if (salt.length !== 16 || iv.length !== 12 || tag.length !== 16) {
      throw new Error('Ungültige Verschlüsselungsdaten');
    }
    if (!encrypted.length || encrypted.length > FAMILY_TRANSFER_MAX_BYTES) {
      throw new Error('Ungültige Dateigröße');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      transferKey(passphrase, salt),
      iv
    );
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    const payload = JSON.parse(plaintext.toString('utf8'));
    if (!payload || payload.format !== FAMILY_TRANSFER_FORMAT) {
      throw new Error('Ungültiger Inhalt');
    }
    return payload;
  } catch (error) {
    if (error?.statusCode) throw error;
    throw transferError('Das Umzugskennwort ist falsch oder die Datei wurde verändert.');
  }
}
