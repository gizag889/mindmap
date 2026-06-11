import React from 'react';
import { G, Rect, Text } from 'react-native-svg';
import Animated, { useAnimatedProps, withSpring } from 'react-native-reanimated';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface NodeProps {
  id: string;
  label: string;
  x: number;
  y: number;
  isActive: boolean;
  onPress: (id: string) => void;
}

export const Node: React.FC<NodeProps> = ({ id, label, x, y, isActive, onPress }) => {
  const animatedProps = useAnimatedProps(() => {
    return {
      x: withSpring(x),
      y: withSpring(y),
      opacity: withSpring(isActive ? 1 : 0.4),
      scale: withSpring(isActive ? 1.1 : 1),
    };
  }, [x, y, isActive]);

  const width = 120;
  const height = 40;

  return (
    <AnimatedG animatedProps={animatedProps} onPress={() => onPress(id)}>
      <AnimatedRect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        rx="20"
        fill="#1e3a8a"
        stroke={isActive ? "#60a5fa" : "transparent"}
        strokeWidth="3"
      />
      <Text
        fill="#ffffff"
        fontSize="12"
        fontWeight="bold"
        textAnchor="middle"
        alignmentBaseline="middle"
      >
        {label}
      </Text>
    </AnimatedG>
  );
};
