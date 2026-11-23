import { NativeModule, requireNativeModule } from 'expo';
import { Platform } from 'react-native';

export type MirrorState =
  | 'idle'
  | 'awaiting-permission'
  | 'starting'
  | 'streaming'
  | 'stats'
  | 'stopped'
  | 'error';

export type MirrorStatusEvent = {
  state: MirrorState;
  url?: string;
  ip?: string;
  port?: number;
  width?: number;
  height?: number;
  fps?: number;
  frames?: number;
  clients?: number;
  message?: string;
};

type ScreenMirrorEvents = {
  onMirrorStatus: (event: MirrorStatusEvent) => void;
};

declare class NativeScreenMirrorModule extends NativeModule<ScreenMirrorEvents> {
  isAvailableAsync(): Promise<boolean>;
  getLocalIpAddress(): Promise<string>;
  startMirroring(port: number, jpegQuality: number, fps: number): Promise<void>;
  stopMirroring(): Promise<void>;
}

type MirrorListener = (event: MirrorStatusEvent) => void;
type MirrorSubscription = { remove: () => void };

let cachedModule: NativeScreenMirrorModule | null | undefined;

function getNativeModule(): NativeScreenMirrorModule | null {
  if (cachedModule !== undefined) {
    return cachedModule;
  }

  // The native module is Android-only. Expo Go and iOS/web load this file but
  // must fail gracefully instead of calling an unlinked native module.
  if (Platform.OS !== 'android') {
    cachedModule = null;
    return cachedModule;
  }

  try {
    cachedModule = requireNativeModule<NativeScreenMirrorModule>('ScreenMirror');
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

export const ScreenMirror = {
  addMirrorStatusListener(listener: MirrorListener): MirrorSubscription {
    const subscription = getNativeModule()?.addListener('onMirrorStatus', listener);
    return subscription ?? { remove: () => {} };
  },

  async isAvailableAsync(): Promise<boolean> {
    const nativeModule = getNativeModule();
    if (!nativeModule) return false;
    try {
      return await nativeModule.isAvailableAsync();
    } catch {
      return false;
    }
  },

  async getLocalIpAddress(): Promise<string | null> {
    const nativeModule = getNativeModule();
    if (!nativeModule) return null;
    try {
      return await nativeModule.getLocalIpAddress();
    } catch {
      return null;
    }
  },

  async startMirroring(port: number, jpegQuality: number, fps: number): Promise<void> {
    const nativeModule = getNativeModule();
    if (!nativeModule) {
      throw new Error('Screen mirroring requires an Android development build with the native module.');
    }
    await nativeModule.startMirroring(port, jpegQuality, fps);
  },

  async stopMirroring(): Promise<void> {
    await getNativeModule()?.stopMirroring();
  },
};
