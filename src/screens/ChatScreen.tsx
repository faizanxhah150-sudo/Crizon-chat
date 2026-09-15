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
  Image,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { Session } from '../services/session';
import { MessagesService, Message } from '../services/messages';
import { PresenceService } from '../services/presence';
import { BlockedService } from '../services/blocked';

const T = {
  green: '#075E54',
  sentBubble: '#d9fdd3',
  recvBubble: '#ffffff',
  wallpaper: '#efeae2',
  wallpaperAccent: '#d4c9b8',
  text: '#111',
  timeText: '#8a8a8a',
  tickBlue: '#53bdeb',
  tickGrey: '#8a8a8a',
};

export default function ChatScreen({ route, navigation }: any) {
  const contact = route?.params?.contact;
  const [me, setMe] = useState<any>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [online, setOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    let unsub: any = null;
    let unsubPresence: any = null;

    (async () => {
      const s = await Session.load();
      if (!s) return;
      setMe(s);

      if (!contact) return;

      unsub = MessagesService.subscribe(s.username, contact.username, (list) => {
        setMsgs(list);
        setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
      });

      unsubPresence = PresenceService.watch(contact.uid, (on, ts) => {
        setOnline(on);
        setLastSeen(ts);
      });

      // Mark thread read on open
      MessagesService.markRead(s.username, contact.username, s.username).catch(
        () => {}
      );

      // Am I blocking this contact?
      const blocked = await BlockedService.isBlocked(s.uid, contact.username);
      setIsBlocked(blocked);
    })();

    return () => {
      unsub?.();
      unsubPresence?.();
    };
  }, []);

  // Handle back — set offline just before leaving
  const handleBack = () => {
    navigation.goBack();
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !me || !contact) return;
    setInput('');
    try {
      await MessagesService.send(me.username, contact.username, {
        type: 'text',
        content: text,
      });
    } catch (e: any) {
      Alert.alert('Send fail', e?.message || 'Try again');
    }
  };

  const handleClearChat = async () => {
    setMenuOpen(false);
    if (!me || !contact) return;
    Alert.alert('Clear chat?', 'Sari messages hata di jayengi.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await MessagesService.clearThread(me.username, contact.username);
        },
      },
    ]);
  };

  const handleBlockToggle = async () => {
    setMenuOpen(false);
    if (!me || !contact) return;
    if (isBlocked) {
      await BlockedService.unblock(me.uid, contact.username);
      setIsBlocked(false);
      Alert.alert('Unblocked', 'Ab messages aa sakte hain');
    } else {
      Alert.alert('Block contact?', 'Ye banda aapko message nahi kar payega.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            await BlockedService.block(me.uid, contact.username);
            setIsBlocked(true);
          },
        },
      ]);
    }
  };

  const fmt = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderTick = (m: Message) => {
    if (m.from !== me?.username) return null;
    const color = m.status === 'read' ? T.tickBlue : T.tickGrey;
    return (
      <Text style={[styles.tick, { color }]}>
        {m.status === 'sent' ? '✓' : '✓✓'}
      </Text>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const mine = item.from === me?.username;

    if (item.type === 'text') {
      return (
        <View
          style={[styles.msgRow, mine ? styles.rowSent : styles.rowRecv]}
        >
          <View
            style={[
              styles.bubble,
              mine ? styles.bubbleSent : styles.bubbleRecv,
            ]}
          >
            <Text style={styles.msgText}>{item.content}</Text>
            <View style={styles.meta}>
              <Text style={styles.time}>{fmt(item.createdAt)}</Text>
              {renderTick(item)}
            </View>
          </View>
        </View>
      );
    }

    if (item.type === 'image') {
      return (
        <View
          style={[styles.msgRow, mine ? styles.rowSent : styles.rowRecv]}
        >
          <View
            style={[
              styles.bubble,
              mine ? styles.bubbleSent : styles.bubbleRecv,
              styles.mediaBubble,
            ]}
          >
            <Image
              source={{ uri: item.url }}
              style={styles.mediaImage}
              resizeMode="cover"
            />
            <View style={styles.mediaMeta}>
              <Text style={[styles.time, { color: '#fff' }]}>
                {fmt(item.createdAt)}
              </Text>
              {mine && (
                <Text
                  style={[
                    styles.tick,
                    {
                      color:
                        item.status === 'read' ? T.tickBlue : '#ffffff',
                    },
                  ]}
                >
                  {item.status === 'sent' ? '✓' : '✓✓'}
                </Text>
              )}
            </View>
          </View>
        </View>
      );
    }

    if (item.type === 'video') {
      return (
        <View
          style={[styles.msgRow, mine ? styles.rowSent : styles.rowRecv]}
        >
          <View
            style={[
              styles.bubble,
              mine ? styles.bubbleSent : styles.bubbleRecv,
              styles.mediaBubble,
            ]}
          >
            <View style={styles.videoThumb}>
              <View style={styles.playOverlay}>
                <Text style={styles.playGlyph}>▶</Text>
              </View>
              {item.duration ? (
                <View style={styles.videoDuration}>
                  <Text style={styles.videoDurationText}>
                    {Math.floor(item.duration / 60)}:
                    {String(item.duration % 60).padStart(2, '0')}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={styles.mediaMeta}>
              <Text style={[styles.time, { color: '#fff' }]}>
                {fmt(item.createdAt)}
              </Text>
              {mine && (
                <Text
                  style={[
                    styles.tick,
                    {
                      color:
                        item.status === 'read' ? T.tickBlue : '#ffffff',
                    },
                  ]}
                >
                  {item.status === 'sent' ? '✓' : '✓✓'}
                </Text>
              )}
            </View>
          </View>
        </View>
      );
    }

    if (item.type === 'audio') {
      return (
        <View
          style={[styles.msgRow, mine ? styles.rowSent : styles.rowRecv]}
        >
          <View
            style={[
              styles.bubble,
              mine ? styles.bubbleSent : styles.bubbleRecv,
              styles.voiceBubble,
            ]}
          >
            <View style={styles.voicePlayBtn}>
              <Text style={styles.voicePlayGlyph}>▶</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.waveform}>
                {Array.from({ length: 28 }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.waveBar,
                      {
                        height: 6 + ((i * 7) % 20),
                        opacity: i < 14 ? 1 : 0.4,
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.voiceDuration}>
                {item.duration
                  ? `0:${String(item.duration).padStart(2, '0')}`
                  : '0:00'}
              </Text>
            </View>
            <View style={styles.meta}>
              <Text style={styles.time}>{fmt(item.createdAt)}</Text>
              {renderTick(item)}
            </View>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={T.green} />

      {/* App bar */}
      <View style={styles.appBar}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Text style={styles.backGlyph}>←</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.contactTap}
          onPress={() =>
            navigation.navigate('ContactProfile', { contact })
          }
        >
          <View style={styles.contactDp}>
            {contact?.profileUrl ? (
              <Image
                source={{ uri: contact.profileUrl }}
                style={styles.contactDpImg}
              />
            ) : (
              <Text style={styles.contactDpText}>
                {(contact?.name || '?')
                  .split(' ')
                  .map((n: string) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactName} numberOfLines={1}>
              {contact?.name || 'Chat'}
            </Text>
            <View style={styles.statusRow}>
              {online ? (
                <>
                  <View style={styles.onlineDot} />
                  <Text style={styles.statusText}>online</Text>
                </>
              ) : (
                <Text style={styles.statusText}>
                  {lastSeen
                    ? `last seen ${new Date(lastSeen).toLocaleTimeString(
                        'en-US',
                        { hour: 'numeric', minute: '2-digit', hour12: true }
                      )}`
                    : 'offline'}
                </Text>
              )}
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() =>
            navigation.navigate('IncomingCall', { contact })
          }
        >
          <Text style={styles.iconGlyph}>📞</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setMenuOpen(true)}
        >
          <Text style={styles.iconGlyph}>⋮</Text>
        </TouchableOpacity>
      </View>

      {/* Wallpaper + messages */}
      <View style={styles.wallpaper}>
        <FlatList
          ref={listRef}
          data={msgs}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.chatArea}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
        />
      </View>

      {/* Input bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Message"
              placeholderTextColor="#888"
              multiline
              value={input}
              onChangeText={setInput}
              onFocus={() => {
                if (me) PresenceService.setOnline(me.uid);
              }}
            />
            <TouchableOpacity style={styles.attachBtn}>
              <Text style={styles.attachGlyph}>📎</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachBtn}>
              <Text style={styles.attachGlyph}>📷</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.micBtn} onPress={handleSend}>
            <Text style={styles.micGlyph}>{input.trim() ? '➤' : '🎤'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Menu modal */}
      <Modal
        transparent
        visible={menuOpen}
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuBox}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleClearChat}
            >
              <Text style={styles.menuText}>🗑️  Clear chat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleBlockToggle}
            >
              <Text
                style={[
                  styles.menuText,
                  isBlocked ? { color: T.green } : { color: '#ff3b30' },
                ]}
              >
                {isBlocked ? '✅  Unblock' : '🚫  Block'}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.wallpaper },

  appBar: {
    backgroundColor: T.green,
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backGlyph: { color: '#fff', fontSize: 24, fontWeight: '600' },

  contactTap: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  contactDp: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  contactDpImg: { width: 40, height: 40 },
  contactDpText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  contactInfo: { marginLeft: 10, flex: 1 },
  contactName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#25D366',
    marginRight: 4,
  },
  statusText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },

  iconBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconGlyph: { color: '#fff', fontSize: 18 },

  wallpaper: { flex: 1, backgroundColor: T.wallpaper },
  chatArea: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 12,
  },

  msgRow: { marginBottom: 4, flexDirection: 'row' },
  rowSent: { justifyContent: 'flex-end' },
  rowRecv: { justifyContent: 'flex-start' },

  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 10,
    paddingTop: 7,
    paddingBottom: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  bubbleSent: { backgroundColor: T.sentBubble, borderTopRightRadius: 4 },
  bubbleRecv: { backgroundColor: T.recvBubble, borderTopLeftRadius: 4 },

  msgText: {
    color: T.text,
    fontSize: 14.5,
    lineHeight: 20,
    fontFamily: 'Inter-Regular',
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 3,
    gap: 3,
  },
  time: {
    fontSize: 10.5,
    color: T.timeText,
    fontFamily: 'Inter-Regular',
  },
  tick: { fontSize: 12, marginLeft: 2 },

  // Media
  mediaBubble: { padding: 4, overflow: 'hidden' },
  mediaImage: { width: 240, height: 160, borderRadius: 10 },
  mediaMeta: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  // Video
  videoThumb: {
    width: 240,
    height: 160,
    borderRadius: 10,
    backgroundColor: '#f093fb',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  playOverlay: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  playGlyph: { color: '#fff', fontSize: 22, marginLeft: 3 },
  videoDuration: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  videoDurationText: { color: '#fff', fontSize: 12, fontWeight: '500' },

  // Voice
  voiceBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 220,
    paddingVertical: 8,
    gap: 8,
  },
  voicePlayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: T.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voicePlayGlyph: { color: '#fff', fontSize: 14, marginLeft: 2 },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 26,
  },
  waveBar: {
    width: 3,
    backgroundColor: T.green,
    borderRadius: 2,
    opacity: 0.6,
  },
  voiceDuration: {
    fontSize: 11,
    color: T.timeText,
    marginTop: 2,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 22,
    backgroundColor: '#f0f2f5',
    gap: 6,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 14,
    minHeight: 44,
    maxHeight: 130,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    color: T.text,
    paddingVertical: 10,
    fontFamily: 'Inter-Regular',
  },
  attachBtn: { paddingHorizontal: 4 },
  attachGlyph: { fontSize: 20 },
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micGlyph: { color: '#fff', fontSize: 18, marginLeft: 1 },

  // Menu modal
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
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
    color: T.text,
    fontFamily: 'Inter-Medium',
  },
});
