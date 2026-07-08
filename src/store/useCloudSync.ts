import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { mergeStates } from './cloudSync';
import { createConfiguredCloudSync } from './supabaseCloud';
import type { State, StorageLike } from './store';

export type CloudStatus = 'disabled' | 'connecting' | 'synced' | 'error';

export const cloudStatusLabel: Record<CloudStatus, string> = {
  disabled: '未配置',
  connecting: '连接中',
  synced: '已同步',
  error: '同步失败，已保留本地记录',
};

export function useCloudSync(
  storage: StorageLike | null,
  state: State,
  setState: Dispatch<SetStateAction<State>>,
): CloudStatus {
  const sync = useMemo(() => createConfiguredCloudSync(import.meta.env, storage), [storage]);
  const hasPulled = useRef(false);
  const [status, setStatus] = useState<CloudStatus>(sync ? 'connecting' : 'disabled');

  useEffect(() => {
    if (!sync) return;
    let cancelled = false;
    setStatus('connecting');
    sync
      .load()
      .then(remote => {
        if (cancelled) return;
        setState(local => mergeStates(local, remote));
        hasPulled.current = true;
        setStatus('synced');
      })
      .catch(() => {
        if (cancelled) return;
        hasPulled.current = true;
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [setState, sync]);

  useEffect(() => {
    if (!sync || !hasPulled.current) return;
    const timer = window.setTimeout(() => {
      sync
        .save(state)
        .then(() => setStatus('synced'))
        .catch(() => setStatus('error'));
    }, 600);
    return () => window.clearTimeout(timer);
  }, [state, sync]);

  return status;
}
