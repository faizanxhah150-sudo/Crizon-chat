import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_SESSION = 'crizon_session';
const KEY_USERNAME = 'crizon_username';
const KEY_NAME = 'crizon_name';
const KEY_UID = 'crizon_uid';

export type SessionData = {
  uid: string;
  username: string; // e.g. faizan@crizon
  name: string;
  deviceId: string;
  sessionToken: string;
};

export const Session = {
  save: async (data: SessionData) => {
    await AsyncStorage.setItem(KEY_SESSION, JSON.stringify(data));
    await AsyncStorage.setItem(KEY_USERNAME, data.username);
    await AsyncStorage.setItem(KEY_NAME, data.name);
    await AsyncStorage.setItem(KEY_UID, data.uid);
  },

  load: async (): Promise<SessionData | null> => {
    const raw = await AsyncStorage.getItem(KEY_SESSION);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  clear: async () => {
    await AsyncStorage.multiRemove([KEY_SESSION, KEY_USERNAME, KEY_NAME, KEY_UID]);
  },
};
