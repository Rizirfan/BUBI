import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Fingerprint,
  HardDrive,
  KeyRound,
  Lock,
  Moon,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react-native';

import { BrandColors, SoftShadows } from '@/constants/theme';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useVaultStore } from '@/store/vaultStore';
import { useSettingsStore, type AutoLockTimeout, type ThemeMode } from '@/store/settingsStore';
import {
  changeMasterPassword,
  checkBiometricsAvailable,
  resetVaultKeys,
  unlockWithPassword,
} from '@/security/keyManager';
import { wipeAllVaultData } from '@/storage/documentManager';
import { useColorScheme } from '@/hooks/use-color-scheme';

type SectionProps = {
  label: string;
  children: React.ReactNode;
  isDark: boolean;
  danger?: boolean;
};

function SettingsSection({ label, children, isDark, danger }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text
        style={[
          styles.sectionLabel,
          isDark && styles.sectionLabelDark,
          danger && styles.sectionLabelDanger,
        ]}>
        {label}
      </Text>
      <View
        style={[
          styles.card,
          isDark && styles.cardDark,
          danger && styles.cardDanger,
          danger && isDark && styles.cardDangerDark,
        ]}>
        {children}
      </View>
    </View>
  );
}

type RowProps = {
  icon: LucideIcon;
  iconBackground: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  isDark: boolean;
  last?: boolean;
};

