import { Capacitor, registerPlugin } from '@capacitor/core';
import { isCapacitorNative } from './apiConfig.js';

const LXShareReceiver = registerPlugin('LXShareReceiver');

export function hasNativeRecipeShareRequest(value = window.location.href) {
  try {
    return new URL(value).searchParams.get('nativeRecipeShare') === '1';
  } catch {
    return false;
  }
}

export async function readPendingNativeRecipeShare() {
  if (!isCapacitorNative()) return null;
  const pending = await LXShareReceiver.getPendingRecipeShare();
  if (!pending?.available) {
    return {
      available: false,
      errorCode: pending?.errorCode || 'missing_file'
    };
  }
  const source = Capacitor.convertFileSrc(pending.uri);
  const response = await fetch(source, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('shared_recipe_unavailable');
  }
  return {
    available: true,
    name: pending.name || 'recipes.rtk',
    mimeType: pending.mimeType || 'application/zip',
    size: Number(pending.size || 0),
    bytes: new Uint8Array(await response.arrayBuffer())
  };
}

export async function clearPendingNativeRecipeShare() {
  if (!isCapacitorNative()) return;
  await LXShareReceiver.clearPendingRecipeShare();
}

export function clearNativeRecipeShareRequest() {
  const url = new URL(window.location.href);
  url.searchParams.delete('nativeRecipeShare');
  url.searchParams.delete('view');
  window.history.replaceState(
    {},
    '',
    `${url.pathname}${url.search}${url.hash}`
  );
}
