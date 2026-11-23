import React, { useState, useMemo } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  KeyRound,
  AlertTriangle,
  Trash2,
  Eye,
  EyeOff,
  ShieldAlert,
  Check,
  AlertCircle,
} from 'lucide-react-native';
import { BrandColors, SoftShadows } from '../../constants/theme';
import {
  recoverVaultWithPhrase,
  resetVaultKeys,
} from '../../security/keyManager';
import { wipeAllVaultData } from '../../storage/documentManager';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ForgotPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  onVaultRecovered: (newVaultKey: Uint8Array) => void;
  onVaultWiped: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  visible,
  onClose,
  onVaultRecovered,
  onVaultWiped,
}) => {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const [activeTab, setActiveTab] = useState<'recovery' | 'wipe'>('recovery');
  const [recoveryPhraseInput, setRecoveryPhraseInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const wordCount = useMemo(() => {
    const trimmed = recoveryPhraseInput.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  }, [recoveryPhraseInput]);

  const passwordValidation = useMemo(() => {
    if (!newPassword && !confirmNewPassword) return null;
    if (newPassword.length > 0 && newPassword.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' };
    }
    if (confirmNewPassword.length > 0) {
      if (newPassword === confirmNewPassword) {
        return { valid: true, message: 'Passwords match' };
      } else {
        return { valid: false, message: 'Passwords do not match' };
      }
    }
    return null;
  }, [newPassword, confirmNewPassword]);

  const handleRecover = async () => {
    if (!recoveryPhraseInput.trim()) {
      Alert.alert('Missing Words', 'Please enter your 12 recovery words separated by spaces.');
      return;
    }
    const words = recoveryPhraseInput.trim().split(/\s+/).filter(Boolean);
    if (words.length < 12) {
      Alert.alert('Incomplete Phrase', `You entered ${words.length} words. 12 words are required.`);
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Weak Password', 'New Master Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Mismatch', 'New password and confirmation do not match.');
      return;
    }

    try {
      setIsProcessing(true);
      const vaultKey = await recoverVaultWithPhrase(recoveryPhraseInput, newPassword);
      setIsProcessing(false);
      Alert.alert(
        'Recovery Successful',
        'Your Master Password has been reset. All existing documents have been preserved.',
        [
          {
            text: 'Open Locker',
            onPress: () => {
              onClose();
              onVaultRecovered(vaultKey);
            },
          },
        ]
      );
    } catch (err: any) {
      setIsProcessing(false);
      Alert.alert('Recovery Failed', err.message || 'Could not verify recovery phrase.');
    }
  };

  const handleWipe = () => {
    Alert.alert(
      'Permanent Reset',
      'Are you sure you want to completely wipe all encrypted documents and reset this locker?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe & Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsProcessing(true);
              await wipeAllVaultData();
              await resetVaultKeys();
              setIsProcessing(false);
              onClose();
              onVaultWiped();
            } catch (err: any) {
              setIsProcessing(false);
              Alert.alert('Reset Error', err.message);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={styles.modalRoot}>
        {/* Backdrop Dismiss Touch */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetContainer}
          pointerEvents="box-none">
          <View
            style={[
              styles.sheet,
              isDark && styles.sheetDark,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}>
            <View style={[styles.sheetHandle, isDark && styles.sheetHandleDark]} />

            {/* Header with Title & Icon Group */}
            <View style={styles.headerRow}>
              <View style={styles.headerTitleGroup}>
                <View style={[styles.headerIconBox, isDark && styles.headerIconBoxDark]}>
                  {activeTab === 'recovery' ? (
                    <KeyRound size={17} color={BrandColors.wordmark} strokeWidth={2.4} />
                  ) : (
                    <ShieldAlert size={17} color="#EF4444" strokeWidth={2.4} />
                  )}
                </View>
                <View style={styles.headerCopy}>
                  <Text style={[styles.sheetTitle, isDark && styles.textPrimaryDark]}>
                    Account Recovery
                  </Text>
                  <Text style={[styles.sheetSubtitle, isDark && styles.textSecondaryDark]}>
                    {activeTab === 'recovery'
                      ? 'Restore with 12-word recovery phrase'
                      : 'Zero-knowledge reset'}
                  </Text>
                </View>
              </View>

              <AnimatedPressable
                scaleTo={0.88}
                onPress={onClose}
                style={[styles.closeBtn, isDark && styles.closeBtnDark]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Close recovery modal">
                <X size={16} color={isDark ? '#A8A29E' : '#78716C'} />
              </AnimatedPressable>
            </View>

            {/* Segmented Control */}
            <View style={[styles.tabRow, isDark && styles.tabRowDark]}>
              <AnimatedPressable
                style={[
                  styles.tab,
                  activeTab === 'recovery' && (isDark ? styles.tabActiveDark : styles.tabActive),
                ]}
                scaleTo={0.96}
                onPress={() => setActiveTab('recovery')}>
                <Text
                  style={[
                    styles.tabText,
                    isDark && styles.textSecondaryDark,
                    activeTab === 'recovery' && (isDark ? styles.tabTextActiveDark : styles.tabTextActive),
                  ]}>
                  Recovery Phrase
                </Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={[
                  styles.tab,
                  activeTab === 'wipe' && (isDark ? styles.tabActiveDark : styles.tabActive),
                ]}
                scaleTo={0.96}
                onPress={() => setActiveTab('wipe')}>
                <Text
                  style={[
                    styles.tabText,
                    isDark && styles.textSecondaryDark,
                    activeTab === 'wipe' && (isDark ? styles.tabTextActiveDark : styles.tabTextActive),
                  ]}>
                  Reset Vault
                </Text>
              </AnimatedPressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
              contentContainerStyle={styles.scrollContent}>
              {activeTab === 'recovery' ? (
                <View style={styles.formContainer}>
                  {/* Recovery Words Box */}
                  <View style={styles.inputGroup}>
                    <View style={styles.inputLabelRow}>
                      <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>
                        12 Recovery Words
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {recoveryPhraseInput.length > 0 && (
                          <TouchableOpacity
                            onPress={() => setRecoveryPhraseInput('')}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                            <Text style={styles.clearLinkText}>Clear</Text>
                          </TouchableOpacity>
                        )}
                        <View
                          style={[
                            styles.wordCountBadge,
                            isDark && styles.wordCountBadgeDark,
                            wordCount === 12 && styles.wordCountBadgeComplete,
                            wordCount > 12 && styles.wordCountBadgeOver,
                          ]}>
                          <Text
                            style={[
                              styles.wordCountText,
                              isDark && styles.wordCountTextDark,
                              wordCount === 12 && styles.wordCountTextComplete,
                              wordCount > 12 && styles.wordCountTextOver,
                            ]}>
                            {wordCount === 12 ? '12/12 Ready' : `${wordCount}/12`}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={[styles.textAreaBox, isDark && styles.inputBoxDark]}>
                      <TextInput
                        style={[styles.textInputMulti, isDark && styles.textPrimaryDark]}
                        multiline
                        numberOfLines={3}
                        placeholder="e.g. shield anchor harbor beacon..."
                        placeholderTextColor={isDark ? '#6B5B52' : '#A8A29E'}
                        value={recoveryPhraseInput}
                        onChangeText={setRecoveryPhraseInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="next"
                      />
                    </View>
                  </View>

                  {/* New Master Password */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>
                      New Master Password
                    </Text>
                    <View style={[styles.passwordBox, isDark && styles.inputBoxDark]}>
                      <TextInput
                        style={[styles.passwordInput, isDark && styles.textPrimaryDark]}
                        secureTextEntry={!showNewPassword}
                        placeholder="At least 8 characters"
                        placeholderTextColor={isDark ? '#6B5B52' : '#A8A29E'}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="next"
                      />
                      <AnimatedPressable
                        scaleTo={0.9}
                        onPress={() => setShowNewPassword((v) => !v)}
                        style={styles.eyeBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        {showNewPassword ? (
                          <EyeOff size={17} color={isDark ? '#A8A29E' : '#78716C'} />
                        ) : (
                          <Eye size={17} color={isDark ? '#A8A29E' : '#78716C'} />
                        )}
                      </AnimatedPressable>
                    </View>
                  </View>

                  {/* Confirm New Password */}
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, isDark && styles.textSecondaryDark]}>
                      Confirm New Password
                    </Text>
                    <View style={[styles.passwordBox, isDark && styles.inputBoxDark]}>
                      <TextInput
                        style={[styles.passwordInput, isDark && styles.textPrimaryDark]}
                        secureTextEntry={!showConfirmPassword}
                        placeholder="Re-enter new password"
                        placeholderTextColor={isDark ? '#6B5B52' : '#A8A29E'}
                        value={confirmNewPassword}
                        onChangeText={setConfirmNewPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={handleRecover}
                      />
                      <AnimatedPressable
                        scaleTo={0.9}
                        onPress={() => setShowConfirmPassword((v) => !v)}
                        style={styles.eyeBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        {showConfirmPassword ? (
                          <EyeOff size={17} color={isDark ? '#A8A29E' : '#78716C'} />
                        ) : (
                          <Eye size={17} color={isDark ? '#A8A29E' : '#78716C'} />
                        )}
                      </AnimatedPressable>
                    </View>
                  </View>

                  {/* Live Validation Feedback Pill */}
                  {passwordValidation && (
                    <View
                      style={[
                        styles.validationPill,
                        passwordValidation.valid
                          ? styles.validationPillSuccess
                          : styles.validationPillWarning,
                      ]}>
                      {passwordValidation.valid ? (
                        <Check size={12} color="#059669" strokeWidth={2.4} style={{ marginRight: 5 }} />
                      ) : (
                        <AlertCircle size={12} color="#D97706" strokeWidth={2.4} style={{ marginRight: 5 }} />
                      )}
                      <Text
                        style={[
                          styles.validationPillText,
                          passwordValidation.valid
                            ? styles.validationPillTextSuccess
                            : styles.validationPillTextWarning,
                        ]}>
                        {passwordValidation.message}
                      </Text>
                    </View>
                  )}

                  <AnimatedPressable
                    style={styles.primaryBtn}
                    scaleTo={0.96}
                    onPress={handleRecover}
                    disabled={isProcessing}
                    accessibilityRole="button"
                    accessibilityLabel="Recover Vault">
                    {isProcessing ? (
                      <ActivityIndicator color="#FFFDFB" />
                    ) : (
                      <>
                        <KeyRound size={18} color="#FFFDFB" strokeWidth={2.4} style={{ marginRight: 8 }} />
                        <Text style={styles.primaryBtnText}>Recover Vault</Text>
                      </>
                    )}
                  </AnimatedPressable>
                </View>
              ) : (
                <View style={styles.wipeContainer}>
                  <View style={[styles.dangerCard, isDark && styles.dangerCardDark]}>
                    <View style={styles.dangerHeaderRow}>
                      <View style={[styles.dangerIconBox, isDark && styles.dangerIconBoxDark]}>
                        <AlertTriangle size={20} color="#EF4444" strokeWidth={2.2} />
                      </View>
                      <View style={styles.dangerHeaderCopy}>
                        <Text style={[styles.dangerCardTitle, isDark && styles.textPrimaryDark]}>
                          Zero-Knowledge Notice
                        </Text>
                        <Text style={[styles.dangerCardMeta, isDark && styles.textSecondaryDark]}>
                          Irreversible security reset
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.wipeDesc, isDark && styles.textSecondaryDark]}>
                      Because needs locker uses client-side zero-knowledge encryption, your documents cannot be recovered without either your Master Password or your 12-word Recovery Key.
                    </Text>
                    <Text style={[styles.wipeDescSub, isDark && styles.textSecondaryDark]}>
                      If you lost both, you can wipe all stored ciphertext and start over with a fresh locker.
                    </Text>
                  </View>

                  <AnimatedPressable
                    style={styles.wipeBtn}
                    scaleTo={0.96}
                    onPress={handleWipe}
                    disabled={isProcessing}
                    accessibilityRole="button"
                    accessibilityLabel="Wipe Vault and Start Fresh">
                    {isProcessing ? (
                      <ActivityIndicator color="#FFFDFB" />
                    ) : (
                      <>
                        <Trash2 size={18} color="#FFFDFB" strokeWidth={2.2} style={{ marginRight: 8 }} />
                        <Text style={styles.wipeBtnText}>Wipe Vault & Start Fresh</Text>
                      </>
                    )}
                  </AnimatedPressable>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 6, 4, 0.55)',
  },
  sheetContainer: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1.2,
    borderLeftWidth: 1.2,
    borderRightWidth: 1.2,
    borderColor: '#F0E6DF',
    ...SoftShadows.sheet,
  },
  sheetDark: {
    backgroundColor: '#17120F',
    borderColor: '#261C16',
    shadowColor: '#000000',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E7E5E4',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHandleDark: {
    backgroundColor: '#3A2A22',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#FFF4ED',
    borderWidth: 1,
    borderColor: '#FCD8C1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerIconBoxDark: {
    backgroundColor: '#2B160C',
    borderColor: '#422415',
  },
  headerCopy: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.4,
  },
  sheetSubtitle: {
    fontSize: 11.5,
    color: '#8C857E',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF5F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0E6DF',
  },
  closeBtnDark: {
    backgroundColor: '#261C16',
    borderColor: '#36231B',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#FAF5F0',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F0E6DF',
  },
  tabRowDark: {
    backgroundColor: '#261C16',
    borderColor: '#36231B',
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    ...SoftShadows.subtle,
  },
  tabActiveDark: {
    backgroundColor: '#17120F',
    borderWidth: 1,
    borderColor: '#3D281E',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716C',
  },
  tabTextActive: {
    color: BrandColors.primaryDeep,
    fontWeight: '700',
  },
  tabTextActiveDark: {
    color: '#FFA25B',
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 4,
  },
  formContainer: {
    paddingBottom: 4,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    marginLeft: 2,
  },
  inputLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#44403C',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
    marginLeft: 2,
  },
  clearLinkText: {
    fontSize: 11,
    color: BrandColors.primary,
    fontWeight: '600',
  },
  wordCountBadge: {
    backgroundColor: '#F5F5F4',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E7E5E4',
  },
  wordCountBadgeDark: {
    backgroundColor: '#241B16',
    borderColor: '#36231B',
  },
  wordCountBadgeComplete: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  wordCountBadgeOver: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  wordCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#78716C',
  },
  wordCountTextDark: {
    color: '#A8A29E',
  },
  wordCountTextComplete: {
    color: '#059669',
  },
  wordCountTextOver: {
    color: '#D97706',
  },
  textAreaBox: {
    backgroundColor: '#FBF9F7',
    borderWidth: 1.2,
    borderColor: '#EDE5DE',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  textInputMulti: {
    fontSize: 14,
    color: '#1C1917',
    minHeight: 60,
    textAlignVertical: 'top',
    paddingTop: 2,
  },
  passwordBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF9F7',
    borderWidth: 1.2,
    borderColor: '#EDE5DE',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
  },
  inputBoxDark: {
    backgroundColor: '#221711',
    borderColor: '#322017',
  },
  passwordInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: '#1C1917',
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
  },
  validationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  validationPillSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  validationPillWarning: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  validationPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  validationPillTextSuccess: {
    color: '#059669',
  },
  validationPillTextWarning: {
    color: '#D97706',
  },
  primaryBtn: {
    width: '100%',
    height: 50,
    backgroundColor: BrandColors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    ...SoftShadows.button,
  },
  primaryBtnText: {
    color: '#FFFDFB',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  wipeContainer: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  dangerCard: {
    backgroundColor: '#FFF7F7',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.2,
    borderColor: '#FEE2E2',
    marginBottom: 16,
  },
  dangerCardDark: {
    backgroundColor: '#221212',
    borderColor: '#3C1A1A',
  },
  dangerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dangerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  dangerIconBoxDark: {
    backgroundColor: '#3E1919',
  },
  dangerHeaderCopy: {
    flex: 1,
  },
  dangerCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1C1917',
    letterSpacing: -0.2,
  },
  dangerCardMeta: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
    marginTop: 1,
  },
  wipeDesc: {
    fontSize: 12.5,
    color: '#78716C',
    lineHeight: 18,
    marginBottom: 8,
  },
  wipeDescSub: {
    fontSize: 11.5,
    color: '#A8A29E',
    lineHeight: 16,
  },
  wipeBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#EF4444',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...SoftShadows.button,
  },
  wipeBtnText: {
    color: '#FFFDFB',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  textPrimaryDark: {
    color: '#FFFDFB',
  },
  textSecondaryDark: {
    color: '#A8A29E',
  },
});
