import type { State } from './store';

export interface CloudConfig {
  url: string;
  anonKey: string;
}

export interface CloudClient {
  rpc(name: 'load_study_state', args: { p_device_id: string; p_device_secret: string }): Promise<{ data: State | null; error: Error | null }>;
  rpc(name: 'save_study_state', args: { p_device_id: string; p_device_secret: string; p_state: State }): Promise<{ data: null; error: Error | null }>;
}

export function getCloudConfig(env: Record<string, string | undefined>): CloudConfig | null {
  const url = env.VITE_SUPABASE_URL?.trim();
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();
  return url && anonKey ? { url, anonKey } : null;
}

export function mergeStates(local: State, remote: State | null): State {
  if (!remote) return local;
  const progress = { ...remote.progress };
  for (const [id, localProgress] of Object.entries(local.progress)) {
    const remoteProgress = progress[id];
    if (!remoteProgress || localProgress.lastAnsweredAt >= remoteProgress.lastAnsweredAt) {
      progress[id] = localProgress;
    }
  }
  return {
    progress,
    mistakeIds: [...new Set([...remote.mistakeIds, ...local.mistakeIds])],
    favoriteIds: [...new Set([...remote.favoriteIds, ...local.favoriteIds])],
    questionOverrides: { ...remote.questionOverrides, ...local.questionOverrides },
    importedQuestions: local.importedQuestions.length ? local.importedQuestions : remote.importedQuestions,
    orphanedRecords: { ...remote.orphanedRecords, ...local.orphanedRecords },
  };
}

export function createCloudSync(client: CloudClient, getDeviceCredentials: () => { deviceId: string; deviceSecret: string }) {
  return {
    async load(): Promise<State | null> {
      const { deviceId, deviceSecret } = getDeviceCredentials();
      const result = await client.rpc('load_study_state', {
        p_device_id: deviceId,
        p_device_secret: deviceSecret,
      });
      if (result.error) throw result.error;
      return result.data ?? null;
    },
    async save(state: State): Promise<void> {
      const { deviceId, deviceSecret } = getDeviceCredentials();
      const result = await client.rpc('save_study_state', {
        p_device_id: deviceId,
        p_device_secret: deviceSecret,
        p_state: state,
      });
      if (result.error) throw result.error;
    },
  };
}
