export function normalizeNtfyTopic(value) {
  const topic = String(value || '').trim();
  return /^[-_A-Za-z0-9]{1,64}$/.test(topic) ? topic : '';
}

export function ntfyPriority(value) {
  const priority = Number(value || 4);
  if (priority >= 8) return 5;
  if (priority >= 5) return 4;
  if (priority <= 0) return 2;
  return 3;
}

export function ntfyMessageBody(config, payload) {
  return {
    topic: normalizeNtfyTopic(config?.topic),
    title: String(payload?.title || PRODUCT_NAME).slice(0, 140),
    message: String(payload?.message || 'Neue Familiennachricht').slice(0, 3000),
    priority: ntfyPriority(payload?.priority),
    ...(config?.plannerUrl ? { click: String(config.plannerUrl) } : {})
  };
}
import { PRODUCT_NAME } from '../shared/brand.js';
