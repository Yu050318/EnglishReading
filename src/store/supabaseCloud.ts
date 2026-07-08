import { createClient } from '@supabase/supabase-js';
import { createCloudSync, getCloudConfig, type CloudClient } from './cloudSync';
import { PREFIX, type StorageLike } from './store';

const DEVICE_ID_KEY = `${PREFIX}deviceId`;
const DEVICE_SECRET_KEY = `${PREFIX}deviceSecret`;

export function getOrCreateDeviceId(storage: StorageLike): string {
  const existing = storage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;
  const id =
    globalThis.crypto?.randomUUID?.() ??
    `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  storage.setItem(DEVICE_ID_KEY, id);
  return id;
}

export function getOrCreateDeviceSecret(storage: StorageLike): string {
  const existing = storage.getItem(DEVICE_SECRET_KEY);
  if (existing) return existing;
  const bytes = new Uint8Array(24);
  globalThis.crypto?.getRandomValues?.(bytes);
  const secret =
    bytes.some(Boolean) ? Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('') : `${Date.now()}-${Math.random()}-${Math.random()}`;
  storage.setItem(DEVICE_SECRET_KEY, secret);
  return secret;
}

export function createConfiguredCloudSync(env: Record<string, string | undefined>, storage: StorageLike | null) {
  const config = getCloudConfig(env);
  if (!config || !storage) return null;
  const client = createClient(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      storageKey: `${PREFIX}supabase-auth`,
    },
  });
  return createCloudSync(client as unknown as CloudClient, () => ({
    deviceId: getOrCreateDeviceId(storage),
    deviceSecret: getOrCreateDeviceSecret(storage),
  }));
}
