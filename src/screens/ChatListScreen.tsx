import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  Animated,
  Image,
  Alert,
} from 'react-native';
import { Session } from '../services/session';
import { ContactsService, Contact } from '../services/contacts';
import { AuthService } from '../services/auth';

const THEME = {
  green: '#075E54',
  accent: '#25D366',
  bg: '#f7f8fa',
  white: '#ffffff',
  text: '#1a1a1a',
  sub: '#888',
  border: '#e8e8e8',
};

type Row = {
  contact: Contact;
  lastMessage?: string;
  lastTime?: string;
  unread?: number;
  online?: boolean;
  typing?: boolean;
};

export default function ChatListScreen({ navigation }: any) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [rows, setRows] = useState<Row[]>([]);
  const [me, setMe] = useState<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const s = await Session.load();
      if (!s) {
        navigation.replace('Login');
        return;
      }
      setMe(s);

      // single session check
      const ok = await AuthService.checkSingleSession();
      if (!ok) {
        Alert.alert(
          'Logged out',
          'Aap ka account kisi dusre device pe login ho chuka hai.',
          [{ text: 'OK', onPress: () => navigation.replace('Login') }]
        );
        return;
      }

      // fetch contacts
      const list = await ContactsService.getMyContacts(s.uid);
      setRows(
        list.map((c) => ({
          contact: c,
          lastMessage: '',
          lastTime: '',
          unread: 0,
          online: false,
        }))
      );
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    })();
  }, []);

  // filter + search
  const visible = rows.filter((r) => {
    if (filter === 'unread' && !(r.unread && r.unread > 0)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return (
        r.contact.name.toLowerCase().includes(q) ||
        r.contact.username.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const initials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  const avatarGradient = (idx: number) => {
    const gradients = [
      '#667eea',
      '#f093fb',
      '#4facfe',
      '#fa709a',
      '#30cfd0',
      '#89f7fe',
      '#d299c2',
      '#fbc2eb',
    ];
    return gradients[idx % gradients.length];
  };

  const handleOpenChat = (contact: Contact) => {
    navigation.navigate('Chat', { contact });
  };

  const handleOpenNewChat = () => {
    navigation.navigate('NewChat');
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.green} />

      {/* App bar */}
      <View style={styles.appBar}>
        <Text style={styles.appBarTitle}>Crizon</Text>
        <View style={styles.appBarActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setSearchOpen(!searchOpen)}
          >
            <Text style={styles.iconGlyph}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.iconGlyph}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search bar */}
      {searchOpen && (
        <View style={styles.searchBar}>
          <View style={styles.searchInputWrap}>
            <Text style={styles.searchIconSmall}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name..."
              placeholderTextColor="#aaa"
              autoFocus
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setSearchOpen(false);
              }}
            >
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Filter pills */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.pill, filter === 'all' && styles.pillActive]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[styles.pillText, filter === 'all' && styles.pillTextActive]}
          >
            ALL <Text style={styles.pillCount}>{rows.length}</Text>
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pill, filter === 'unread' && styles.pillActive]}
          onPress={() => setFilter('unread')}
        >
          <Text
            style={[
              styles.pillText,
              filter === 'unread' && styles.pillTextActive,
            ]}
          >
            UNREAD{' '}
            <Text style={styles.pillCount}>
              {rows.filter((r) => r.unread && r.unread > 0).length}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <Animated.View style={[styles.listWrap, { opacity: fadeAnim }]}>
        {visible.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No chats found' : 'Koi chat nahi'}
            </Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? 'Try a different name'
                : 'Neeche + button dabao naya chat shuru karne ke liye'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(item) => item.contact.uid}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={styles.chatItem}
                onPress={() => handleOpenChat(item.contact)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: avatarGradient(index) },
                  ]}
                >
                  {item.contact.profileUrl ? (
                    <Image
                      source={{ uri: item.contact.profileUrl }}
                      style={styles.avatarImg}
                    />
                  ) : (
                    <Text style={styles.avatarText}>
                      {initials(item.contact.name)}
                    </Text>
                  )}
                  {item.online && <View style={styles.onlineDot} />}
                </View>

                <View style={styles.chatInfo}>
                  <View style={styles.chatTop}>
                    <Text
                      style={[
                        styles.chatName,
                        item.unread ? styles.chatNameBold : null,
                      ]}
                      numberOfLines={1}
                    >
                      {item.contact.name}
                    </Text>
                    <Text
                      style={[
                        styles.chatTime,
                        item.unread ? styles.chatTimeUnread : null,
                      ]}
                    >
                      {item.lastTime || ''}
                    </Text>
                  </View>
                  <View style={styles.chatBottom}>
                    <Text
                      style={[
                        styles.chatPreview,
                        item.unread ? styles.chatPreviewUnread : null,
                      ]}
                      numberOfLines={1}
                    >
                      {item.lastMessage || 'Tap to start chatting'}
                    </Text>
                    {item.unread ? (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{item.unread}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: 120 }}
          />
        )}
      </Animated.View>

      {/* FAB stack */}
      <View style={styles.fabStack} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.fabSmall}
          onPress={() => navigation.navigate('AIChat')}
          activeOpacity={0.85}
        >
          <Text style={styles.fabSmallIcon}>✨</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleOpenNewChat}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem}>
          <Text style={[styles.navGlyph, { color: THEME.green }]}>💬</Text>
          <Text style={[styles.navLabel, { color: THEME.green }]}>Chats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('IncomingCall', {})}
        >
          <Text style={styles.navGlyph}>📞</Text>
          <Text style={styles.navLabel}>Calls</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.navGlyph}>⚙️</Text>
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: THEME.white },

  appBar: {
    backgroundColor: THEME.green,
    paddingTop: 52,
    paddingBottom: 18,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appBarTitle: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'Inter-Bold',
  },
  appBarActions: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconGlyph: { color: '#fff', fontSize: 20 },

  searchBar: {
    backgroundColor: THEME.green,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 42,
    gap: 10,
  },
  searchIconSmall: { fontSize: 16 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: THEME.text,
    fontFamily: 'Inter-Regular',
  },
  closeX: { fontSize: 18, color: '#666', paddingHorizontal: 4 },

  filterBar: {
    backgroundColor: THEME.green,
    flexDirection: 'row',
  },
  pill: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  pillActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#ffffff',
  },
  pillText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.8,
    fontFamily: 'Inter-SemiBold',
  },
  pillTextActive: { color: '#ffffff' },
  pillCount: { fontSize: 11, opacity: 0.7 },

  listWrap: { flex: 1, backgroundColor: '#ffffff' },

  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatarImg: { width: 52, height: 52, borderRadius: 26 },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: THEME.accent,
    borderWidth: 2.5,
    borderColor: '#fff',
  },

  chatInfo: { flex: 1, marginLeft: 14 },
  chatTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  chatName: {
    fontSize: 16,
    fontWeight: '500',
    color: THEME.text,
    flex: 1,
    fontFamily: 'Inter-Medium',
  },
  chatNameBold: { fontWeight: '700', fontFamily: 'Inter-Bold' },
  chatTime: {
    fontSize: 11.5,
    color: '#999',
    marginLeft: 8,
    fontFamily: 'Inter-Regular',
  },
  chatTimeUnread: { color: THEME.accent, fontWeight: '600' },

  chatBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  chatPreview: {
    fontSize: 13.5,
    color: THEME.sub,
    flex: 1,
    fontFamily: 'Inter-Regular',
  },
  chatPreviewUnread: { color: '#333', fontWeight: '500' },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: THEME.accent,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 42, marginBottom: 12 },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.text,
    marginBottom: 6,
    fontFamily: 'Inter-SemiBold',
  },
  emptySub: {
    fontSize: 13,
    color: THEME.sub,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },

  fabStack: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    alignItems: 'center',
    gap: 14,
  },
  fabSmall: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  fabSmallIcon: { fontSize: 20 },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: THEME.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: THEME.accent,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabIcon: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '300',
    marginTop: -2,
  },

  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: THEME.border,
    paddingBottom: 20,
    paddingTop: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    gap: 4,
  },
  navGlyph: { fontSize: 20, color: '#999' },
  navLabel: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
  },
});
