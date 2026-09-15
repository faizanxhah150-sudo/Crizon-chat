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
import { launchImageLibrary } from 'react-native-image-picker';
import { Session } from '../services/session';
import { ProfileService } from '../services/profile';
import { AuthService } from '../services/auth';

const T = {
  green: '#075E54',
  text: '#1a1a1a',
  sub: '#8e8e93',
  card: '#ffffff',
  border: '#e5e5ea',
};

export default function ProfileScreen({ navigation }: any) {
  const [me, setMe] = useState<any>(null);
  const [nameEditOpen, setNameEditOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const s = await Session.load();
    if (!s) return;
    setMe(s);
  };

  useEffect(() => {
    load();
  }, []);

  const handleCopyId = () => {
    if (!me?.username) return;
    Clipboard.setString(me.username);
    Alert.alert('Copied', me.username);
  };

  const handlePickImage = async () => {
    const res = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 800,
      maxHeight: 800,
    });
    if (res.didCancel || !res.assets?.[0]?.uri) return;
    setUploading(true);
    try {
      const url = await ProfileService.uploadProfileImage(me.uid, res.assets[0].uri);
      // update local session name / refresh
      await load();
      Alert.alert('Done', 'Profile photo update ho gayi');
    } catch (e: any) {
      Alert.alert('Upload fail', e?.message || 'Try again');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) return Alert.alert('Ruko', 'Naam khali nahi ho sakta');
    await ProfileService.updateName(me.uid, trimmed);
    // update session
    await Session.save({ ...me, name: trimmed });
    setNameEditOpen(false);
    await load();
  };

  const handleLogout = () => {
    Alert.alert('Log out?', 'App se bahar ho jaoge.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          await AuthService.signOut();
          navigation.replace('Login');
        },
      },
    ]);
  };

  const initials = (n: string) =>
    (n || '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.appBar}>
        <Text style={styles.appBarTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Profile card */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={handlePickImage}
          activeOpacity={0.8}
          disabled={uploading}
        >
          <View style={styles.photoWrap}>
            <View style={styles.photo}>
              {me?.profileUrl ? (
                <Image source={{ uri: me.profileUrl }} style={styles.photoImg} />
              ) : (
                <Text style={styles.photoInitials}>{initials(me?.name)}</Text>
              )}
            </View>
            <View style={styles.cameraDot}>
              <Text style={styles.cameraGlyph}>{uploading ? '⏳' : '📷'}</Text>
            </View>
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.profileName}>{me?.name || '—'}</Text>
            <Text style={styles.profileStatus}>Available</Text>
            <Text style={styles.profileUsername}>{me?.username || ''}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* Copy ID */}
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.item} onPress={handleCopyId}>
            <View style={[styles.iconBox, { backgroundColor: '#e8f0fe' }]}>
              <Text style={[styles.iconGlyph, { color: '#1a73e8' }]}>🆔</Text>
            </View>
            <Text style={styles.itemText}>Copy my user ID</Text>
            <Text style={styles.chevronSmall}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.item}
            onPress={() => {
              setNameDraft(me?.name || '');
              setNameEditOpen(true);
            }}
          >
            <View style={[styles.iconBox, { backgroundColor: '#e6f7ed' }]}>
              <Text style={[styles.iconGlyph, { color: '#34a853' }]}>✏️</Text>
            </View>
            <Text style={styles.itemText}>Change display name</Text>
            <Text style={styles.chevronSmall}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Extra settings (visual, WhatsApp style) */}
        <View style={[styles.settingsCard, { marginTop: 12 }]}>
          <TouchableOpacity style={styles.item} onPress={handleLogout}>
            <View style={[styles.iconBox, { backgroundColor: '#fee8e8' }]}>
              <Text style={[styles.iconGlyph, { color: '#ea4335' }]}>🚪</Text>
            </View>
            <Text style={[styles.itemText, { color: '#ea4335' }]}>Log out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Name edit modal */}
      <Modal transparent visible={nameEditOpen} animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setNameEditOpen(false)}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Change display name</Text>
            <TextInput
              style={styles.modalInput}
              value={nameDraft}
              onChangeText={setNameDraft}
              autoFocus
              placeholder="Your name"
              placeholderTextColor="#aaa"
            />
            <View style={styles.modalRow}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setNameEditOpen(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSaveName}>
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
  appBar: { paddingTop: 50, paddingBottom: 16, alignItems: 'center', backgroundColor: '#fff' },
  appBarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: T.text,
    fontFamily: 'Inter-Bold',
  },

  profileCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  photoWrap: { position: 'relative' },
  photo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoImg: { width: 72, height: 72 },
  photoInitials: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  cameraDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1a73e8',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  cameraGlyph: { fontSize: 12 },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: T.text,
    fontFamily: 'Inter-Bold',
  },
  profileStatus: {
    fontSize: 14,
    color: T.sub,
    marginTop: 2,
    fontFamily: 'Inter-Regular',
  },
  profileUsername: {
    fontSize: 12.5,
    color: T.green,
    marginTop: 4,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
  },
  chevron: { color: '#c7c7cc', fontSize: 26 },

  settingsCard: {
    marginHorizontal: 16,
    marginTop: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
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
  chevronSmall: { color: '#c7c7cc', fontSize: 22 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: T.text,
    marginBottom: 14,
    fontFamily: 'Inter-Bold',
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: T.border,
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
