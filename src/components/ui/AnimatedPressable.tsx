import React, { useMemo } from 'react';
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);

export interface AnimatedPressableProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  activeOpacity?: number;
  springTension?: number;
  springFriction?: number;
  children?: React.ReactNode;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  style,
  scaleTo = 0.96,
  activeOpacity = 0.85,
  springTension = 140,
  springFriction = 8,
  children,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}) => {
  const scaleAnim = useMemo(() => new Animated.Value(1), []);
  const opacityAnim = useMemo(() => new Animated.Value(1), []);

  const handlePressIn = (e: any) => {
    if (disabled) return;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: scaleTo,
        useNativeDriver: Platform.OS !== 'web',
        tension: springTension,
        friction: springFriction,
      }),
      Animated.timing(opacityAnim, {
        toValue: activeOpacity,
        duration: 80,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    if (disabled) return;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: Platform.OS !== 'web',
        tension: springTension,
        friction: springFriction - 1 > 0 ? springFriction - 1 : 4,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
    onPressOut?.(e);
  };

  return (
    <AnimatedPressableComponent
      {...rest}
      style={[
        style,
        {
          transform: [{ scale: scaleAnim }],
          opacity: disabled ? 0.6 : opacityAnim,
        },
      ]}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}>
      {children}
    </AnimatedPressableComponent>
  );
};
