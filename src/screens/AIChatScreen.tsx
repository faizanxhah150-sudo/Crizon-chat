import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { AIService, AIChatMessage } from '../services/ai';
import { AIChatDB, AIMessage } from '../db/aiChat';

export default function AIChatScreen({ navigation }: any) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const listRef = useRef<FlatList<AIMessage>>(null);

  // Rotating gradient ring + shimmer + sparkle
  const ringRotate = useRef(new Animated.Value(0)).current;
  const shimmerRotate = useRef(new Animated.Value(0)).current;
  const statusPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Load history
    (async () => {
      await AIChatDB.init();
      const rows = await AIChatDB.all();
      if (rows.length === 0) {
        const hello: AIMessage = {
          id: -1,
          role: 'ai',
          text: 'Hello! How can I help you today? 😊',
          createdAt: Date.now(),
        };
        setMessages([hello]);
        await AIChatDB.add('ai', hello.text);
      } else {
        setMessages(rows);
      }
      setTimeout(
        () => listRef.current?.scrollToEnd({ animated: false }),
        120
      );
    })();

    // Ring rotation
    Animated.loop(
      Animated.timing(ringRotate, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Shimmer reverse
    Animated.loop(
      Animated.timing(shimmerRotate, {
        toValue: 1,
        duration: 5000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Status pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(statusPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(statusPulse, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const scrollToBottom = () =>
    setTimeout(
      () => listRef.current?.scrollToEnd({ animated: true }),
      80
    );

  const handleSend = async () => {
    const text = input.trim();
    if (!text || typing) return;
    setInput('');

    // Add user message to state + DB
    const userMsg: AIMessage = {
      id: Date.now(),
      role: 'user',
      text,
      createdAt: Date.now(),
    };
    setMessages((m) => [...m, userMsg]);
    await AIChatDB.add('user', text);
    scrollToBottom();

    // Build history for API
    const history: AIChatMessage[] = [...messages, userMsg].map((m) => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.text,
    }));

    // Show typing
    setTyping(true);
    scrollToBottom();

    try {
      const reply = await AIService.chat(history);
      setTyping(false);
      const aiMsg: AIMessage = {
        id: Date.now() + 1,
        role: 'ai',
        text: reply || '…',
        createdAt: Date.now(),
      };
      setMessages((m) => [...m, aiMsg]);
      await AIChatDB.add('ai', aiMsg.text);
      scrollToBottom();
    } catch (e: any) {
      setTyping(false);
      const errMsg: AIMessage = {
        id: Date.now() + 2,
        role: 'ai',
        text:
          'Sorry, connection issue aa gaya. Dobara try karo. (' +
          (e?.message || 'unknown') +
          ')',
        createdAt: Date.now(),
      };
      setMessages((m) => [...m, errMsg]);
      await AIChatDB.add('ai', errMsg.text);
      scrollToBottom();
    }
  };

  const handleClearChat = async () => {
    setMenuOpen(false);
    await AIChatDB.clear();
    const hello: AIMessage = {
      id: Date.now(),
      role: 'ai',
      text: 'Hello! How can I help you today? 😊',
      createdAt: Date.now(),
    };
    setMessages([hello]);
    await AIChatDB.add('ai', hello.text);
  };

  const handleDeleteChat = async () => {
    setMenuOpen(false);
    Alert.alert(
      'Delete AI chat?',
      'Poori chat history hat jayegi. Naya chat kholte hi dobara mil jayega.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await AIChatDB.clear();
            navigation.goBack();
          },
        },
      ]
    );
  };

  const fmtTime = (ts: number) =>
    new Date(ts).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  const ringInterpolate = ringRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const shimmerInterpolate = shimmerRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });
  const pulseScale = statusPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.1],
  });
  const pulseOpacity = statusPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* App bar */}
      <View style={styles.appBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backGlyph}>←</Text>
        </TouchableOpacity>

        {/* AI avatar with rotating gradient ring */}
        <View style={styles.avatarContainer}>
          <Animated.View
            style={[
              styles.avatarRing,
              { transform: [{ rotate: ringInterpolate }] },
            ]}
          />
          <Animated.View
            style={[
              styles.avatarRingGlow,
              { transform: [{ rotate: shimmerInterpolate }] },
            ]}
          />
          <View style={styles.avatarInner}>
            <Animated.View
              style={[
                styles.avatarShimmer,
                { transform: [{ rotate: ringInterpolate }] },
              ]}
            />
            <Text style={styles.sparkle}>✦</Text>
          </View>
        </View>

        <View style={styles.appBarInfo}>
          <Text style={styles.appBarName}>Crizon AI</Text>
          <View style={styles.appBarStatus}>
            <Animated.View
              style={[
                styles.statusDot,
                {
                  transform: [{ scale: pulseScale }],
                  opacity: pulseOpacity,
                },
              ]}
            />
            <Text style={styles.statusLabel}>
              {typing ? 'typing…' : 'Always active'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.menuBtn}
          onPress={() => setMenuOpen(true)}
        >
          <Text style={styles.menuGlyph}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Chat area */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m, i) => `${m.id}_${i}`}
          contentContainerStyle={styles.chatArea}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
          ListHeaderComponent={
            <View style={styles.dateSepWrap}>
              <View style={styles.dateSep}>
                <Text style={styles.dateSepText}>Today</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => {
            const mine = item.role === 'user';
            return (
              <View
                style={[
                  styles.msgRow,
                  mine ? styles.rowSent : styles.rowRecv,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    mine ? styles.bubbleSent : styles.bubbleRecv,
                  ]}
                >
                  <Text
                    style={[
                      styles.msgText,
                      mine ? styles.msgTextSent : styles.msgTextRecv,
                    ]}
                  >
                    {item.text}
                  </Text>
                  <Text
                    style={[
                      styles.time,
                      mine ? styles.timeSent : styles.timeRecv,
                    ]}
                  >
                    {fmtTime(item.createdAt)}
                  </Text>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            typing ? (
              <View style={[styles.msgRow, styles.rowRecv]}>
                <View style={[styles.bubble, styles.bubbleRecv]}>
                  <View style={styles.typingRow}>
                    <Animated.View
                      style={[
                        styles.typingDot,
                        {
                          opacity: statusPulse,
                          transform: [
                            {
                              translateY: statusPulse.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, -5],
                              }),
                            },
                          ],
                        },
                      ]}
                    />
                    <View style={styles.typingDot} />
                    <View style={styles.typingDot} />
                  </View>
                </View>
              </View>
            ) : null
          }
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ask anything..."
              placeholderTextColor="#8e8e93"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              multiline
            />
          </View>
          <TouchableOpacity
            style={[
              styles.sendBtn,
              input.trim() ? styles.sendBtnActive : null,
            ]}
            onPress={handleSend}
            disabled={!input.trim() || typing}
          >
            <Text
              style={[
                styles.sendGlyph,
                input.trim() ? styles.sendGlyphActive : null,
              ]}
            >
              ➤
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Menu */}
      <Modal transparent visible={menuOpen} animationType="fade">
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setMenuOpen(false)}
        >
          <View style={styles.menuBox}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleClearChat}
            >
              <Text style={styles.menuText}>🗑️  Clear chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleDeleteChat}
            >
              <Text style={[styles.menuText, { color: '#ff3b30' }]}>
                ❌  Delete chat
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f2f2f7' },

  appBar: {
    backgroundColor: '#ffffff',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5ea',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backGlyph: { fontSize: 22, color: '#1a1a1a' },

  // AI avatar block
  avatarContainer: {
    width: 42,
    height: 42,
    marginHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarRing: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: '#6366f1',
    borderRightColor: '#d946ef',
    borderBottomColor: '#f59e0b',
    borderLeftColor: '#10b981',
  },
  avatarRingGlow: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: 'rgba(139,92,246,0.4)',
    borderBottomColor: 'rgba(6,182,212,0.4)',
    opacity: 0.7,
  },
  avatarInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1e1b4b',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  avatarShimmer: {
    position: 'absolute',
    width: 60,
    height: 60,
    backgroundColor: 'rgba(167,139,250,0.15)',
  },
  sparkle: {
    color: '#c4b5fd',
    fontSize: 18,
    fontWeight: '700',
  },

  appBarInfo: { flex: 1 },
  appBarName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: -0.2,
    fontFamily: 'Inter-Bold',
  },
  appBarStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34c759',
  },
  statusLabel: {
    fontSize: 12,
    color: '#8e8e93',
    fontFamily: 'Inter-Regular',
  },

  menuBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuGlyph: { fontSize: 20, color: '#1a1a1a' },

  chatArea: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 6,
  },

  dateSepWrap: { alignItems: 'center', marginBottom: 8 },
  dateSep: {
    backgroundColor: 'rgba(0,0,0,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dateSepText: {
    color: '#6e6e73',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
    fontFamily: 'Inter-Medium',
  },

  msgRow: { flexDirection: 'row', marginBottom: 4 },
  rowSent: { justifyContent: 'flex-end' },
  rowRecv: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 13,
    paddingTop: 9,
    paddingBottom: 8,
    borderRadius: 18,
  },
  bubbleSent: {
    backgroundColor: '#34c759',
    borderBottomRightRadius: 6,
  },
  bubbleRecv: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  msgText: {
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: -0.1,
    fontFamily: 'Inter-Regular',
  },
  msgTextSent: { color: '#ffffff' },
  msgTextRecv: { color: '#1a1a1a' },
  time: { fontSize: 10, marginTop: 3 },
  timeSent: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  timeRecv: { color: '#8e8e93', textAlign: 'left' },

  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
    minWidth: 40,
    justifyContent: 'center',
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#8e8e93',
    opacity: 0.5,
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopWidth: 0.5,
    borderTopColor: '#e5e5ea',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 26,
    gap: 8,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: '#f2f2f7',
    borderRadius: 22,
    paddingHorizontal: 16,
    minHeight: 42,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    color: '#1a1a1a',
    paddingVertical: 10,
    fontFamily: 'Inter-Regular',
    maxHeight: 120,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#6366f1',
    opacity: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ scale: 0.9 }],
  },
  sendBtnActive: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  sendGlyph: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sendGlyphActive: {},

  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 16,
  },
  menuBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 6,
    minWidth: 190,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  menuItem: { paddingVertical: 13, paddingHorizontal: 18 },
  menuText: {
    fontSize: 14.5,
    color: '#1a1a1a',
    fontFamily: 'Inter-Medium',
  },
});
