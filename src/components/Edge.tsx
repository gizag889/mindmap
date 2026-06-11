import React from 'react';
import { Line } from 'react-native-svg';
import Animated, { useAnimatedProps, withSpring } from 'react-native-reanimated';

const AnimatedLine = Animated.createAnimatedComponent(Line);

interface EdgeProps {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  isActive: boolean;
}

export const Edge: React.FC<EdgeProps> = ({ sourceX, sourceY, targetX, targetY, isActive }) => {
  const animatedProps = useAnimatedProps(() => {
    return {
      x1: withSpring(sourceX),
      y1: withSpring(sourceY),
      x2: withSpring(targetX),
      y2: withSpring(targetY),
      strokeOpacity: withSpring(isActive ? 0.8 : 0.2),
    };
  }, [sourceX, sourceY, targetX, targetY, isActive]);

  return (
    <AnimatedLine
      animatedProps={animatedProps}
      stroke="#60a5fa"
      strokeWidth="2"
    />
  );
};
