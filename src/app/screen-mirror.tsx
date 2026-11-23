import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle2,
  Info,
  Lock,
  Monitor,
  Radio,
  Square,
  Wifi,
} from 'lucide-react-native';

import { BrandColors } from '@/constants/theme';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useVaultStore } from '@/store/vaultStore';
import {
  ScreenMirror,
  type MirrorStatusEvent,
} from '../../modules/expo-screen-mirror';

const MIRROR_PORT = 8899;
const JPEG_QUALITY = 70;
const TARGET_FPS = 15;

const STATE_LABELS: Record<MirrorStatusEvent['state'], string> = {
  idle: 'Not streaming',
  'awaiting-permission': 'Waiting for capture permission',
  starting: 'Starting stream',
  streaming: 'Live',
  stats: 'Live',
  stopped: 'Stopped',
  error: 'Error',
};

export default function ScreenMirrorScreen() {
  const isUnlocked = useVaultStore((state) => state.isUnlocked);
  const lockVault = useVaultStore((state) => state.lockVault);

  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [localIp, setLocalIp] = useState<string | null>(null);
  const [status, setStatus] = useState<MirrorStatusEvent>({ state: 'idle' });
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const supported = await ScreenMirror.isAvailableAsync();
      if (!mounted) return;
      setIsSupported(supported);
      if (supported) {
        setLocalIp(await ScreenMirror.getLocalIpAddress());
      }
    };
    initialize();

    const subscription = ScreenMirror.addMirrorStatusListener((event) => {
      if (mounted) setStatus(event);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  // Privacy guard: unlocking the vault while mirroring must kill the stream.
  useEffect(() => {
    if (!isUnlocked) return;
    if (
      status.state === 'streaming' ||
      status.state === 'starting' ||
      status.state === 'awaiting-permission'
    ) {
      // The native stop event updates the status; unlocking must end the stream
      // even if the user never taps the stop button.
      void ScreenMirror.stopMirroring();
    }
  }, [isUnlocked, status.state]);

  const handleStart = useCallback(async () => {
    if (isUnlocked) return;
    setIsBusy(true);
    setStatus({ state: 'starting' });
    try {
      await ScreenMirror.startMirroring(MIRROR_PORT, JPEG_QUALITY, TARGET_FPS);
    } catch (error: any) {
      setStatus({ state: 'error', message: error?.message || 'Could not start mirroring.' });
    } finally {
      setIsBusy(false);
    }
  }, [isUnlocked]);

  const handleStop = useCallback(async () => {
    setIsBusy(true);
    try {
      await ScreenMirror.stopMirroring();
      setStatus({ state: 'stopped' });
    } catch (error: any) {
      setStatus({ state: 'error', message: error?.message || 'Could not stop mirroring.' });
    } finally {
      setIsBusy(false);
    }
  }, []);

  const isLive = status.state === 'streaming' || status.state === 'stats';
  const streamUrl = status.url || (localIp ? `http://${localIp}:${MIRROR_PORT}` : null);
  const stateLabel = STATE_LABELS[status.state] ?? status.state;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <AnimatedPressable
          scaleTo={0.9}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}>
          <ArrowLeft size={19} color="#FFFDFB" strokeWidth={2.6} />
        </AnimatedPressable>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Screen Mirroring</Text>
          <Text style={styles.headerSub}>developer option · same-network streaming</Text>
        </View>
        <Monitor size={22} color={BrandColors.primary} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isSupported === null ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={BrandColors.primary} />
            <Text style={styles.loadingText}>Checking device support…</Text>
          </View>
        ) : null}

        {isSupported === false ? (
          <View style={styles.unsupportedCard}>
            <Info size={20} color="#F59E0B" />
            <View style={styles.unsupportedText}>
              <Text style={styles.unsupportedTitle}>Not available in this build</Text>
              <Text style={styles.unsupportedBody}>
                {Platform.OS === 'android'
                  ? 'The native mirror module is missing. Create a development build (npx expo run:android) or an EAS build after prebuild — Expo Go cannot capture the device screen.'
                  : 'Live screen capture needs platform-native code (MediaProjection on Android, a ReplayKit broadcast extension on iOS). This developer option currently supports Android development builds only.'}
              </Text>
            </View>
          </View>
        ) : null}

        {isUnlocked ? (
          <View style={styles.blockedCard}>
            <Lock size={20} color="#EF4444" />
            <View style={styles.blockedText}>
              <Text style={styles.blockedTitle}>Mirroring blocked</Text>
              <Text style={styles.blockedBody}>
                Lock the vault before starting a screen mirror. Decrypted documents and previews must
                never leave this device. The stream also stops automatically if the vault is unlocked.
              </Text>
              <AnimatedPressable
                scaleTo={0.98}
                onPress={() => void lockVault()}
                accessibilityRole="button"
                accessibilityLabel="Lock vault and continue"
                style={styles.lockContinueButton}>
                <Lock size={14} color="#FFFDFB" />
                <Text style={styles.lockContinueText}>Lock vault &amp; continue</Text>
              </AnimatedPressable>
            </View>
          </View>
        ) : null}

        {isSupported ? (
          <>
            <View style={styles.statusCard}>
              <View style={styles.statusHeader}>
                <View style={[styles.statusDot, isLive ? styles.statusDotLive : styles.statusDotIdle]} />
                <Text style={styles.statusLabel}>{stateLabel}</Text>
                {isSupported && !isUnlocked && isLive ? (
                  <View style={styles.encryptedPill}>
                    <Text style={styles.encryptedPillText}>LAN ONLY</Text>
                  </View>
                ) : null}
              </View>

              {status.message ? (
                <Text style={styles.statusMessage}>{status.message}</Text>
              ) : null}

              {isLive && streamUrl ? (
                <View style={styles.urlBox}>
                  <Text style={styles.urlLabel}>OPEN ON THE OTHER DEVICE</Text>
                  <Text style={styles.urlText} selectable>
                    {streamUrl}
                  </Text>
                </View>
              ) : (
                <Text style={styles.statusHint}>
                  Start the stream, then open the address below in a browser on another device
                  connected to the same Wi-Fi.
                </Text>
              )}

              {isLive && (status.ip ?? localIp) === '127.0.0.1' ? (
                <Text style={styles.ipWarning}>
                  No Wi-Fi address was detected. This link may not open on the other device.
                </Text>
              ) : null}

              {isLive ? (
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{status.fps ?? '—'}</Text>
                    <Text style={styles.statLabel}>frames / sec</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{status.frames ?? 0}</Text>
                    <Text style={styles.statLabel}>frames sent</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {status.width && status.height ? `${status.width}×${status.height}` : '—'}
                    </Text>
                    <Text style={styles.statLabel}>resolution</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{status.clients ?? 0}</Text>
                    <Text style={styles.statLabel}>viewers</Text>
                  </View>
                </View>
              ) : null}
            </View>

            <AnimatedPressable
              scaleTo={0.98}
              onPress={isLive ? handleStop : handleStart}
              disabled={isBusy || isUnlocked}
              accessibilityRole="button"
              accessibilityLabel={isLive ? 'Stop mirroring' : 'Start mirroring'}
              style={[
                styles.primaryButton,
                (isBusy || isUnlocked) && styles.primaryButtonDisabled,
                isLive && styles.stopButton,
              ]}>
              {isBusy ? (
                <ActivityIndicator size="small" color="#FFFDFB" />
              ) : isLive ? (
                <Square size={16} color="#FFFDFB" fill="#FFFDFB" />
              ) : (
                <Radio size={18} color="#FFFDFB" />
              )}
              <Text style={styles.primaryButtonText}>
                {isLive ? 'Stop mirroring' : 'Start mirroring'}
              </Text>
            </AnimatedPressable>

            <View style={styles.infoCard}>
              <Wifi size={17} color={BrandColors.primary} />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>How to connect</Text>
                <Text style={styles.infoBody}>
                  1. Keep both devices on the same Wi-Fi network.{'\n'}
                  2. Tap Start mirroring and approve the Android capture prompt.{'\n'}
                  3. On the other device, open a browser and go to the address shown above.{'\n'}
                  4. The viewers count should change to 1 when that page connects.
                </Text>
              </View>
            </View>

            <View style={styles.noticeRow}>
              <Info size={14} color="#78716C" />
              <Text style={styles.noticeText}>
                The preview is unencrypted and anyone on the same network can open the address while
                it is live. Stop the session when you are done.
              </Text>
            </View>

            {!isLive && localIp && !streamUrl ? (
              <Text style={styles.predictedUrl}>Expected address: http://{localIp}:{MIRROR_PORT}</Text>
            ) : null}
          </>
        ) : null}

        {isSupported === true && !isUnlocked && !isLive ? (
          <View style={styles.readyRow}>
            <CheckCircle2 size={15} color="#10B981" />
            <Text style={styles.readyText}>Vault locked · safe to mirror</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0604',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1F1713',
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitleBox: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFDFB',
  },
  headerSub: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 12,
    color: '#A8A29E',
  },
  unsupportedCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#2B1D08',
    borderWidth: 1,
    borderColor: '#5C4210',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  unsupportedText: {
    flex: 1,
  },
  unsupportedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FDE9C8',
  },
  unsupportedBody: {
    fontSize: 12,
    lineHeight: 18,
    color: '#D6C3A5',
    marginTop: 4,
  },
  blockedCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#2A0F0D',
    borderWidth: 1,
    borderColor: '#7F1D1D',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  blockedText: {
    flex: 1,
  },
  blockedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FCA5A5',
  },
  blockedBody: {
    fontSize: 12,
    lineHeight: 18,
    color: '#D9A8A5',
    marginTop: 4,
  },
  lockContinueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 11,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: '#7F1D1D',
  },
  lockContinueText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFDFB',
  },
  statusCard: {
    backgroundColor: '#140F0D',
    borderWidth: 1,
    borderColor: '#291C16',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotLive: {
    backgroundColor: '#10B981',
  },
  statusDotIdle: {
    backgroundColor: '#78716C',
  },
  statusLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFDFB',
  },
  encryptedPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#064E3B',
  },
  encryptedPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6EE7B7',
    letterSpacing: 0.6,
  },
  statusMessage: {
    fontSize: 12,
    color: '#FCA5A5',
    lineHeight: 17,
    marginTop: 10,
  },
  ipWarning: {
    fontSize: 11,
    color: '#FBBF24',
    lineHeight: 16,
    marginTop: 8,
  },
  statusHint: {
    fontSize: 12,
    lineHeight: 18,
    color: '#A8A29E',
    marginTop: 10,
  },
  urlBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#1C1512',
    borderWidth: 1,
    borderColor: '#3D2418',
  },
  urlLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#A8A29E',
    marginBottom: 6,
  },
  urlText: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#291C16',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFDFB',
  },
  statLabel: {
    fontSize: 10,
    color: '#78716C',
    marginTop: 2,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: BrandColors.primary,
    marginBottom: 14,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  stopButton: {
    backgroundColor: '#7F1D1D',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFDFB',
  },
  infoCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#140F0D',
    borderWidth: 1,
    borderColor: '#291C16',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFDFB',
  },
  infoBody: {
    fontSize: 12,
    lineHeight: 19,
    color: '#A8A29E',
    marginTop: 6,
  },
  noticeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: '#78716C',
  },
  predictedUrl: {
    fontSize: 11,
    color: '#78716C',
    marginTop: 12,
    textAlign: 'center',
  },
  readyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
  },
  readyText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#10B981',
  },
});
