export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        haptics?: { postMessage: (msg: string) => void };
        storage?: { postMessage: (msg: { action: string; key: string; value?: string }) => void };
      };
    };
    __STILLPOINT_NATIVE__?: boolean;
    __STILLPOINT_SAFE_INSETS__?: { top: number; bottom: number; left: number; right: number };
    __STILLPOINT_NATIVE_SAVE__?: string;
  }
}

class NativeBridge {
  private hapticsEnabled = true;
  private lastLightAt = 0;

  setHapticsEnabled(enabled: boolean): void {
    this.hapticsEnabled = enabled;
  }

  isNativeIOS(): boolean {
    return Boolean(window.__STILLPOINT_NATIVE__ || window.webkit?.messageHandlers?.haptics);
  }

  haptic(kind: HapticKind): void {
    if (!this.hapticsEnabled) return;
    const now = performance.now();
    if (kind === 'light') {
      // Rate-limit light ticks so dense bullet grazing feels crisp, never muddy
      if (now - this.lastLightAt < 45) return;
      this.lastLightAt = now;
    }

    try {
      const handler = window.webkit?.messageHandlers?.haptics;
      if (handler) {
        handler.postMessage(kind);
        return;
      }
      if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
        const ms =
          kind === 'light'
            ? 8
            : kind === 'medium'
              ? 18
              : kind === 'heavy'
                ? 32
                : kind === 'success'
                  ? 24
                  : 40;
        navigator.vibrate(ms);
      }
    } catch {
      // Ignore in unsupported environments
    }
  }

  syncSaveToNative(key: string, value: string): void {
    try {
      window.webkit?.messageHandlers?.storage?.postMessage({
        action: 'set',
        key,
        value
      });
    } catch {
      // Ignore when running outside native iOS wrapper
    }
  }

  getInitialNativeSave(): string | null {
    return typeof window.__STILLPOINT_NATIVE_SAVE__ === 'string' &&
      window.__STILLPOINT_NATIVE_SAVE__.length > 0
      ? window.__STILLPOINT_NATIVE_SAVE__
      : null;
  }
}

export const bridge = new NativeBridge();
