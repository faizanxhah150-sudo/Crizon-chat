import { db, C } from './firebase';
import { CLOUDINARY } from '../config/credentials';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ProfileService = {
  /**
   * Update user's display name in Firestore.
   */
  updateName: async (uid: string, name: string) => {
    await db.collection(C.users).doc(uid).update({ name: name.trim() });
  },

  /**
   * Upload profile image to Cloudinary (unsigned preset),
   * then save secure_url to Firestore users/{uid}.profileUrl
   */
  uploadProfileImage: async (uid: string, fileUri: string): Promise<string> => {
    const form = new FormData();
    form.append('file', {
      uri: fileUri,
      type: 'image/jpeg',
      name: `profile_${uid}.jpg`,
    } as any);
    form.append('upload_preset', CLOUDINARY.uploadPreset);

    const res = await fetch(CLOUDINARY.uploadUrl, {
      method: 'POST',
      body: form,
    });
    const json = await res.json();
    if (!json.secure_url) throw new Error('Upload fail');

    await db
      .collection(C.users)
      .doc(uid)
      .update({ profileUrl: json.secure_url });
    return json.secure_url;
  },

  /**
   * Nickname is local-only per device (WhatsApp style rename)
   */
  setNickname: async (contactUsername: string, nickname: string) => {
    const key = `crizon_nick_${contactUsername}`;
    if (nickname.trim()) await AsyncStorage.setItem(key, nickname.trim());
    else await AsyncStorage.removeItem(key);
  },

  getNickname: async (contactUsername: string): Promise<string | null> => {
    return AsyncStorage.getItem(`crizon_nick_${contactUsername}`);
  },
};
