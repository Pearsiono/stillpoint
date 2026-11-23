export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
export type AppLifecycleEvent = 'resign' | 'active' | 'audio_began' | 'audio_ended';

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        haptics?: { postMessage: (msg: string) => void };
        storage?: { postMessage: (msg: { action: string; key: string; value?: string }) => void };
        gameCenter?: { postMessage: (msg: Record<string, unknown>) => void };
      };
    };
    __STILLPOINT_NATIVE__?: boolean;
    __STILLPOINT_SAFE_INSETS__?: { top: number; bottom: number; left: number; right: number };
    __STILLPOINT_NATIVE_SAVE__?: string;
    __STILLPOINT_CLOUD_SAVE__?: string;
    __STILLPOINT_GC_READY__?: boolean;
    __stillpointOnAppLifecycle?: (ev: AppLifecycleEvent) => void;
    __stillpointOnCloudSave?: (json: string) => void;
    __stillpointOnGameCenterReady?: (ready: boolean) => void;
  }
}

const LEADERBOARD_IDS: Record<string, string> = {
  overall: 'stillpoint_lb_overall',
  drift: 'stillpoint_lb_drift',
  helix: 'stillpoint_lb_helix',
  furnace: 'stillpoint_lb_furnace',
  singularity: 'stillpoint_lb_singularity'
};

class NativeBridge {
  private hapticsEnabled = true;
  private lastLightAt = 0;
  private gcReady = false;
  private lifecycleListeners = new Set<(ev: AppLifecycleEvent) => void>();
  private cloudSaveListeners = new Set<(json: string) => void>();
  private gcListeners = new Set<(ready: boolean) => void>();

  constructor() {
    if (typeof window !== 'undefined') {
      this.gcReady = Boolean(window.__STILLPOINT_GC_READY__);
      window.__stillpointOnAppLifecycle = (ev: AppLifecycleEvent) => {
        for (const fn of this.lifecycleListeners) fn(ev);
      };
      window.__stillpointOnCloudSave = (json: string) => {
        for (const fn of this.cloudSaveListeners) fn(json);
      };
      window.__stillpointOnGameCenterReady = (ready: boolean) => {
        this.gcReady = Boolean(ready);
        for (const fn of this.gcListeners) fn(this.gcReady);
      };
    }
  }

  setHapticsEnabled(enabled: boolean): void {
    this.hapticsEnabled = enabled;
  }

  isNativeIOS(): boolean {
    return Boolean(window.__STILLPOINT_NATIVE__ || window.webkit?.messageHandlers?.haptics);
  }

  isGameCenterReady(): boolean {
    return this.gcReady || Boolean(window.__STILLPOINT_GC_READY__);
  }

  onAppLifecycle(fn: (ev: AppLifecycleEvent) => void): () => void {
    this.lifecycleListeners.add(fn);
    return () => this.lifecycleListeners.delete(fn);
  }

  onCloudSave(fn: (json: string) => void): () => void {
    this.cloudSaveListeners.add(fn);
    return () => this.cloudSaveListeners.delete(fn);
  }

  onGameCenterChange(fn: (ready: boolean) => void): () => void {
    this.gcListeners.add(fn);
    return () => this.gcListeners.delete(fn);
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

  getInitialCloudSave(): string | null {
    return typeof window.__STILLPOINT_CLOUD_SAVE__ === 'string' &&
      window.__STILLPOINT_CLOUD_SAVE__.length > 0
      ? window.__STILLPOINT_CLOUD_SAVE__
      : null;
  }

  submitLeaderboardScore(sectorId: string, score: number, overallBest?: number): void {
    if (!this.isGameCenterReady() || score <= 0) return;
    try {
      const lb = LEADERBOARD_IDS[sectorId];
      if (lb) {
        window.webkit?.messageHandlers?.gameCenter?.postMessage({
          action: 'submitScore',
          leaderboardId: lb,
          score: Math.floor(score)
        });
      }
      const best = Math.max(score, overallBest ?? 0);
      if (best > 0) {
        window.webkit?.messageHandlers?.gameCenter?.postMessage({
          action: 'submitScore',
          leaderboardId: LEADERBOARD_IDS.overall,
          score: Math.floor(best)
        });
      }
    } catch {
      // Ignore outside native Game Center builds
    }
  }

  reportAchievement(milestoneId: string, percent = 100): void {
    if (!this.isGameCenterReady()) return;
    try {
      window.webkit?.messageHandlers?.gameCenter?.postMessage({
        action: 'reportAchievement',
        achievementId: `stillpoint_ach_${milestoneId}`,
        percent: Math.max(0, Math.min(100, percent))
      });
    } catch {
      // Ignore outside native Game Center builds
    }
  }

  openGameCenter(): void {
    if (!this.isGameCenterReady()) return;
    try {
      window.webkit?.messageHandlers?.gameCenter?.postMessage({
        action: 'showLeaderboards'
      });
    } catch {
      // Ignore outside native Game Center builds
    }
  }
}

export const bridge = new NativeBridge();
