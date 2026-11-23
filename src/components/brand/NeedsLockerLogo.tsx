import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Svg, {
  Rect,
  Path,
  Defs,
  LinearGradient,
  Stop,
  Filter,
  FeDropShadow,
  G,
  Circle,
} from 'react-native-svg';

export interface LogoProps {
  size?: number;
  monochrome?: boolean;
}

/**
 * Official Mascot Padlock Icon (Solid, Crisp, Vector Mascot)
 * - Solid vibrant Tangerine-to-Deep-Orange squircle container
 * - Solid off-white/cream padlock body and shackle
 * - Center minimalist keyhole emblem
 */
export const NeedsLockerAppIcon: React.FC<LogoProps> = ({ size = 96, monochrome = false }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Defs>
        {/* Background Squircle Gradient */}
        <LinearGradient id="nlOrange" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FF7E00" />
          <Stop offset="100%" stopColor="#E64800" />
        </LinearGradient>

        {/* Ambient Drop Shadow */}
        <Filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
          <FeDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#8B2500" floodOpacity="0.25" />
        </Filter>

        {/* Emblem Gradient */}
        <LinearGradient id="emblemGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#D94B00" />
          <Stop offset="100%" stopColor="#B33900" />
        </LinearGradient>
      </Defs>

      {/* 1. Base Squircle */}
      <Rect
        x="10"
        y="10"
        width="100"
        height="100"
        rx="26"
        fill={monochrome ? '#0A0604' : 'url(#nlOrange)'}
      />

      {/* 2. Solid Mascot Padlock Silhouette */}
      <G filter={monochrome ? undefined : 'url(#dropShadow)'}>
        {/* Shackle: Symmetrically centered loop */}
        <Path
          d="M45 54 V45 C45 36.7, 51.7 30, 60 30 C68.3 30, 75 36.7, 75 45 V54"
          stroke="#FFFDFB"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />

        {/* Lock Body: Solid rounded square base */}
        <Rect
          x="33"
          y="50"
          width="54"
          height="44"
          rx="14"
          fill="#FFFDFB"
        />

        {/* 3. Center Emblem: Clean minimalist keyhole */}
        <G>
          {/* Keyhole Circle Head */}
          <Circle
            cx="60"
            cy="69.5"
            r="3.6"
            fill={monochrome ? '#0A0604' : 'url(#emblemGrad)'}
          />
          {/* Keyhole Tapered Slot */}
          <Path
            d="M58.3 70.5 L61.7 70.5 L62.8 77 C62.8 77.8, 61.8 78.4, 60 78.4 C58.2 78.4, 57.2 77.8, 57.2 77 Z"
            fill={monochrome ? '#0A0604' : 'url(#emblemGrad)'}
          />
        </G>
      </G>
    </Svg>
  );
};

const textLogoAsset = require('../../../assets/brand/text-logo.png');

export interface WordmarkProps {
  size?: 'small' | 'medium' | 'large';
  height?: number;
  width?: number;
}

/**
 * Official Brand Name Logo: `needs`
 * Renders the provided official high-res `text-logo.png` with exact 2.7829 aspect ratio.
 */
export const NeedsWordmark: React.FC<WordmarkProps> = ({
  size = 'medium',
  height,
  width,
}) => {
  let targetHeight = 30;
  if (height) {
    targetHeight = height;
  } else if (size === 'small') {
    targetHeight = 22;
  } else if (size === 'large') {
    targetHeight = 44;
  }
  const targetWidth = width ?? Math.round(targetHeight * 2.7829);

  return (
    <View style={styles.wordmarkContainer}>
      <Image
        source={textLogoAsset}
        style={{ width: targetWidth, height: targetHeight }}
        contentFit="contain"
        priority="high"
      />
    </View>
  );
};

export const NeedsLockerWordmark = NeedsWordmark;

/**
 * Compact Top Bar Lockup (Squircle Icon + `needs` Name Logo)
 * Used in Dashboard navigation header.
 */
export const NeedsHorizontalLogo: React.FC<{
  height?: number;
  wordmarkHeight?: number;
  monochrome?: boolean;
}> = ({ height = 34, wordmarkHeight, monochrome = false }) => {
  const iconSize = height + 4;
  const wmHeight = wordmarkHeight ?? Math.max(28, height - 4);
  return (
    <View style={styles.horizontalLockup}>
      <NeedsLockerAppIcon size={iconSize} monochrome={monochrome} />
      <View style={{ marginLeft: 9 }}>
        <NeedsWordmark height={wmHeight} />
      </View>
    </View>
  );
};

export const NeedsLockerHorizontalLogo = NeedsHorizontalLogo;

const styles = StyleSheet.create({
  wordmarkContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalLockup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default NeedsLockerAppIcon;
