import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';
import { useVaultStore } from '../store/vaultStore';
import { useSettingsStore } from '../store/settingsStore';

// Module-level timestamp tracking (preserves state across hook re-renders)
let lastUserActivityTimestamp = Date.now();
let backgroundEnteredTimestamp: number | null = null;

/**
 * Call whenever the user interacts with the app (tap, scroll, keypress).
 * Resets the in-app inactivity timer.
 */
export function recordUserActivity() {
  lastUserActivityTimestamp = Date.now();
}

/**
 * useAutoLock Hook
 * - Protects against screen recording & screenshots via FLAG_SECURE while unlocked.
 * - Enforces autoLockTimeout both when backgrounded/inactive and during in-app idle inactivity.
 *   Supported timeouts: 'immediately' | '1m' | '5m' | 'never'
 */
export function useAutoLock(enabled: boolean = true) {
  const isUnlocked = useVaultStore((s) => s.isUnlocked);
  const isShieldActive = useRef(false);

  // 1. Hardware Screen Shield (FLAG_SECURE)
  useEffect(() => {
    if (!enabled) return;

    if (isUnlocked && !isShieldActive.current) {
      isShieldActive.current = true;
      ScreenCapture.preventScreenCaptureAsync('needs-locker-shield').catch(() => {});
    } else if (!isUnlocked && isShieldActive.current) {
      isShieldActive.current = false;
      ScreenCapture.allowScreenCaptureAsync('needs-locker-shield').catch(() => {});
    }

    return () => {
      if (isShieldActive.current) {
        isShieldActive.current = false;
        ScreenCapture.allowScreenCaptureAsync('needs-locker-shield').catch(() => {});
      }
    };
  }, [isUnlocked, enabled]);

  // 2. Background / App Switching Auto-Lock Listener
  useEffect(() => {
    if (!enabled) return;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const { isUnlocked: currentlyUnlocked, lockVault } = useVaultStore.getState();
      const { autoLockTimeout } = useSettingsStore.getState();

      if (!currentlyUnlocked) {
        backgroundEnteredTimestamp = null;
        return;
      }

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        if (!backgroundEnteredTimestamp) {
          backgroundEnteredTimestamp = Date.now();
        }

        // Immediate lock on app switch / minimize / screen lock
        if (autoLockTimeout === 'immediately') {
          lockVault();
        }
      } else if (nextAppState === 'active') {
        // App brought back to foreground
        if (backgroundEnteredTimestamp) {
          const elapsed = Date.now() - backgroundEnteredTimestamp;
          if (autoLockTimeout === '1m' && elapsed >= 60 * 1000) {
            lockVault();
          } else if (autoLockTimeout === '5m' && elapsed >= 5 * 60 * 1000) {
            lockVault();
          }
        }
        backgroundEnteredTimestamp = null;
        lastUserActivityTimestamp = Date.now();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [enabled]);

  // 3. Foreground Inactivity Auto-Lock Timer (locks if device is left idle while unlocked)
  useEffect(() => {
    if (!enabled || !isUnlocked) return;

    lastUserActivityTimestamp = Date.now();

    const intervalId = setInterval(() => {
      const { isUnlocked: currentlyUnlocked, lockVault } = useVaultStore.getState();
      const { autoLockTimeout } = useSettingsStore.getState();

      if (!currentlyUnlocked || autoLockTimeout === 'never' || autoLockTimeout === 'immediately') {
        return;
      }

      const timeoutMs = autoLockTimeout === '1m' ? 60 * 1000 : 5 * 60 * 1000;
      const idleTime = Date.now() - lastUserActivityTimestamp;

      if (idleTime >= timeoutMs) {
        lockVault();
      }
    }, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, isUnlocked]);
}
