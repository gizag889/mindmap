import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Svg, G } from 'react-native-svg';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { MindMapNode, MindMapEdge } from '../types';
import { Node } from './Node';
import { Edge } from './Edge';

const { width, height } = Dimensions.get('window');

interface MindMapProps {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  activeNodeId: string | null;
  onNodePress: (id: string) => void;
}

export const MindMap: React.FC<MindMapProps> = ({ nodes, edges, activeNodeId, onNodePress }) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(width / 2);
  const translateY = useSharedValue(height / 2);
  const savedTranslateX = useSharedValue(width / 2);
  const savedTranslateY = useSharedValue(height / 2);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      // savedTranslateX.value（前回ドラッグ終了時の位置）に、現在のドラッグ移動量 e.translationX を加算
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { translateX: -width / 2 },
      { translateY: -height / 2 },
    ],
  }));

  // Auto focus logic: when activeNodeId changes, animate canvas to center it
  React.useEffect(() => {
    if (activeNodeId) {
      const activeNode = nodes.find(n => n.id === activeNodeId);
      if (activeNode && activeNode.x !== undefined && activeNode.y !== undefined) {
        // Move the canvas so that the active node is at the center top (to make room for bottom sheet)
        const targetX = width / 2 - activeNode.x * scale.value;
        const targetY = height / 4 - activeNode.y * scale.value; // Center top
        
        translateX.value = withSpring(targetX);
        translateY.value = withSpring(targetY);
        savedTranslateX.value = targetX;
        savedTranslateY.value = targetY;
      }
    }
  }, [activeNodeId, nodes, scale, translateX, translateY, savedTranslateX, savedTranslateY]);

  const isNodeActive = (id: string) => {
    if (!activeNodeId) return true; // if none active, show all
    if (id === activeNodeId) return true;
    const activeNode = nodes.find(n => n.id === activeNodeId);
    if (!activeNode) return false;
    // Highlight parent and direct children
    if (activeNode.parentId === id) return true;
    const childNode = nodes.find(n => n.id === id);
    if (childNode && childNode.parentId === activeNodeId) return true;
    return false;
  };

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
          <G x={width / 2} y={height / 2}>
            {edges.map((edge, index) => {
              const sourceNode = nodes.find(n => n.id === edge.source);
              const targetNode = nodes.find(n => n.id === edge.target);
              if (!sourceNode || !targetNode) return null;
              
              const active = isNodeActive(sourceNode.id) && isNodeActive(targetNode.id);
              return (
                <Edge
                  key={`edge-${index}`}
                  sourceX={sourceNode.x || 0}
                  sourceY={sourceNode.y || 0}
                  targetX={targetNode.x || 0}
                  targetY={targetNode.y || 0}
                  isActive={active}
                />
              );
            })}
            {nodes.map((node) => (
              <Node
                key={node.id}
                id={node.id}
                label={node.label}
                x={node.x || 0}
                y={node.y || 0}
                isActive={isNodeActive(node.id)}
                onPress={onNodePress}
              />
            ))}
          </G>
        </Svg>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#0f172a',
  },
});
