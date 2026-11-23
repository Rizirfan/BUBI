import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  Lock,
  Unlock,
  Fingerprint,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  ArrowRight,
  Monitor,
} from 'lucide-react-native';

import { BrandColors, SoftShadows } from '@/constants/theme';
import {
  NeedsLockerAppIcon,
  NeedsLockerWordmark,
} from '@/components/brand/NeedsLockerLogo';
import { ForgotPasswordModal } from '@/components/ui/ForgotPasswordModal';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useVaultStore } from '@/store/vaultStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAutoLock, recordUserActivity } from '@/hooks/useAutoLock';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  setupVault,
  unlockWithPassword,
  unlockWithBiometrics,
  checkBiometricsAvailable,
} from '@/security/keyManager';

interface VaultAuthGateProps {
  children: React.ReactNode;
}

export const VaultAuthGate: React.FC<VaultAuthGateProps> = ({ children }) => {
  const {
    isConfigured,
    isUnlocked,
    isLoading,
    checkVaultStatus,
    unlockVault,
    lockVault,
  } = useVaultStore();
  const isDark = useColorScheme() === 'dark';

  // Active AutoLock and ScreenCapture protection
  useAutoLock(true);

  // Setup state
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupStep, setSetupStep] = useState<'form' | 'recovery'>('form');
  const [recoveryWords, setRecoveryWords] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isForgotModalVisible, setIsForgotModalVisible] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const autoUnlockAttempted = useRef(false);
  const biometricsEnabled = useSettingsStore((s) => s.biometricsEnabled);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const isDeveloperOptionsUnlocked = useSettingsStore(
    (s) => s.isDeveloperOptionsUnlocked
  );

  useEffect(() => {
    checkVaultStatus();
    loadSettings();
    checkBiometricsAvailable().then(({ hasHardware, isEnrolled }) => {
      setBiometricsAvailable(hasHardware && isEnrolled);
    });
  }, [checkVaultStatus, loadSettings]);

  const handleBiometricUnlock = useCallback(async () => {
    try {
      setIsProcessing(true);
      const key = await unlockWithBiometrics();
      if (key) {
        await unlockVault(key);
        setPasswordInput('');
        setShowPassword(false);
      }
    } catch {
      // User cancelled or biometric prompt failed - stay on the unlock screen.
    } finally {
      setIsProcessing(false);
    }
  }, [unlockVault]);

  const canUseBiometrics = biometricsEnabled && biometricsAvailable;

  // Attempt biometric unlock when locked and enabled. Defer the prompt outside
  // the effect body so synchronous state updates do not cascade renders.
  useEffect(() => {
    if (
      !isConfigured ||
      isUnlocked ||
      !canUseBiometrics ||
      autoUnlockAttempted.current
    ) {
      return;
    }

    autoUnlockAttempted.current = true;
    const timeoutId = setTimeout(() => {
      handleBiometricUnlock();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      autoUnlockAttempted.current = false;
    };
  }, [isConfigured, isUnlocked, canUseBiometrics, handleBiometricUnlock]);

  const handleCreateVault = async () => {
    if (passwordInput.length < 8) {
      Alert.alert('Weak Password', 'Master password must be at least 8 characters long.');
      return;
    }
    if (passwordInput !== confirmPassword) {
      Alert.alert('Mismatch', 'Master password and confirmation do not match.');
      return;
    }

    try {
      setIsProcessing(true);
      const { recoveryPhrase } = await setupVault(passwordInput);
      setRecoveryWords(recoveryPhrase);
      setSetupStep('recovery');
      setIsProcessing(false);
    } catch (err: any) {
      setIsProcessing(false);
      Alert.alert('Setup Error', err.message || 'Failed to initialize vault.');
    }
  };

  const handleFinishRecovery = async () => {
    try {
      setIsProcessing(true);
      const key = await unlockWithPassword(passwordInput);
      await unlockVault(key);
      await checkVaultStatus();
      setIsProcessing(false);
    } catch (err: any) {
      setIsProcessing(false);
      Alert.alert('Unlock Error', err.message);
    }
  };

  const handlePasswordUnlock = async () => {
    if (!passwordInput.trim()) return;
    try {
      setIsProcessing(true);
      const key = await unlockWithPassword(passwordInput);
      await unlockVault(key);
      setPasswordInput('');
      setIsProcessing(false);
    } catch (err: any) {
      setIsProcessing(false);
      Alert.alert('Unlock Failed', err.message || 'Incorrect password.');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, isDark && styles.containerDark]}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
      </View>
    );
  }

  // 1. SETUP FLOW (First-Time User)
  if (!isConfigured) {
    return (
      <SafeAreaView style={[styles.authContainer, isDark && styles.containerDark]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardContainer}>
          <ScrollView
            contentContainerStyle={styles.authScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <View style={styles.authBrandBox}>
              <NeedsLockerAppIcon size={88} />
              <View style={{ marginTop: 14 }}>
                <NeedsLockerWordmark size="large" />
              </View>
            </View>

            {setupStep === 'form' ? (
              <View style={[styles.authCard, isDark && styles.authCardDark]}>
                <Text style={[styles.authCardTitle, isDark && styles.textPrimaryDark]}>
                  Create Master Key
                </Text>
                <Text style={[styles.authCardDesc, isDark && styles.textSecondaryDark]}>
                  Your Master Password derives the AES-256-GCM encryption key on-device.
                  It is never transmitted or saved anywhere.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>
                    Master Password
                  </Text>
                  <TextInput
                    style={[styles.textInput, isDark && styles.textInputDark]}
                    secureTextEntry
                    placeholder="At least 8 characters"
                    placeholderTextColor={isDark ? '#6B5B52' : '#A8A29E'}
                    value={passwordInput}
                    onChangeText={setPasswordInput}
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>
                    Confirm Password
                  </Text>
                  <TextInput
                    style={[styles.textInput, isDark && styles.textInputDark]}
                    secureTextEntry
                    placeholder="Re-enter master password"
                    placeholderTextColor={isDark ? '#6B5B52' : '#A8A29E'}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    autoCapitalize="none"
                  />
                </View>

                <AnimatedPressable
                  style={styles.primaryButton}
                  scaleTo={0.96}
                  onPress={handleCreateVault}
                  disabled={isProcessing}>
                  {isProcessing ? (
                    <ActivityIndicator color="#FFFDFB" />
                  ) : (
                    <>
                      <Lock size={18} color="#FFFDFB" style={{ marginRight: 8 }} />
                      <Text style={styles.primaryButtonText}>Initialize Vault</Text>
                    </>
                  )}
                </AnimatedPressable>
              </View>
            ) : (
              <View style={[styles.authCard, isDark && styles.authCardDark]}>
                <View style={styles.recoveryNoticeHeader}>
                  <AlertTriangle size={22} color={BrandColors.primaryDeep} />
                  <Text style={[styles.recoveryNoticeTitle, isDark && styles.textPrimaryDark]}>
                    Emergency Recovery Kit
                  </Text>
                </View>
                <Text style={[styles.authCardDesc, isDark && styles.textSecondaryDark]}>
                  Write down these 12 recovery words in order. If you lose your password,
                  this is the only way to recover your encrypted files.
                </Text>

                <View style={styles.mnemonicGrid}>
                  {recoveryWords.map((word, i) => (
                    <View key={i} style={[styles.mnemonicChip, isDark && styles.mnemonicChipDark]}>
                      <Text style={styles.mnemonicIndex}>{i + 1}.</Text>
                      <Text style={[styles.mnemonicWord, isDark && styles.textPrimaryDark]}>
                        {word}
                      </Text>
                    </View>
                  ))}
                </View>

                <AnimatedPressable
                  style={styles.primaryButton}
                  scaleTo={0.96}
                  onPress={handleFinishRecovery}
                  disabled={isProcessing}>
                  {isProcessing ? (
                    <ActivityIndicator color="#FFFDFB" />
                  ) : (
                    <>
                      <CheckCircle2 size={18} color="#FFFDFB" style={{ marginRight: 8 }} />
                      <Text style={styles.primaryButtonText}>I Saved My Recovery Key</Text>
                    </>
                  )}
                </AnimatedPressable>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // 2. UNLOCK FLOW (Vault Configured but Locked)
  if (!isUnlocked) {
    return (
      <SafeAreaView
        style={[styles.authContainer, isDark && styles.containerDark]}
        edges={['top', 'left', 'right']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardContainer}>
          <ScrollView
            contentContainerStyle={styles.unlockScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}>
            <View style={styles.authBrandBox}>
              <NeedsLockerAppIcon size={84} />
              <View style={styles.wordmarkSpacing}>
                <NeedsLockerWordmark size="large" />
              </View>
              <Text style={[styles.brandTagline, isDark && styles.textSecondaryDark]}>
                Your private space, secured.
              </Text>
            </View>

            <View style={[styles.authCard, isDark && styles.authCardDark]}>
              <View style={styles.unlockCardHeader}>
                <View style={[styles.cardIcon, isDark && styles.cardIconDark]}>
                  <LockKeyhole size={19} color={BrandColors.wordmark} strokeWidth={2.2} />
                </View>
                <View style={styles.unlockCardCopy}>
                  <Text style={[styles.authCardTitle, isDark && styles.textPrimaryDark]}>
                    Welcome back
                  </Text>
                  <Text style={[styles.authCardSubtitle, isDark && styles.textSecondaryDark]}>
                    Enter your master password to open your vault.
                  </Text>
                </View>
              </View>

              {canUseBiometrics && (
                <>
                  <AnimatedPressable
                    style={[styles.biometricButton, isDark && styles.biometricButtonDark]}
                    scaleTo={0.96}
                    onPress={handleBiometricUnlock}
                    disabled={isProcessing}>
                    <Fingerprint size={22} color={BrandColors.primary} strokeWidth={2} />
                    <Text
                      style={[styles.biometricButtonText, isDark && styles.textPrimaryDark]}>
                      Unlock with Biometrics
                    </Text>
                  </AnimatedPressable>

                  <View style={styles.orDivider}>
                    <View style={[styles.orLine, isDark && styles.orLineDark]} />
                    <Text style={[styles.orText, isDark && styles.textSecondaryDark]}>or</Text>
                    <View style={[styles.orLine, isDark && styles.orLineDark]} />
                  </View>
                </>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>
                  Master Password
                </Text>
                <View style={[styles.passwordBox, isDark && styles.passwordBoxDark]}>
                  <TextInput
                    style={[styles.passwordInput, isDark && styles.textPrimaryDark]}
                    secureTextEntry={!showPassword}
                    placeholder="Enter master password"
                    placeholderTextColor={isDark ? '#6B5B52' : '#A8A29E'}
                    value={passwordInput}
                    onChangeText={setPasswordInput}
                    onSubmitEditing={handlePasswordUnlock}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="current-password"
                    returnKeyType="go"
                    editable={!isProcessing}
                  />
                  <AnimatedPressable
                    scaleTo={0.9}
                    onPress={() => setShowPassword((visible) => !visible)}
                    style={styles.eyeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? (
                      <EyeOff size={17} color={isDark ? '#A8A29E' : '#78716C'} />
                    ) : (
                      <Eye size={17} color={isDark ? '#A8A29E' : '#78716C'} />
                    )}
                  </AnimatedPressable>
                </View>
              </View>

              <AnimatedPressable
                style={styles.unlockButton}
                scaleTo={0.96}
                onPress={handlePasswordUnlock}
                disabled={isProcessing}
                accessibilityRole="button"
                accessibilityLabel="Unlock Vault">
                {isProcessing ? (
                  <ActivityIndicator color="#FFFDFB" />
                ) : (
                  <View style={styles.unlockButtonContent}>
                    <Unlock size={18} color="#FFFDFB" strokeWidth={2.4} style={{ marginRight: 8 }} />
                    <Text style={styles.unlockButtonText}>Unlock Vault</Text>
                    <ArrowRight size={17} color="#FFFDFB" strokeWidth={2.4} style={{ marginLeft: 6 }} />
                  </View>
                )}
              </AnimatedPressable>

              <AnimatedPressable
                style={styles.forgotBtn}
                scaleTo={0.95}
                onPress={() => setIsForgotModalVisible(true)}>
                <Text style={[styles.forgotBtnText, isDark && styles.forgotBtnTextDark]}>
                  Forgot Master Password?
                </Text>
              </AnimatedPressable>
            </View>

            <View style={styles.securityNote}>
              <ShieldCheck size={13} color={BrandColors.securityMint} strokeWidth={2.4} />
              <Text style={[styles.securityNoteText, isDark && styles.textSecondaryDark]}>
                AES-256-GCM encrypted · Stored only on this device
              </Text>
            </View>

            {isDeveloperOptionsUnlocked ? (
              <AnimatedPressable
                style={styles.devMirrorLink}
                scaleTo={0.96}
                onPress={() => router.push('/screen-mirror' as any)}
                accessibilityRole="button"
                accessibilityLabel="Open developer screen mirror">
                <Monitor size={14} color={BrandColors.primary} />
                <Text style={styles.devMirrorLinkText}>Developer screen mirror</Text>
              </AnimatedPressable>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Forgot Password Recovery Modal */}
        <ForgotPasswordModal
          visible={isForgotModalVisible}
          onClose={() => setIsForgotModalVisible(false)}
          onVaultRecovered={async (newKey) => {
            await unlockVault(newKey);
            await checkVaultStatus();
          }}
          onVaultWiped={async () => {
            await lockVault();
            await checkVaultStatus();
          }}
        />
      </SafeAreaView>
    );
  }

  // 3. UNLOCKED (Render Authenticated Children)
  return (
    <View
      style={styles.unlockedContainer}
      onTouchStart={recordUserActivity}
      onResponderMove={recordUserActivity}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F8FA',
  },
  containerDark: {
    backgroundColor: BrandColors.pitchBlack,
  },
  unlockedContainer: {
    flex: 1,
  },
  authContainer: {
    flex: 1,
    backgroundColor: '#FBF9F7',
  },
  keyboardContainer: {
    flex: 1,
  },
  authScroll: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 28,
    justifyContent: 'center',
  },
  unlockScroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
    justifyContent: 'center',
  },
  authBrandBox: {
    alignItems: 'center',
    marginBottom: 24,
  },
  wordmarkSpacing: {
    marginTop: 12,
  },
  brandTagline: {
    marginTop: 8,
    fontSize: 12.5,
    fontWeight: '500',
    color: '#8C857E',
  },
  authCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1.2,
    borderColor: '#F0E6DF',
    ...SoftShadows.card,
  },
  authCardDark: {
    backgroundColor: '#17120F',
    borderColor: '#261C16',
    shadowColor: '#000000',
  },
  authCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  textPrimaryDark: {
    color: BrandColors.foreground,
  },
  textSecondaryDark: {
    color: '#A8A29E',
  },
  authCardDesc: {
    fontSize: 12.5,
    color: '#78716C',
    lineHeight: 18,
    marginBottom: 16,
  },
  authCardSubtitle: {
    fontSize: 12,
    color: '#8C857E',
    lineHeight: 16,
  },
  unlockCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF4ED',
    borderWidth: 1,
    borderColor: '#FCD8C1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardIconDark: {
    backgroundColor: '#2B160C',
    borderColor: '#422415',
  },
  unlockCardCopy: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#44403C',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 7,
    marginLeft: 2,
  },
  textInput: {
    backgroundColor: '#FBF9F7',
    borderWidth: 1.2,
    borderColor: '#EDE5DE',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1C1917',
  },
  textInputDark: {
    backgroundColor: '#221711',
    borderColor: '#322017',
  },
  passwordBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF9F7',
    borderWidth: 1.2,
    borderColor: '#EDE5DE',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 50,
  },
  passwordBoxDark: {
    backgroundColor: '#221711',
    borderColor: '#322017',
  },
  passwordInput: {
    flex: 1,
    height: 50,
    fontSize: 14.5,
    color: '#1C1917',
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
    ...SoftShadows.button,
  },
  primaryButtonText: {
    color: '#FFFDFB',
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  unlockButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    ...SoftShadows.button,
  },
  unlockButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockButtonText: {
    color: '#FFFDFB',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF4ED',
    borderWidth: 1,
    borderColor: BrandColors.borderLight,
    paddingVertical: 13,
    borderRadius: 14,
  },
  biometricButtonDark: {
    backgroundColor: '#2A1B13',
    borderColor: '#3A2418',
  },
  biometricButtonText: {
    color: BrandColors.wordmark,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 9,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#F0E6DF',
  },
  orLineDark: {
    backgroundColor: '#2A1F19',
  },
  orText: {
    marginHorizontal: 12,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#A8A29E',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  forgotBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 8,
  },
  forgotBtnText: {
    fontSize: 13,
    color: BrandColors.wordmark,
    fontWeight: '700',
  },
  forgotBtnTextDark: {
    color: '#FFA25B',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 22,
  },
  securityNoteText: {
    fontSize: 11.5,
    fontWeight: '500',
    color: '#8C857E',
    textAlign: 'center',
  },
  devMirrorLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 8,
  },
  devMirrorLinkText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: BrandColors.primary,
  },
  recoveryNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recoveryNoticeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.primaryDeep,
    marginLeft: 8,
  },
  mnemonicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 22,
  },
  mnemonicChip: {
    flexDirection: 'row',
    backgroundColor: '#FBF9F7',
    borderWidth: 1,
    borderColor: '#EDE5DE',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    width: '31%',
    alignItems: 'center',
  },
  mnemonicChipDark: {
    backgroundColor: '#221711',
    borderColor: '#322017',
  },
  mnemonicIndex: {
    fontSize: 11,
    color: '#A8A29E',
    fontWeight: '600',
    marginRight: 4,
  },
  mnemonicWord: {
    fontSize: 12,
    color: '#1C1917',
    fontWeight: '700',
  },
});
