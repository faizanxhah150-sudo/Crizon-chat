import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Image,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { Session } from '../services/session';
import { ProfileService } from '../services/profile';
import { BlockedService } from '../services/blocked';
import { ContactsService } from '../services/contacts';
import { MessagesService } from '../services/messages';

const T = {
  green: '#075E54',
  text: '#1a1a1a',
  sub: '#8e8e93',
  red: '#ea4335',
};

export default function ContactProfileScreen({ route, navigation }: any) {
  const contact = route?.params?.contact;
  const [me, setMe] = useState<any>(null);
  const [displayName, setDisplayName] = useState(contact?.name || '');
  const [isBlocked, setIsBlocked] = useState(false);
  const [nickOpen, setNickOpen] = useState(false);
  const [nickDraft, setNickDraft] = useState('');

  useEffect(() => {
    (async () => {
      const s = await Session.load();
      if (!s) return;
      setMe(s);
      const nick = await ProfileService.getNickname(contact.username);
      if (nick) setDisplayName(nick);
      const b = await BlockedService.isBlocked(s.uid, contact.username);
      setIsBlocked(b);
    })();
  }, []);

  const handleCopyId = () => {
    Clipboard.setString(contact.username);
    Alert.alert('Copied', contact.username);
  };

  const handleEditNickname = () => {
    setNickDraft(displayName);
    setNickOpen(true);
  };

  const handleSaveNickname = async () => {
    await ProfileService.setNickname(contact.username, nickDraft);
    setDisplayName(nickDraft.trim() || contact.name);
    setNickOpen(false);
  };

  const handleBlockToggle = async () => {
    if (!me) return;
    if (isBlocked) {
      await BlockedService.unblock(me.uid, contact.username);
      setIsBlocked(false);
      Alert.alert('Unblocked');
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

  const handleDeleteChat = () => {
    Alert.alert('Delete chat?', 'Sari messages hat jayengi + contact hatega.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!me) return;
          await MessagesService.clearThread(me.username, contact.username);
          await ContactsService.removeContact(me.uid, contact.username);
          navigation.navigate('ChatList');
        },
      },
    ]);
  };

  const initials = (n: string) =>
    (n || '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backGlyph}>←</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Contact Info</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile */}
        <View style={styles.profileSection}>
          <View style={styles.photo}>
            {contact.profileUrl ? (
              <Image source={{ uri: contact.profileUrl }} style={styles.photoImg} />
            ) : (
              <Text style={styles.photoInitials}>{initials(displayName)}</Text>
            )}
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          <TouchableOpacity onPress={handleCopyId} style={styles.usernameRow}>
            <Text style={styles.username}>{contact.username}</Text>
            <Text style={styles.copyGlyph}>📋</Text>
          </TouchableOpacity>
        </View>

        {/* Options */}
        <View style={styles.optionsWrap}>
          <View style={styles.card}>
            <TouchableOpacity style={styles.item} onPress={handleEditNickname}>
              <View style={[styles.iconBox, { backgroundColor: '#e8f0fe' }]}>
                <Text style={[styles.iconGlyph, { color: '#1a73e8' }]}>✏️</Text>
              </View>
              <Text style={styles.itemText}>Edit nickname</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.card, { marginTop: 12 }]}>
            <TouchableOpacity style={styles.item} onPress={handleBlockToggle}>
              <View style={[styles.iconBox, { backgroundColor: '#fee8e8' }]}>
                <Text style={[styles.iconGlyph, { color: T.red }]}>🚫</Text>
              </View>
              <Text style={[styles.itemText, { color: T.red }]}>
                {isBlocked ? 'Unblock contact' : 'Block contact'}
              </Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.item} onPress={handleDeleteChat}>
              <View style={[styles.iconBox, { backgroundColor: '#fee8e8' }]}>
                <Text style={[styles.iconGlyph, { color: T.red }]}>🗑️</Text>
              </View>
              <Text style={[styles.itemText, { color: T.red }]}>Delete chat</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Nickname modal */}
      <Modal transparent visible={nickOpen} animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setNickOpen(false)}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit nickname</Text>
            <TextInput
              style={styles.modalInput}
              value={nickDraft}
              onChangeText={setNickDraft}
              autoFocus
              placeholder="Apne mobile me is naam se save karo"
              placeholderTextColor="#aaa"
            />
            <View style={styles.modalRow}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setNickOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSave}
                onPress={handleSaveNickname}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f2f2f7' },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backGlyph: { fontSize: 24, color: T.text, fontWeight: '600' },
  navTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: T.text,
    marginLeft: 8,
    fontFamily: 'Inter-SemiBold',
  },

  profileSection: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
  },
  photoImg: { width: 120, height: 120 },
  photoInitials: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: T.text,
    letterSpacing: -0.3,
    fontFamily: 'Inter-Bold',
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  username: {
    fontSize: 15,
    color: T.sub,
    fontFamily: 'Inter-Regular',
  },
  copyGlyph: { fontSize: 14 },

  optionsWrap: { paddingHorizontal: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 1 },
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconGlyph: { fontSize: 16 },
  itemText: {
    flex: 1,
    fontSize: 15.5,
    color: T.text,
    fontFamily: 'Inter-Regular',
  },
  chevron: { color: '#c7c7cc', fontSize: 22 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: T.text,
    marginBottom: 14,
    fontFamily: 'Inter-Bold',
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#e5e5ea',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: T.text,
    fontFamily: 'Inter-Regular',
  },
  modalRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 14 },
  modalCancelText: { color: '#666', fontSize: 15, fontFamily: 'Inter-Medium' },
  modalSave: {
    backgroundColor: T.green,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
});
