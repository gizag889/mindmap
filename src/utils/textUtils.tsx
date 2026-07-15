import React from 'react';
import { Text, Linking, StyleSheet } from 'react-native';

export const renderTextWithLinks = (text: string, onNonLinkPress?: () => void) => {
  if (!text) return null;

  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      return (
        <Text
          key={index}
          style={styles.linkText}
          onPress={async () => {
            try {
              const supported = await Linking.canOpenURL(part);
              if (supported) {
                await Linking.openURL(part);
              }
            } catch (error) {
              console.error("Failed to open URL:", error);
            }
          }}
        >
          {part}
        </Text>
      );
    }
    return (
      <Text key={index} onPress={onNonLinkPress}>
        {part}
      </Text>
    );
  });
};

const styles = StyleSheet.create({
  linkText: {
    color: '#60a5fa',
    textDecorationLine: 'underline',
  },
});
