import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Session } from '../services/session';
import { ContactsService, Contact } from '../services/contacts';

const T = {
  green: '#075E54',
  text: '#1a1a1a',
  sub: '#8e8e93',
  inputBg: '#f2f2f7',
  border: '#e5e5ea',
};

export default function NewChatScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [myContacts, setMyContacts] = useState<Contact[]>([]);

  useEffect(() => {
    (async () => {
      const s = await Session.load();
      if (!s) return;
      setMe(s);
      const list = await ContactsService.getMyContacts(s.uid);
      setMyContacts(list);
    })();
  }, []);

  const handleSearch = async (text: string) => {
    setQuery(text);
    const clean = text.trim().toLowerCase();
    if (clean.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const found = await ContactsService.searchByUsername(clean);
      // Filter out self
      setResults(
        found && found.username !== me?.username ? [found] : []
      );
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenContact = async (contact: Contact) => {
    if (!me) return;
    // Add to my contacts if not already
    await ContactsService.addContact(me.uid, contact.username);
    navigation.replace('Chat', { contact });
  };

  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

  const showEmpty = query.trim().length >= 2 && !loading && results.length === 0;
  const showContacts = query.trim().length === 0 && myContacts.length > 0;

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
        <Text style={styles.appBarTitle}>New Chat</Text>
      </View>

      {/* Search */}
      <View style={styles.searchSection}>
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username"
            placeholderTextColor="#8e8e93"
            autoCapitalize="none"
            autoCorrect={false}
            value={query}
            onChangeText={handleSearch}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={() => handleSearch('')}
              style={styles.clearBtn}
            >
              <Text style={styles.clearGlyph}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Section header */}
      <Text style={styles.sectionHeader}>
        {query.trim().length >= 2
          ? `Results (${results.length})`
          : showContacts
          ? 'Contacts'
          : 'Search a username'}
      </Text>

      {/* Loading */}
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={T.green} />
        </View>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(c) => c.uid}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => handleOpenContact(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.avatar, { backgroundColor: '#667eea' }]}>
                {item.profileUrl ? (
                  <Image source={{ uri: item.profileUrl }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarText}>{initials(item.name)}</Text>
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowUsername}>{item.username}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Contacts list (when no query) */}
      {!loading && showContacts && (
        <FlatList
          data={myContacts}
          keyExtractor={(c) => c.uid}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.replace('Chat', { contact: item })}
              activeOpacity={0.7}
            >
              <View style={[styles.avatar, { backgroundColor: '#4facfe' }]}>
                {item.profileUrl ? (
                  <Image source={{ uri: item.profileUrl }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarText}>{initials(item.name)}</Text>
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowUsername}>{item.username}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Empty state */}
      {showEmpty && (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBox}>
            <Text style={styles.emptyIconGlyph}>🔍</Text>
          </View>
          <Text style={styles.emptyTitle}>No user found</Text>
          <Text style={styles.emptySub}>
            Username galat hai ya banda app pe registered nahi
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  appBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 14,
    paddingHorizontal: 12,
    gap: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backGlyph: { fontSize: 24, color: T.text, fontWeight: '600' },
  appBarTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: T.text,
    letterSpacing: -0.4,
    fontFamily: 'Inter-Bold',
  },
  searchSection: { paddingHorizontal: 16, paddingBottom: 12 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.inputBg,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: T.text,
    fontFamily: 'Inter-Regular',
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#c7c7cc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearGlyph: { color: '#fff', fontSize: 12, fontWeight: '700' },

  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '600',
    color: T.sub,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontFamily: 'Inter-SemiBold',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: 52, height: 52 },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  rowName: {
    fontSize: 16,
    fontWeight: '600',
    color: T.text,
    fontFamily: 'Inter-SemiBold',
  },
  rowUsername: {
    fontSize: 13,
    color: T.sub,
    marginTop: 2,
    fontFamily: 'Inter-Regular',
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f2f2f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIconGlyph: { fontSize: 32 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: T.text,
    marginBottom: 6,
    fontFamily: 'Inter-SemiBold',
  },
  emptySub: {
    fontSize: 14,
    color: T.sub,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
});
