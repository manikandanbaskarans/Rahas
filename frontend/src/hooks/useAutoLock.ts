import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

const DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function useAutoLock(timeoutMs: number = DEFAULT_TIMEOUT): void {
  const lock = useAuthStore((s) => s.lock);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (isAuthenticated) {
      timerRef.current = setTimeout(() => {
        lock();
      }, timeoutMs);
    }
  }, [isAuthenticated, lock, timeoutMs]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => document.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      events.forEach((event) => document.removeEventListener(event, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isAuthenticated, resetTimer]);
}
