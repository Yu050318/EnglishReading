import { describe, expect, it, vi } from 'vitest';
import { emptyState, type State } from './store';
import {
  createCloudSync,
  getCloudConfig,
  mergeStates,
  type CloudClient,
} from './cloudSync';
import { getOrCreateDeviceId, getOrCreateDeviceSecret } from './supabaseCloud';

const stateWithProgress = (id: string, attempts: number, correct: number, at: string): State => ({
  ...emptyState(),
  progress: { [id]: { attempts, correct, lastAnsweredAt: at } },
});

describe('cloud sync', () => {
  it('returns no config when Supabase env values are missing', () => {
    expect(getCloudConfig({})).toBeNull();
  });

  it('reads Supabase config from Vite env values', () => {
    expect(
      getCloudConfig({
        VITE_SUPABASE_URL: 'https://example.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'sb_publishable_test',
      }),
    ).toEqual({
      url: 'https://example.supabase.co',
      anonKey: 'sb_publishable_test',
    });
  });

  it('merges local and remote study state without losing progress', () => {
    const local = stateWithProgress('a', 2, 1, '2026-01-02T00:00:00.000Z');
    const remote = {
      ...stateWithProgress('a', 1, 1, '2026-01-01T00:00:00.000Z'),
      favoriteIds: ['remote'],
      mistakeIds: ['a'],
    };

    const merged = mergeStates(local, remote);

    expect(merged.progress.a).toEqual(local.progress.a);
    expect(merged.favoriteIds).toEqual(['remote']);
    expect(merged.mistakeIds).toEqual(['a']);
  });

  it('loads and saves through device-secret RPC calls', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    const client: CloudClient = {
      rpc,
    };
    const sync = createCloudSync(client, () => ({ deviceId: 'device-1', deviceSecret: 'secret-value-that-is-long' }));

    await expect(sync.load()).resolves.toBeNull();
    await sync.save(emptyState());

    expect(rpc).toHaveBeenNthCalledWith(1, 'load_study_state', {
      p_device_id: 'device-1',
      p_device_secret: 'secret-value-that-is-long',
    });
    expect(rpc).toHaveBeenNthCalledWith(2, 'save_study_state', {
      p_device_id: 'device-1',
      p_device_secret: 'secret-value-that-is-long',
      p_state: emptyState(),
    });
  });

  it('keeps a stable local device id', () => {
    const storage = new Map<string, string>();
    const storageLike = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    };

    expect(getOrCreateDeviceId(storageLike)).toBe(getOrCreateDeviceId(storageLike));
    expect(getOrCreateDeviceSecret(storageLike)).toBe(getOrCreateDeviceSecret(storageLike));
  });
});
