import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  Wrench,
  Zap,
  Trash2,
  ArrowLeft,
  CheckCircle,
  FileBox,
} from 'lucide-react-native';

import { BrandColors } from '@/constants/theme';
import { useVaultStore } from '@/store/vaultStore';
import {
  setupVault,
  unlockWithPassword,
  resetVaultKeys,
  isVaultConfigured,
} from '@/security/keyManager';
import {
  seedDemoDocuments,
  wipeAllVaultData,
} from '@/storage/documentManager';

export default function DevSandboxScreen() {
  const router = useRouter();
  const {
    isConfigured,
    isUnlocked,
    vaultKey,
    documents,
    checkVaultStatus,
    unlockVault,
    lockVault,
    refreshDocuments,
  } = useVaultStore();

  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    checkVaultStatus();
  }, [checkVaultStatus]);

  // One-click bypass / test vault initialize
  const handleInstantBypass = async () => {
    try {
      setIsBusy(true);
      setStatusMessage('Configuring test vault (password: developer1234)...');

      let key: Uint8Array;
      const configured = await isVaultConfigured();

      if (!configured) {
        const setupRes = await setupVault('developer1234');
        key = setupRes.vaultKey;
        setStatusMessage('Seeding 4 mock encrypted files...');
        await seedDemoDocuments(key);
      } else {
        try {
          key = await unlockWithPassword('developer1234');
        } catch {
          // If configured with another password, reset and re-setup
          await wipeAllVaultData();
          await resetVaultKeys();
          const setupRes = await setupVault('developer1234');
          key = setupRes.vaultKey;
          await seedDemoDocuments(key);
        }
      }

      await unlockVault(key);
      await checkVaultStatus();
      setIsBusy(false);
      setStatusMessage('Vault ready! Redirecting to dashboard...');
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 300);
    } catch (err: any) {
      setIsBusy(false);
      Alert.alert('Dev Bypass Error', err.message);
    }
  };

  // Seed sample docs into current vault
  const handleSeedDemoDocs = async () => {
    if (!vaultKey) {
      Alert.alert('Locked', 'Unlock vault first to generate mock documents.');
      return;
    }
    try {
      setIsBusy(true);
      setStatusMessage('Encrypting sample files via AES-256-GCM...');
      await seedDemoDocuments(vaultKey);
      await refreshDocuments();
      setIsBusy(false);
      setStatusMessage('4 demo documents seeded successfully!');
    } catch (err: any) {
      setIsBusy(false);
      Alert.alert('Seed Error', err.message);
    }
  };

  // Factory reset
  const handleFactoryReset = () => {
    Alert.alert(
      'Factory Reset Vault',
      'This will erase all SQLite records, delete all encrypted .enc files, and wipe SecureStore keys.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsBusy(true);
              setStatusMessage('Wiping vault storage and keys...');
              await lockVault();
              await wipeAllVaultData();
              await resetVaultKeys();
              await checkVaultStatus();
              setIsBusy(false);
              setStatusMessage('Vault completely wiped and reset to initial state!');
            } catch (err: any) {
              setIsBusy(false);
              Alert.alert('Reset Error', err.message);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.75}>
          <ArrowLeft size={19} color="#FFFDFB" strokeWidth={2.6} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Developer Sandbox</Text>
          <Text style={styles.headerSub}>needs locker test & diagnostic harness</Text>
        </View>
        <Wrench size={22} color={BrandColors.primary} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* State Monitor */}
        <View style={styles.monitorCard}>
          <Text style={styles.sectionHeading}>SYSTEM DIAGNOSTICS</Text>

          <View style={styles.diagRow}>
            <Text style={styles.diagLabel}>Vault Setup Status</Text>
            <Text style={[styles.diagVal, isConfigured ? styles.valGreen : styles.valAmber]}>
              {isConfigured ? 'CONFIGURED' : 'NOT INITIALIZED'}
            </Text>
          </View>

          <View style={styles.diagRow}>
            <Text style={styles.diagLabel}>Session Lock Status</Text>
            <Text style={[styles.diagVal, isUnlocked ? styles.valGreen : styles.valRed]}>
              {isUnlocked ? 'UNLOCKED (RAM Key Active)' : 'LOCKED'}
            </Text>
          </View>

          <View style={styles.diagRow}>
            <Text style={styles.diagLabel}>Encrypted Documents</Text>
            <Text style={styles.diagValWhite}>{documents.length} records</Text>
          </View>

          <View style={styles.diagRow}>
            <Text style={styles.diagLabel}>Default Test Password</Text>
            <Text style={styles.diagValMono}>developer1234</Text>
          </View>
        </View>

        {statusMessage && (
          <View style={styles.statusToast}>
            <CheckCircle size={16} color="#10B981" />
            <Text style={styles.statusToastText}>{statusMessage}</Text>
          </View>
        )}

        {isBusy && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={BrandColors.primary} />
            <Text style={styles.loadingText}>Executing diagnostic action...</Text>
          </View>
        )}

        {/* Quick Testing Actions */}
        <Text style={styles.actionsHeading}>QUICK DEV ACTIONS</Text>

        <TouchableOpacity
          style={styles.actionBtnPrimary}
          activeOpacity={0.8}
          disabled={isBusy}
          onPress={handleInstantBypass}>
          <View style={styles.actionIconBoxPrimary}>
            <Zap size={22} color="#FFFDFB" />
          </View>
          <View style={styles.actionTextBox}>
            <Text style={styles.actionBtnTitle}>Instant Test Bypass & Launch</Text>
            <Text style={styles.actionBtnDesc}>
              Creates/unlocks test vault with demo files and opens dashboard immediately
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtnSecondary}
          activeOpacity={0.8}
          disabled={isBusy}
          onPress={handleSeedDemoDocs}>
          <View style={styles.actionIconBoxSecondary}>
            <FileBox size={22} color={BrandColors.primary} />
          </View>
          <View style={styles.actionTextBox}>
            <Text style={styles.actionBtnTitle}>Seed 4 Demo Documents</Text>
            <Text style={styles.actionBtnDesc}>
              Adds Aadhaar, PAN card, Certificate, and Video KYC
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtnDanger}
          activeOpacity={0.8}
          disabled={isBusy}
          onPress={handleFactoryReset}>
          <View style={styles.actionIconBoxDanger}>
            <Trash2 size={22} color="#EF4444" />
          </View>
          <View style={styles.actionTextBox}>
            <Text style={styles.actionBtnTitleDanger}>Factory Reset & Wipe All</Text>
            <Text style={styles.actionBtnDescDanger}>
              Purges SQLite, encrypted files, and SecureStore keys
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.returnButton}
          activeOpacity={0.8}
          onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.returnButtonText}>Back to Main Vault</Text>
        </TouchableOpacity>
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
    backgroundColor: 'transparent',
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
  monitorCard: {
    backgroundColor: '#140F0D',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F1713',
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#78716C',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1412',
  },
  diagLabel: {
    fontSize: 13,
    color: '#A8A29E',
  },
  diagVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  diagValWhite: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFDFB',
  },
  diagValMono: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: BrandColors.primary,
    fontWeight: '600',
  },
  valGreen: {
    color: '#10B981',
  },
  valAmber: {
    color: '#F59E0B',
  },
  valRed: {
    color: '#EF4444',
  },
  statusToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064E3B',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusToastText: {
    fontSize: 12,
    color: '#D1FAE5',
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginBottom: 14,
  },
  loadingText: {
    fontSize: 12,
    color: BrandColors.primary,
    marginLeft: 8,
  },
  actionsHeading: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#78716C',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1512',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.2,
    borderColor: BrandColors.primary,
  },
  actionIconBoxPrimary: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: BrandColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionTextBox: {
    flex: 1,
  },
  actionBtnTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFDFB',
  },
  actionBtnDesc: {
    fontSize: 11,
    color: '#A8A29E',
    marginTop: 2,
    lineHeight: 15,
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#140F0D',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#291C16',
  },
  actionIconBoxSecondary: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#261710',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionBtnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#160B09',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#7F1D1D',
  },
  actionIconBoxDanger: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#371313',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionBtnTitleDanger: {
    fontSize: 15,
    fontWeight: '700',
    color: '#EF4444',
  },
  actionBtnDescDanger: {
    fontSize: 11.5,
    color: '#9CA3AF',
    marginTop: 3,
    lineHeight: 16,
  },
  returnButton: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1F1713',
    alignItems: 'center',
    justifyContent: 'center',
  },
  returnButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFDFB',
  },
});
