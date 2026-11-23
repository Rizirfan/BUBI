import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path, Rect, Circle } from 'react-native-svg';

const folderPngAsset = require('../../../assets/icons/folder.png');

export interface CategoryIconProps {
  size?: number;
  isDark?: boolean;
  useRasterImage?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Responsive Folder Icon matching the user's flat folder graphic.
 * Adapts dynamically to light and dark themes with vector crispness.
 */
export const FolderCategoryIcon: React.FC<CategoryIconProps> = ({
  size = 46,
  isDark = false,
  useRasterImage = false,
  style,
}) => {
  if (useRasterImage) {
    return (
      <View style={[styles.center, { width: size, height: size }, style]}>
        <Image
          source={folderPngAsset}
          style={{ width: size, height: size }}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      </View>
    );
  }

  // Responsive theme colors:
  // Light: Exact sky-blue palette from user's image (#56B2E3, #FFFFFF, #98CFEF)
  // Dark: Rich dark-mode cyan/ocean tones that sit comfortably on dark obsidian backgrounds
  const backColor = isDark ? '#236F9E' : '#56B2E3';
  const paperColor = isDark ? '#D9E8F5' : '#FFFFFF';
  const frontColor = isDark ? '#469DD0' : '#98CFEF';

  return (
    <View style={[styles.center, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
        {/* Back Tab & Folder Body */}
        <Path
          d="M 0 70 C 0 49 16 32 36 32 L 155 32 C 174 32 191 42 201 58 L 217 83 C 226 97 241 105 258 105 L 476 105 C 496 105 512 121 512 141 L 512 442 C 512 462 496 479 476 479 L 36 479 C 16 479 0 462 0 442 Z"
          fill={backColor}
        />
        {/* Inner Paper Insert */}
        <Rect x={27} y={120} width={458} height={90} rx={20} fill={paperColor} />
        {/* Front Pocket */}
        <Rect x={0} y={163} width={512} height={316} rx={38} fill={frontColor} />
      </Svg>
    </View>
  );
};

/**
 * Responsive Photos Category Icon designed in the matching flat 2D aesthetic.
 * Features a warm sunset/peach layered photo card.
 */
export const PhotosCategoryIcon: React.FC<CategoryIconProps> = ({
  size = 46,
  isDark = false,
  style,
}) => {
  const backCardColor = isDark ? '#8C4217' : '#FDBA74';
  const frontCardColor = isDark ? '#C84600' : '#FF7A00';
  const innerCanvasColor = isDark ? '#22140D' : '#FFFDFB';
  const sunColor = isDark ? '#FFA05C' : '#FF7A00';
  const backHillColor = isDark ? '#9E4E20' : '#FDBA74';
  const frontHillColor = isDark ? '#FF8A34' : '#FB923C';

  return (
    <View style={[styles.center, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
        {/* Offset Back Card */}
        <Rect
          x={44}
          y={36}
          width={436}
          height={410}
          rx={38}
          fill={backCardColor}
          transform="rotate(3 262 241)"
        />
        {/* Front Photo Card */}
        <Rect x={16} y={64} width={460} height={410} rx={38} fill={frontCardColor} />
        {/* Inner Photo Frame */}
        <Rect x={44} y={92} width={404} height={354} rx={24} fill={innerCanvasColor} />
        {/* Sun / Moon */}
        <Circle cx={130} cy={175} r={32} fill={sunColor} />
        {/* Back Hill */}
        <Path
          d="M 64 426 L 195 270 C 205 258 221 258 231 270 L 315 370 L 345 334 C 355 322 371 322 381 334 L 438 426 Z"
          fill={backHillColor}
        />
        {/* Front Hill */}
        <Path
          d="M 180 426 L 290 300 C 300 288 316 288 326 300 L 428 426 Z"
          fill={frontHillColor}
        />
      </Svg>
    </View>
  );
};

/**
 * Responsive Videos Category Icon designed in the matching flat 2D aesthetic.
 * Features an emerald/mint cinema player card with film perforations and play glyph.
 */
export const VideosCategoryIcon: React.FC<CategoryIconProps> = ({
  size = 46,
  isDark = false,
  style,
}) => {
  const backCardColor = isDark ? '#064E3B' : '#059669';
  const frontCardColor = isDark ? '#047857' : '#10B981';
  const innerCanvasColor = isDark ? '#0B1F17' : '#FFFDFB';
  const playCircleColor = isDark ? '#10B981' : '#059669';
  const playGlyphColor = '#FFFFFF';
  const perfColor = isDark ? '#34D399' : '#A7F3D0';

  return (
    <View style={[styles.center, { width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
        {/* Back Film Card */}
        <Rect x={16} y={36} width={480} height={442} rx={38} fill={backCardColor} />
        {/* Front Player Face */}
        <Rect x={16} y={76} width={480} height={402} rx={38} fill={frontCardColor} />
        {/* Film Strip Perforations on Top Flap */}
        <Rect x={56} y={48} width={40} height={18} rx={6} fill={perfColor} />
        <Rect x={126} y={48} width={40} height={18} rx={6} fill={perfColor} />
        <Rect x={196} y={48} width={40} height={18} rx={6} fill={perfColor} />
        <Rect x={266} y={48} width={40} height={18} rx={6} fill={perfColor} />
        <Rect x={336} y={48} width={40} height={18} rx={6} fill={perfColor} />
        <Rect x={406} y={48} width={40} height={18} rx={6} fill={perfColor} />
        {/* Inner Screen */}
        <Rect x={44} y={104} width={424} height={346} rx={24} fill={innerCanvasColor} />
        {/* Play Circle */}
        <Circle cx={256} cy={277} r={66} fill={playCircleColor} />
        {/* Play Triangle */}
        <Path
          d="M 240 245 C 240 238 248 233 254 237 L 294 269 C 300 273 300 281 294 285 L 254 317 C 248 321 240 316 240 309 Z"
          fill={playGlyphColor}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
