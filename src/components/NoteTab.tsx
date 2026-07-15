import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { MindMapNode } from '../types';
import { renderTextWithLinks } from '../utils/textUtils';


interface NoteTabProps {
  node: MindMapNode;
  visible: boolean;
  onSave: (nodeId: string, note: string, images?: string[]) => void;
  onClose: () => void;
}

export const NoteTab: React.FC<NoteTabProps> = ({ node, visible, onSave, onClose }) => {
  const [noteText, setNoteText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (visible && node) {
      setNoteText(node.note || '');
      setImages(node.images || []);
      setIsEditing(!node.note && (!node.images || node.images.length === 0));
    }
  }, [visible, node]);

  const handleSave = () => {
    onSave(node.id, noteText, images);
    onClose();
  };

  const pickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const sourceUri = result.assets[0].uri;
        const fileName = sourceUri.split('/').pop() || `image_${Date.now()}.jpg`;
        const destUri = `${FileSystem.documentDirectory}${fileName}`;
        
        await FileSystem.copyAsync({
          from: sourceUri,
          to: destUri
        });
        
        setImages(prev => [...prev, destUri]);
      }
    } catch (e) {
      console.error("Failed to pick/save image:", e);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  return (
    <>
      <ScrollView style={styles.noteScrollContainer} keyboardShouldPersistTaps="handled">
        {isEditing ? (
          <TextInput
            style={styles.textInput}
            value={noteText}
            onChangeText={setNoteText}
            placeholder="ここにノートを入力してください..."
            placeholderTextColor="#94a3b8"
            multiline
            autoFocus
            textAlignVertical="top"
            scrollEnabled={false}
          />
        ) : (
          <TouchableOpacity 
            style={styles.previewContainer} 
            activeOpacity={0.9} 
            onPress={() => setIsEditing(true)}
          >
            {noteText ? (
              <Text style={styles.previewText}>
                {renderTextWithLinks(noteText, () => setIsEditing(true))}
              </Text>
            ) : (
              <Text style={styles.placeholderText}>
                タップしてノートを入力...
              </Text>
            )}
          </TouchableOpacity>
        )}
        {images.length > 0 && (
          <View style={styles.galleryContainer}>
            {images.map((uri, idx) => (
              <View key={idx} style={styles.imageWrapper}>
                <Image source={{ uri }} style={styles.attachedImage} resizeMode="cover" />
                {isEditing && (
                  <TouchableOpacity style={styles.deleteImageBtn} onPress={() => removeImage(idx)}>
                    <Text style={styles.deleteImageText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {isEditing ? (
          <>
            <View style={{ flex: 1 }} />
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => {
                if (node.note || (node.images && node.images.length > 0)) {
                  setNoteText(node.note || '');
                  setImages(node.images || []);
                  setIsEditing(false);
                } else {
                  onClose();
                }
              }}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
              <Text style={styles.attachButtonText}>🖼️</Text>
            </TouchableOpacity>
            {(noteText.trim() || images.length > 0) && (
              <TouchableOpacity 
                style={styles.previewButton} 
                onPress={() => setIsEditing(false)}
              >
                <Text style={styles.previewButtonText}>プレビュー</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>保存</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
              <Text style={styles.editButtonText}>もどる</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>閉じる</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  noteScrollContainer: {
    flexShrink: 1,
    maxHeight: 400,
  },
  textInput: {
    padding: 16,
    color: '#f8fafc',
    fontSize: 16,
    lineHeight: 24,
    minHeight: 200,
  },
  previewContainer: {
    padding: 16,
    minHeight: 200,
  },
  previewText: {
    color: '#f8fafc',
    fontSize: 16,
    lineHeight: 24,
  },
  placeholderText: {
    color: '#94a3b8',
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  editButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  editButtonText: {
    color: '#f8fafc',
    fontWeight: 'bold',
  },
  previewButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#475569',
  },
  previewButtonText: {
    color: '#f8fafc',
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 12,
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#334155',
  },
  cancelButtonText: {
    color: '#f8fafc',
    fontWeight: 'bold',
  },
  saveButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  galleryContainer: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#334155',
  },
  attachedImage: {
    width: '100%',
    height: '100%',
  },
  deleteImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteImageText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  attachButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachButtonText: {
    fontSize: 16,
  },
});
