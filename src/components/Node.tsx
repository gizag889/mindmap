import React from 'react';
import { G, Rect, Text } from 'react-native-svg';
import Animated, { useAnimatedProps, withSpring } from 'react-native-reanimated';

const AnimatedG = Animated.createAnimatedComponent(G);

interface NodeProps {
  id: string;
  label: string;
  x: number;
  y: number;
  isActive: boolean;
}

export const Node: React.FC<NodeProps> = ({ id, label, x, y, isActive }) => {
  const animatedProps = useAnimatedProps(() => {
    return {
      x: withSpring(x),
      y: withSpring(y),
      scale: withSpring(isActive ? 1.1 : 0.95),
    };
  }, [x, y, isActive]);

  const width = 120;
  const height = 40;

  // 活性・非活性に応じたスタイルの決定
  const rectFill = isActive ? "#1e3a8a" : "#1e293b";
  const rectStroke = isActive ? "#60a5fa" : "#334155";
  const strokeWidth = isActive ? 3 : 1;
  const textColor = isActive ? "#ffffff" : "#94a3b8";

  return (
    <AnimatedG 
      animatedProps={animatedProps} 
      pointerEvents="none"
    >
      <Rect
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        rx="20"
        fill={rectFill}
        stroke={rectStroke}
        strokeWidth={strokeWidth}
      />
      <Text
        fill={textColor}
        fontSize="12"
        fontWeight={isActive ? "bold" : "normal"}
        textAnchor="middle"
        alignmentBaseline="middle"
      >
        {label}
      </Text>
    </AnimatedG>
  );
};
