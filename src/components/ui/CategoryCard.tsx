import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { BrandColors, SoftShadows } from '../../constants/theme';
import { DocumentCategory } from '../../types/document';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';

interface CategoryCardProps {
  category: DocumentCategory;
  title: string;
  count: number;
  imageSource: any;
  isSelected: boolean;
  onPress: () => void;
}

const CategoryCardComponent: React.FC<CategoryCardProps> = ({
  title,
  count,
  imageSource,
  isSelected,
  onPress,
}) => {
  return (
    <AnimatedPressable
      scaleTo={0.94}
      onPress={onPress}
      style={[
        styles.card,
        isSelected && styles.cardSelected,
      ]}>
      <View style={styles.imageContainer}>
        <Image
          source={imageSource}
          style={styles.image}
          contentFit="contain"
          transition={150}
          cachePolicy="memory-disk"
        />
      </View>
      <View style={styles.infoContainer}>
        <Text style={[styles.title, isSelected && styles.titleSelected]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.countText, isSelected && styles.countTextSelected]}>
          {count} {count === 1 ? 'item' : 'items'}
        </Text>
      </View>
    </AnimatedPressable>
  );
};

export const CategoryCard = React.memo(CategoryCardComponent);
CategoryCard.displayName = 'CategoryCard';

const styles = StyleSheet.create({
  card: {
    width: 122,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    marginRight: 10,
    borderWidth: 1.2,
    borderColor: '#EBE5DF',
    ...SoftShadows.card,
  },
  cardSelected: {
    borderColor: BrandColors.primary,
    backgroundColor: '#FFF7F2',
    ...SoftShadows.button,
  },
  imageContainer: {
    width: '100%',
    height: 74,
    borderRadius: 11,
    backgroundColor: 'transparent',
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    paddingHorizontal: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#292524',
    letterSpacing: -0.2,
  },
  titleSelected: {
    color: BrandColors.primaryDeep,
  },
  countText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#78716C',
    marginTop: 2,
  },
  countTextSelected: {
    color: BrandColors.wordmark,
    fontWeight: '600',
  },
});