function SettingsRow({
  icon: Icon,
  iconBackground,
  iconColor,
  title,
  subtitle,
  trailing,
  onPress,
  danger,
  isDark,
  last,
}: RowProps) {
  const content = (
    <View style={styles.row}>
      <View style={[styles.iconWell, { backgroundColor: iconBackground }]}>
        <Icon size={20} color={iconColor} strokeWidth={2.2} />
      </View>
      <View style={styles.rowText}>
        <Text
          style={[
            styles.rowTitle,
            isDark && styles.textPrimaryDark,
            danger && styles.rowTitleDanger,
          ]}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.rowSubtitle, isDark && styles.textSecondaryDark]}
            numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.rowTrailing}>{trailing}</View> : null}
    </View>
  );

  const containerStyle: StyleProp<ViewStyle> = [
    styles.rowWrapper,
    !last && (isDark ? styles.rowDividerDark : styles.rowDivider),
  ];

  if (onPress) {
    return (
      <AnimatedPressable
        scaleTo={0.98}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={containerStyle}>
        {content}
      </AnimatedPressable>
    );
  }

  return <View style={containerStyle}>{content}</View>;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const router = useRouter();
  const { vaultKey, documents, lockVault, checkVaultStatus } = useVaultStore();
  const {
    themeMode,
    biometricsEnabled,
    biometricsHardwareAvailable,
    autoLockTimeout,
    isDeveloperOptionsUnlocked,
    loadSettings,
    setThemeMode,
    toggleBiometrics,
    setAutoLockTimeout,
    unlockDeveloperOptions,
  } = useSettingsStore();

  const [isPasswordModalVisible, setIsPasswordModalVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Hidden developer-options gesture: 7 taps on the version footer within 3 seconds.
  const footerTapCount = useRef(0);
  const lastFooterTapAt = useRef(0);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleVersionFooterPress = () => {
    if (isDeveloperOptionsUnlocked) {
      router.push('/developer-options' as any);
      return;
    }

    const now = Date.now();
    if (now - lastFooterTapAt.current > 3000) {
      footerTapCount.current = 0;
    }
    lastFooterTapAt.current = now;
    footerTapCount.current += 1;

    if (footerTapCount.current >= 7) {
      footerTapCount.current = 0;
      unlockDeveloperOptions();
      Alert.alert(
        'Developer options enabled',
        'Developer Options are now available in Settings. They are intended for local testing only.'
      );
    }
  };

  const totalStorageFormatted = useMemo(() => {
    const bytes = documents.reduce((acc, d) => acc + d.originalSize, 0);
    if (bytes === 0) return '0 KB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${mb.toFixed(2)} MB`;
  }, [documents]);

  const handleManualLock = () => {
    Alert.alert('Lock Vault', 'Are you sure you want to lock the vault now?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Lock Now',
        style: 'default',
        onPress: async () => {
          await lockVault();
        },
      },
    ]);
  };

  const handleToggleBio = async (value: boolean) => {
    if (value) {
      const status = await checkBiometricsAvailable();
      if (!status.hasHardware) {
        Alert.alert(
          'Biometrics Unsupported',
          'This device does not have fingerprint or face unlock hardware.'
        );
        return;
      }
      if (!status.isEnrolled) {
        Alert.alert(
          'No Biometrics Enrolled',
          'Set up fingerprint or face unlock in your device settings first.'
        );
        return;
      }
      try {
        const auth = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirm fingerprint or face to enable biometric unlock',
          fallbackLabel: 'Use master password',
          cancelLabel: 'Cancel',
        });
        if (!auth.success) {
          Alert.alert('Cancelled', 'Biometric activation was cancelled.');
          return;
        }
      } catch (err: any) {
        Alert.alert('Authentication Error', err.message || 'Biometric authentication failed.');
        return;
      }
      const success = await toggleBiometrics(true, vaultKey);
      Alert.alert(
        success ? 'Biometrics Armed' : 'Could Not Enable',
        success
          ? 'You can now unlock your vault instantly with biometric authentication.'
          : 'Make sure the vault is unlocked and try again.'
      );
    } else {
      await toggleBiometrics(false);
      Alert.alert(
        'Biometrics Disabled',
        'Your master password is now required to unlock the vault.'
      );
    }
  };

  const handleChangePassword = async () => {
    if (!vaultKey) return;
    if (!currentPassword) {
      Alert.alert('Required', 'Please enter your current master password.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Password Too Short', 'The new master password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password Mismatch', 'The new passwords do not match.');
      return;
    }
    try {
      setIsUpdatingPassword(true);
      await unlockWithPassword(currentPassword);
      await changeMasterPassword(vaultKey, newPassword);
      setIsUpdatingPassword(false);
      setIsPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password Updated', 'Your master vault password has been successfully changed.');
    } catch (err: any) {
      setIsUpdatingPassword(false);
      Alert.alert('Verification Failed', err.message || 'The current password you entered is incorrect.');
    }
  };

  const handleWipeData = () => {
    Alert.alert(
      'Permanent Vault Wipe',
      'This will irreversibly delete all encrypted documents, photos, videos, and encryption keys from this device. There is no backup.',
      [
        { text: 'Keep My Vault', style: 'cancel' },
        {
          text: 'Permanently Wipe',
          style: 'destructive',
          onPress: async () => {
            try {
              await wipeAllVaultData();
              await resetVaultKeys();
              await lockVault();
              await checkVaultStatus();
              Alert.alert('Vault Erased', 'All encrypted data and cryptographic keys were wiped.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to wipe vault data.');
            }
          },
        },
      ]
    );
  };

  const themeOptions: { mode: ThemeMode; label: string; icon: LucideIcon }[] = [
    { mode: 'light', label: 'Light', icon: Sun },
    { mode: 'dark', label: 'Dark', icon: Moon },
    { mode: 'system', label: 'System', icon: Smartphone },
  ];

  const lockOptions: { value: AutoLockTimeout; label: string }[] = [
    { value: 'immediately', label: 'Immediate' },
    { value: '1m', label: '1 min' },
    { value: '5m', label: '5 min' },
    { value: 'never', label: 'Never' },
  ];

  const passwordMatch =
    newPassword.length >= 8 && confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <SafeAreaView
      style={[styles.container, isDark && styles.containerDark]}
      edges={['top', 'left', 'right']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Screen Title Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, isDark && styles.textPrimaryDark]}>Settings</Text>
          <Text style={[styles.headerSubtitle, isDark && styles.textSecondaryDark]}>
            Security, appearance and vault preferences
          </Text>
        </View>
        <AnimatedPressable
          scaleTo={0.92}
          onPress={handleManualLock}
          style={[styles.headerLockPill, isDark && styles.headerLockPillDark]}>
          <Lock size={12} color={BrandColors.wordmark} strokeWidth={2.4} />
          <Text style={styles.headerLockText}>Lock Vault</Text>
        </AnimatedPressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 96 },
        ]}
        showsVerticalScrollIndicator={false}>
        {/* 1. Tactical Vault Status Card */}
        <View style={[styles.heroCard, isDark && styles.heroCardDark]}>
          <View style={styles.heroTopRow}>
            <View style={[styles.heroIconBox, isDark && styles.heroIconBoxDark]}>
              <ShieldCheck size={24} color={BrandColors.securityMint} strokeWidth={2.4} />
            </View>
            <View style={styles.heroTextCol}>
              <View style={styles.heroTitleRow}>
                <Text style={[styles.heroTitle, isDark && styles.textPrimaryDark]}>Master Vault</Text>
                <View style={[styles.heroStatusPill, isDark && styles.heroStatusPillDark]}>
                  <View style={styles.heroStatusDot} />
                  <Text style={styles.heroStatusPillText}>ARMED</Text>
                </View>
              </View>
              <Text style={[styles.heroSubtitle, isDark && styles.textSecondaryDark]}>
                Zero-Knowledge · AES-256-GCM hardware cipher
              </Text>
            </View>
          </View>

          <View style={[styles.heroDivider, isDark && styles.heroDividerDark]} />

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatVal, isDark && styles.textPrimaryDark]}>
                {documents.length}
              </Text>
              <Text style={[styles.heroStatLabel, isDark && styles.textSecondaryDark]}>
                {documents.length === 1 ? 'Secured file' : 'Secured files'}
              </Text>
            </View>

            <View style={[styles.heroStatDivider, isDark && styles.heroDividerDark]} />

            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatVal, isDark && styles.textPrimaryDark]}>
                {totalStorageFormatted}
              </Text>
              <Text style={[styles.heroStatLabel, isDark && styles.textSecondaryDark]}>
                Encrypted size
              </Text>
            </View>

            <View style={[styles.heroStatDivider, isDark && styles.heroDividerDark]} />

            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatVal, isDark && styles.textPrimaryDark]}>
                {biometricsEnabled ? 'Biometric' : 'Password'}
              </Text>
              <Text style={[styles.heroStatLabel, isDark && styles.textSecondaryDark]}>
                Unlock mode
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Security & Access Section */}
        <SettingsSection label="SECURITY & ACCESS" isDark={isDark}>
          <SettingsRow
            icon={Fingerprint}
            iconBackground={isDark ? '#2B160C' : '#FFF1E5'}
            iconColor={BrandColors.primary}
            title="Biometric Authentication"
            subtitle={
              biometricsHardwareAvailable
                ? biometricsEnabled
                  ? 'Fingerprint & face recognition armed'
                  : 'Hardware available, currently disabled'
                : 'No biometric hardware detected'
            }
            isDark={isDark}
            trailing={
              <Switch
                value={biometricsEnabled}
                onValueChange={handleToggleBio}
                trackColor={{
                  false: isDark ? '#2A201A' : '#E7E5E4',
                  true: BrandColors.primary,
                }}
                thumbColor="#FFFFFF"
              />
            }
          />

          <SettingsRow
            icon={KeyRound}
            iconBackground={isDark ? '#2B160C' : '#FFF1E5'}
            iconColor={BrandColors.wordmark}
            title="Change Master Password"
            subtitle="Re-encrypt vault key with a new cryptographic passkey"
            isDark={isDark}
            onPress={() => setIsPasswordModalVisible(true)}
            trailing={
              <View style={styles.actionChipRow}>
                <Text style={styles.actionChipText}>Change</Text>
                <ChevronRight size={16} color={isDark ? '#6B5B52' : '#B9AEA6'} />
              </View>
            }
          />

          {/* Auto-lock timer row with segmented pill strip */}
          <View style={styles.autoLockContainer}>
            <View style={styles.autoLockHeader}>
              <View
                style={[
                  styles.iconWell,
                  { backgroundColor: isDark ? '#241B16' : '#F5F5F4' },
                ]}>
                <Clock size={20} color={isDark ? '#FFA05C' : BrandColors.wordmark} strokeWidth={2.2} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, isDark && styles.textPrimaryDark]}>
                  Auto-Lock Inactivity
                </Text>
                <Text style={[styles.rowSubtitle, isDark && styles.textSecondaryDark]}>
                  Securely lock vault when leaving or switching apps
                </Text>
              </View>
            </View>

            <View style={[styles.segmentedPillTrack, isDark && styles.segmentedPillTrackDark]}>
              {lockOptions.map((option) => {
                const active = autoLockTimeout === option.value;
                return (
                  <AnimatedPressable
                    key={option.value}
                    scaleTo={0.94}
                    onPress={() => setAutoLockTimeout(option.value)}
                    accessibilityRole="button"
                    accessibilityLabel={`Auto-lock ${option.label}`}
                    accessibilityState={{ selected: active }}
                    style={[
                      styles.segmentPill,
                      active && (isDark ? styles.segmentPillActiveDark : styles.segmentPillActive),
                    ]}>
                    <Text
                      style={[
                        styles.segmentPillText,
                        isDark && styles.textSecondaryDark,
                        active && styles.segmentPillTextActive,
                      ]}>
                      {option.label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>
        </SettingsSection>

        {/* 3. Appearance Section */}
        <SettingsSection label="APPEARANCE" isDark={isDark}>
          <View style={styles.themeSelectorGrid}>
            {themeOptions.map(({ mode, label, icon: Icon }) => {
              const active = themeMode === mode;
              return (
                <AnimatedPressable
                  key={mode}
                  scaleTo={0.96}
                  onPress={() => setThemeMode(mode)}
                  accessibilityRole="button"
                  accessibilityLabel={`${label} theme`}
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.themeCard,
                    isDark && styles.themeCardDark,
                    active && (isDark ? styles.themeCardActiveDark : styles.themeCardActive),
                  ]}>
                  <View
                    style={[
                      styles.themeIconBox,
                      isDark && styles.themeIconBoxDark,
                      active && styles.themeIconBoxActive,
                    ]}>
                    <Icon
                      size={20}
                      strokeWidth={2.3}
                      color={
                        active
                          ? '#FFFFFF'
                          : isDark
                            ? '#A8A29E'
                            : '#78716C'
                      }
                    />
                  </View>
                  <Text
                    style={[
                      styles.themeCardLabel,
                      isDark && styles.textSecondaryDark,
                      active && styles.themeCardLabelActive,
                    ]}>
                    {label}
                  </Text>
                  {active && (
                    <View style={styles.themeActiveDot} />
                  )}
                </AnimatedPressable>
              );
            })}
          </View>
        </SettingsSection>

        {/* 4. Vault Storage & Specifications */}
        <SettingsSection label="VAULT ARCHITECTURE" isDark={isDark}>
          <SettingsRow
            icon={HardDrive}
            iconBackground={isDark ? '#241B16' : '#F5F5F4'}
            iconColor={BrandColors.primary}
            title="Encrypted Vault Storage"
            subtitle={`${documents.length} ${documents.length === 1 ? 'file' : 'files'} · ${totalStorageFormatted} on internal storage`}
            isDark={isDark}
            trailing={
              <View style={[styles.badgePill, isDark && styles.badgePillDark]}>
                <Text style={[styles.badgePillText, isDark && styles.textSecondaryDark]}>
                  Local only
                </Text>
              </View>
            }
          />
          <SettingsRow
            icon={ShieldCheck}
            iconBackground={isDark ? '#062B1D' : '#ECFDF5'}
            iconColor="#059669"
            title="Cryptographic Engine"
            subtitle="AES-256-GCM · PBKDF2 SHA-256 · Authenticated Tag"
            isDark={isDark}
            last
            trailing={
              <View style={[styles.badgePill, styles.badgePillGreen]}>
                <Text style={styles.badgePillTextGreen}>Verified</Text>
              </View>
            }
          />
        </SettingsSection>

        {/* 5. Danger Zone */}
        <SettingsSection label="DANGER ZONE" isDark={isDark} danger>
          <SettingsRow
            icon={Trash2}
            iconBackground={isDark ? '#381212' : '#FEE2E2'}
            iconColor={BrandColors.dangerRed}
            title="Wipe All Vault Data"
            subtitle="Irreversibly erase encrypted files and purge encryption keys"
            isDark={isDark}
            danger
            last
            onPress={handleWipeData}
            trailing={<ChevronRight size={18} color={BrandColors.dangerRed} />}
          />
        </SettingsSection>

        {/* 6. Developer Options (hidden until unlocked from the version footer) */}
        {isDeveloperOptionsUnlocked ? (
          <SettingsSection label="DEVELOPER" isDark={isDark}>
            <SettingsRow
              icon={Wrench}
              iconBackground={isDark ? '#2B160C' : '#FFF1E5'}
              iconColor={BrandColors.primary}
              title="Developer Options"
              subtitle="Sandbox tools, diagnostics and LAN screen mirroring"
              isDark={isDark}
              last
              onPress={() => router.push('/developer-options' as any)}
              trailing={<ChevronRight size={18} color={isDark ? '#6B5B52' : '#B9AEA6'} />}
            />
          </SettingsSection>
        ) : null}

        {/* 7. Footer Disclaimer & Version (tap 7 times to reveal developer options) */}
        <AnimatedPressable
          scaleTo={0.98}
          onPress={handleVersionFooterPress}
          accessibilityRole="button"
          accessibilityLabel="Version information"
          style={styles.footerContainer}>
          <ShieldAlert size={14} color={isDark ? '#6B5B52' : '#B9AEA6'} />
          <Text style={[styles.footerNotice, isDark && styles.textSecondaryDark]}>
            BUBI Vault v1.0.0 · Offline First · Zero Analytics · Zero Telemetry
          </Text>
        </AnimatedPressable>
      </ScrollView>

      {/* Password Change Modal */}
      <Modal
        visible={isPasswordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPasswordModalVisible(false)}
        statusBarTranslucent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, isDark && styles.modalCardDark]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleGroup}>
                <View style={[styles.modalHeaderIcon, isDark && styles.modalHeaderIconDark]}>
                  <KeyRound size={18} color={BrandColors.wordmark} strokeWidth={2.4} />
                </View>
                <View>
                  <Text style={[styles.modalTitle, isDark && styles.textPrimaryDark]}>
                    Change Password
                  </Text>
                  <Text style={[styles.modalSub, isDark && styles.textSecondaryDark]}>
                    Re-encrypt your vault DEK safely
                  </Text>
                </View>
              </View>
              <AnimatedPressable
                scaleTo={0.88}
                onPress={() => setIsPasswordModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={[styles.closeBtn, isDark && styles.closeBtnDark]}>
                <X size={18} color={isDark ? '#A8A29E' : '#78716C'} />
              </AnimatedPressable>
            </View>

            {/* Inputs */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isDark && styles.textSecondaryDark]}>
                Current Master Password
              </Text>
              <View style={[styles.inputBox, isDark && styles.inputBoxDark]}>
                <TextInput
                  style={[styles.inputField, isDark && styles.inputFieldDark]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={isDark ? '#6B5B52' : '#A8A29E'}
                  secureTextEntry={!showCurrentPass}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <AnimatedPressable
                  scaleTo={0.9}
                  onPress={() => setShowCurrentPass(!showCurrentPass)}
                  style={styles.eyeBtn}>
                  {showCurrentPass ? (
                    <EyeOff size={16} color={isDark ? '#A8A29E' : '#78716C'} />
                  ) : (
                    <Eye size={16} color={isDark ? '#A8A29E' : '#78716C'} />
                  )}
                </AnimatedPressable>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isDark && styles.textSecondaryDark]}>
                New Master Password
              </Text>
              <View style={[styles.inputBox, isDark && styles.inputBoxDark]}>
                <TextInput
                  style={[styles.inputField, isDark && styles.inputFieldDark]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Minimum 8 characters"
                  placeholderTextColor={isDark ? '#6B5B52' : '#A8A29E'}
                  secureTextEntry={!showNewPass}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <AnimatedPressable
                  scaleTo={0.9}
                  onPress={() => setShowNewPass(!showNewPass)}
                  style={styles.eyeBtn}>
                  {showNewPass ? (
                    <EyeOff size={16} color={isDark ? '#A8A29E' : '#78716C'} />
                  ) : (
                    <Eye size={16} color={isDark ? '#A8A29E' : '#78716C'} />
                  )}
                </AnimatedPressable>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isDark && styles.textSecondaryDark]}>
                Confirm New Password
              </Text>
              <View style={[styles.inputBox, isDark && styles.inputBoxDark]}>
                <TextInput
                  style={[styles.inputField, isDark && styles.inputFieldDark]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter new password"
                  placeholderTextColor={isDark ? '#6B5B52' : '#A8A29E'}
                  secureTextEntry={!showConfirmPass}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <AnimatedPressable
                  scaleTo={0.9}
                  onPress={() => setShowConfirmPass(!showConfirmPass)}
                  style={styles.eyeBtn}>
                  {showConfirmPass ? (
                    <EyeOff size={16} color={isDark ? '#A8A29E' : '#78716C'} />
                  ) : (
                    <Eye size={16} color={isDark ? '#A8A29E' : '#78716C'} />
                  )}
                </AnimatedPressable>
              </View>
            </View>

            {/* Validation Feedback */}
            {passwordMatch && (
              <View style={styles.feedbackRow}>
                <CheckCircle2 size={13} color="#059669" />
                <Text style={styles.feedbackTextMatch}>Passwords match (8+ characters)</Text>
              </View>
            )}
            {passwordMismatch && (
              <View style={styles.feedbackRow}>
                <Text style={styles.feedbackTextMismatch}>Passwords do not match</Text>
              </View>
            )}

            {/* Submit Button */}
            <AnimatedPressable
              scaleTo={0.97}
              onPress={handleChangePassword}
              disabled={isUpdatingPassword}
              accessibilityRole="button"
              accessibilityLabel="Update master password"
              style={styles.primaryModalBtn}>
              {isUpdatingPassword ? (
                <ActivityIndicator color={BrandColors.foreground} />
              ) : (
                <Text style={styles.primaryModalBtnText}>Update Master Password</Text>
              )}
            </AnimatedPressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF9F7',
  },
  containerDark: {
    backgroundColor: BrandColors.pitchBlack,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8C857E',
    marginTop: 2,
  },
  headerLockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: '#FFF2E8',
    borderWidth: 1,
    borderColor: '#FCD8C1',
  },
  headerLockPillDark: {
    backgroundColor: '#261710',
    borderColor: '#3D2418',
  },
  headerLockText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: BrandColors.wordmark,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  // 1. Vault Hero Status Card
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: '#F0E6DF',
    padding: 16,
    marginBottom: 20,
    ...SoftShadows.card,
  },
  heroCardDark: {
    backgroundColor: '#17120F',
    borderColor: '#261C16',
    shadowColor: '#000000',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  heroIconBoxDark: {
    backgroundColor: '#07241A',
    borderColor: '#0F3E2F',
  },
  heroTextCol: {
    flex: 1,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.2,
  },
  heroStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
    backgroundColor: '#DCFCE7',
  },
  heroStatusPillDark: {
    backgroundColor: '#0F2E22',
  },
  heroStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: BrandColors.securityMint,
  },
  heroStatusPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    fontSize: 11.5,
    color: '#8C857E',
    marginTop: 2,
  },
  heroDivider: {
    height: 1,
    backgroundColor: '#F5EFE9',
    marginVertical: 14,
  },
  heroDividerDark: {
    backgroundColor: '#261C16',
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.2,
  },
  heroStatLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#8C857E',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#F0E6DF',
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#8C857E',
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionLabelDark: {
    color: '#A8A29E',
  },
  sectionLabelDanger: {
    color: BrandColors.dangerRed,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#F0E6DF',
    borderRadius: 20,
    overflow: 'hidden',
    ...SoftShadows.card,
  },
  cardDark: {
    backgroundColor: '#17120F',
    borderColor: '#261C16',
    shadowColor: '#000000',
  },
  cardDanger: {
    borderColor: '#FCA5A5',
  },
  cardDangerDark: {
    borderColor: '#5C1D1D',
  },

  // Rows
  rowWrapper: {
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 68,
    paddingVertical: 10,
  },
  iconWell: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1917',
    letterSpacing: -0.1,
  },
  rowTitleDanger: {
    color: BrandColors.dangerRed,
  },
  rowSubtitle: {
    fontSize: 11,
    color: '#8C857E',
    marginTop: 2,
    lineHeight: 15,
  },
  rowTrailing: {
    flexShrink: 0,
  },
  actionChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.wordmark,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5EFE9',
  },
  rowDividerDark: {
    borderBottomWidth: 1,
    borderBottomColor: '#261C16',
  },

  // Auto-lock Inactivity Block
  autoLockContainer: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  autoLockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  segmentedPillTrack: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 12,
    padding: 3,
    borderRadius: 14,
    backgroundColor: '#F5F5F4',
  },
  segmentedPillTrackDark: {
    backgroundColor: '#241B16',
  },
  segmentPill: {
    flex: 1,
    minWidth: 0,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  segmentPillActive: {
    backgroundColor: '#FFFFFF',
    ...SoftShadows.subtle,
  },
  segmentPillActiveDark: {
    backgroundColor: '#3A261B',
  },
  segmentPillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#78716C',
    textAlign: 'center',
    includeFontPadding: false,
  },
  segmentPillTextActive: {
    color: BrandColors.primaryDeep,
    fontWeight: '800',
  },

  // 3. Appearance Cards
  themeSelectorGrid: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  themeCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#EDE5DE',
    backgroundColor: '#FBF9F7',
  },
  themeCardDark: {
    backgroundColor: '#1E1612',
    borderColor: '#2F1F17',
  },
  themeCardActive: {
    backgroundColor: '#FFF5EC',
    borderColor: BrandColors.primary,
    ...SoftShadows.subtle,
  },
  themeCardActiveDark: {
    backgroundColor: '#2D180D',
    borderColor: BrandColors.primary,
  },
  themeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EDE5DE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  themeIconBoxDark: {
    backgroundColor: '#2B1E17',
  },
  themeIconBoxActive: {
    backgroundColor: BrandColors.primary,
  },
  themeCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716C',
  },
  themeCardLabelActive: {
    color: BrandColors.primaryDeep,
    fontWeight: '800',
  },
  themeActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: BrandColors.primary,
    marginTop: 4,
  },

  // Badges
  badgePill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: '#F5F5F4',
  },
  badgePillDark: {
    backgroundColor: '#241B16',
  },
  badgePillGreen: {
    backgroundColor: '#ECFDF5',
  },
  badgePillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#78716C',
  },
  badgePillTextGreen: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#059669',
  },

  // Footer
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  footerNotice: {
    fontSize: 10.5,
    color: '#A8A29E',
    textAlign: 'center',
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 6, 4, 0.65)',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#F0E6DF',
    ...SoftShadows.modal,
  },
  modalCardDark: {
    backgroundColor: '#17120F',
    borderColor: '#261C16',
    shadowColor: '#000000',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: '#FFF2E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderIconDark: {
    backgroundColor: '#291710',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.2,
  },
  modalSub: {
    fontSize: 11,
    color: '#8C857E',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F4',
  },
  closeBtnDark: {
    backgroundColor: '#241B16',
  },

  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#8C857E',
    marginBottom: 5,
    marginLeft: 2,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 13,
    borderWidth: 1.2,
    borderColor: '#EDE5DE',
    backgroundColor: '#FBF9F7',
  },
  inputBoxDark: {
    backgroundColor: '#221711',
    borderColor: '#322017',
  },
  inputField: {
    flex: 1,
    fontSize: 13.5,
    color: '#1C1917',
    paddingVertical: 8,
  },
  inputFieldDark: {
    color: BrandColors.foreground,
  },
  eyeBtn: {
    padding: 6,
  },

  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
    marginBottom: 14,
    marginLeft: 2,
  },
  feedbackTextMatch: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#059669',
  },
  feedbackTextMismatch: {
    fontSize: 11.5,
    fontWeight: '600',
    color: BrandColors.dangerRed,
  },

  primaryModalBtn: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: BrandColors.primary,
    marginTop: 4,
  },
  primaryModalBtnText: {
    color: BrandColors.foreground,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.1,
  },

  textPrimaryDark: {
    color: BrandColors.foreground,
  },
  textSecondaryDark: {
    color: '#A8A29E',
  },
});
