import React from 'react';
import { G, Rect, Text, Circle } from 'react-native-svg';
import Animated, { useAnimatedProps, withSpring } from 'react-native-reanimated';

const AnimatedG = Animated.createAnimatedComponent(G);

interface NodeProps {
  id: string;
  label: string;
  x: number;
  y: number;
  isActive: boolean;
  hasNote?: boolean;
}

export const Node: React.FC<NodeProps> = ({ id, label, x, y, isActive, hasNote }) => {
  const animatedProps = useAnimatedProps(() => {
    return {
      x: withSpring(x),
      y: withSpring(y),
      scale: withSpring(isActive ? 1.1 : 0.95),
    };
  }, [x, y, isActive]);

  // 長すぎるラベルを省略（最大20文字）
  const MAX_CHARS = 20;
  const displayLabel = label.length > MAX_CHARS ? label.slice(0, MAX_CHARS - 1) + '…' : label;

  // ラベルの長さに応じて幅を可変にする（最小120px）
  const width = Math.max(120, displayLabel.length * 12 + 40);
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
        {displayLabel}
      </Text>
      {hasNote && (
        <G x={width / 2 - 10} y={-height / 2 + 10}>
          <Circle r="4" fill="#60a5fa" />
        </G>
      )}
    </AnimatedG>
  );
};
