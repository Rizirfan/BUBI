import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  ArrowLeft,
  ChevronRight,
  Monitor,
  ShieldAlert,
  Wrench,
} from 'lucide-react-native';

import { BrandColors } from '@/constants/theme';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { useSettingsStore } from '@/store/settingsStore';

type DeveloperToolProps = {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  title: string;
  subtitle: string;
  badge: string;
  onPress: () => void;
};

function DeveloperTool({ icon: Icon, title, subtitle, badge, onPress }: DeveloperToolProps) {
  return (
    <AnimatedPressable
      scaleTo={0.98}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={styles.toolCard}>
      <View style={styles.toolIconWell}>
        <Icon size={22} color={BrandColors.primary} strokeWidth={2.2} />
      </View>
      <View style={styles.toolText}>
        <View style={styles.toolTitleRow}>
          <Text style={styles.toolTitle}>{title}</Text>
          <View style={styles.toolBadge}>
            <Text style={styles.toolBadgeText}>{badge}</Text>
          </View>
        </View>
        <Text style={styles.toolSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight size={18} color="#78716C" />
    </AnimatedPressable>
  );
}

export default function DeveloperOptionsScreen() {
  const hideDeveloperOptions = useSettingsStore((state) => state.hideDeveloperOptions);

  const handleHide = () => {
    Alert.alert(
      'Hide developer options?',
      'The version footer in Settings will need 7 taps again to bring them back.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Hide',
          style: 'destructive',
          onPress: async () => {
            await hideDeveloperOptions();
            router.back();
          },
        },
      ]
    );
  };

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
          <Text style={styles.headerTitle}>Developer Options</Text>
          <Text style={styles.headerSub}>local testing tools · hidden from normal use</Text>
        </View>
        <Wrench size={22} color={BrandColors.primary} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.warningCard}>
          <ShieldAlert size={17} color="#F59E0B" />
          <Text style={styles.warningText}>
            These tools are for development only. Never expose a vault screen while it is unlocked.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>TOOLS</Text>

        <DeveloperTool
          icon={Wrench}
          title="Developer Sandbox"
          subtitle="Vault bypass, demo documents and factory reset diagnostics"
          badge="VAULT"
          onPress={() => router.push('/dev')}
        />

        <DeveloperTool
          icon={Monitor}
          title="Screen Mirroring"
          subtitle="Stream this device screen to another device on the same Wi-Fi"
          badge="LAN"
          onPress={() => router.push('/screen-mirror' as any)}
        />

        <AnimatedPressable
          scaleTo={0.98}
          onPress={handleHide}
          accessibilityRole="button"
          accessibilityLabel="Hide developer options"
          style={styles.hideButton}>
          <Text style={styles.hideButtonText}>Hide developer options</Text>
        </AnimatedPressable>
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
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#2B1D08',
    borderWidth: 1,
    borderColor: '#5C4210',
    borderRadius: 14,
    padding: 12,
    marginBottom: 22,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#FDE9C8',
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#78716C',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#140F0D',
    borderWidth: 1,
    borderColor: '#291C16',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  toolIconWell: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#2B160C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toolText: {
    flex: 1,
  },
  toolTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFDFB',
  },
  toolBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#2B160C',
  },
  toolBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: BrandColors.primary,
    letterSpacing: 0.5,
  },
  toolSubtitle: {
    fontSize: 11.5,
    lineHeight: 16,
    color: '#A8A29E',
    marginTop: 3,
  },
  hideButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3F2A20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hideButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A8A29E',
  },
});
