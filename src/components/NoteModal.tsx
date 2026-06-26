import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, SafeAreaView, TouchableWithoutFeedback, Keyboard, ScrollView, Linking, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { MindMapNode } from '../types';

interface NoteModalProps {
  visible: boolean;
  node: MindMapNode | null;
  activeNodePath?: MindMapNode[];
  onSave: (nodeId: string, note: string, images?: string[]) => void;
  onClose: () => void;
  onSendChat?: (message: string, nodeId: string) => void;
  isChatLoading?: boolean;
}

const renderTextWithLinks = (text: string, onNonLinkPress?: () => void) => {
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

export const NoteModal: React.FC<NoteModalProps> = ({ visible, node, activeNodePath = [], onSave, onClose, onSendChat, isChatLoading }) => {
  const [noteText, setNoteText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'note' | 'chat'>('note');
  const [chatMessage, setChatMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);

  useEffect(() => {
    if (visible && node) {
      setNoteText(node.note || '');
      setImages(node.images || []);
      setIsEditing(!node.note && (!node.images || node.images.length === 0));
    }
  }, [visible, node]);

  const handleSave = () => {
    if (node) {
      onSave(node.id, noteText, images);
    }
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

  if (!node) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[StyleSheet.absoluteFill, { zIndex: 0 }]} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior="padding"
        >
          <View style={[styles.modalContainer, { zIndex: 1 }]}>
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <Text style={styles.title} numberOfLines={1}>
                    📝 {node.label} のノート
                  </Text>
                  {activeNodePath.length > 0 && (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.breadcrumbContainer}
                    >
                      {activeNodePath.map((pathNode, index) => {
                        const isLast = index === activeNodePath.length - 1;
                        return (
                          <View key={pathNode.id} style={styles.breadcrumbItemWrapper}>
                            <Text style={[
                              styles.breadcrumbText,
                              isLast && styles.breadcrumbActiveText
                            ]} numberOfLines={1}>
                              {pathNode.label}
                            </Text>
                            {!isLast && (
                              <Text style={styles.breadcrumbSeparator}>&gt;</Text>
                            )}
                          </View>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'note' && styles.activeTab]}
                  onPress={() => setActiveTab('note')}
                >
                  <Text style={[styles.tabText, activeTab === 'note' && styles.activeTabText]}>ノート</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, activeTab === 'chat' && styles.activeTab]}
                  onPress={() => setActiveTab('chat')}
                >
                  <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>AIと壁打ち</Text>
                </TouchableOpacity>
              </View>

              {activeTab === 'note' ? (
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
                        <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
                          <Text style={styles.attachButtonText}>📷 画像を追加</Text>
                        </TouchableOpacity>
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
                          <Text style={styles.editButtonText}>戻る</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                          <Text style={styles.saveButtonText}>閉じる</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </>
              ) : (
                <View style={styles.chatContainer}>
                  <ScrollView 
                    ref={scrollViewRef}
                    style={styles.chatHistory}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                  >
                    {node.chatHistory?.map((msg, index) => (
                      <View key={index} style={[styles.chatBubble, msg.role === 'ai' ? styles.chatBubbleAi : styles.chatBubbleUser]}>
                        <Text style={styles.chatBubbleText}>
                          {renderTextWithLinks(msg.text)}
                        </Text>
                      </View>
                    ))}
                    {isChatLoading && (
                      <View style={[styles.chatBubble, styles.chatBubbleAi]}>
                        <Text style={styles.chatBubbleText}>...</Text>
                      </View>
                    )}
                  </ScrollView>
                  <View style={styles.chatInputContainer}>
                    <TextInput
                      style={styles.chatInput}
                      value={chatMessage}
                      onChangeText={setChatMessage}
                      placeholder="AIにメッセージを送信..."
                      placeholderTextColor="#94a3b8"
                      multiline
                      textAlignVertical="center"
                    />
                    <TouchableOpacity 
                      style={[styles.sendChatButton, (!chatMessage.trim() || isChatLoading) && styles.sendChatButtonDisabled]}
                      onPress={() => {
                        if (chatMessage.trim() && onSendChat) {
                          onSendChat(chatMessage, node.id);
                          setChatMessage('');
                        }
                      }}
                      disabled={!chatMessage.trim() || isChatLoading}
                    >
                      <Text style={styles.sendChatButtonText}>↑</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    flexShrink: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  breadcrumbActiveText: {
    color: '#60a5fa',
    fontWeight: 'bold',
  },
  breadcrumbSeparator: {
    color: '#475569',
    fontSize: 10,
    marginHorizontal: 4,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: 'bold',
  },
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
  linkText: {
    color: '#60a5fa',
    textDecorationLine: 'underline',
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#334155',
    marginRight: 8,
  },
  attachButtonText: {
    color: '#f8fafc',
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#60a5fa',
  },
  tabText: {
    color: '#94a3b8',
    fontWeight: 'bold',
  },
  activeTabText: {
    color: '#60a5fa',
  },
  chatContainer: {
    flexShrink: 1,
    height: 400,
    flexDirection: 'column',
  },
  chatHistory: {
    flex: 1,
    padding: 16,
  },
  chatBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  chatBubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 4,
  },
  chatBubbleAi: {
    alignSelf: 'flex-start',
    backgroundColor: '#334155',
    borderBottomLeftRadius: 4,
  },
  chatBubbleText: {
    color: '#f8fafc',
    fontSize: 14,
    lineHeight: 20,
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingTop: 10,
    color: '#f8fafc',
    minHeight: 40,
    maxHeight: 120,
  },
  sendChatButton: {
    marginLeft: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendChatButtonDisabled: {
    opacity: 0.5,
  },
  sendChatButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
