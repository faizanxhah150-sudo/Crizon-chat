import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { check, request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';
import notifee, { AuthorizationStatus } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_DONE = 'crizon_perms_done';
const GREEN = '#075E54';

type Row = {
  key: string;
  title: string;
  desc: string;
  action: () => Promise<void>;
  check: () => Promise<boolean>;
};

export default function PermissionsScreen({ navigation }: any) {
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});

  const rows: Row[] = [
    {
      key: 'notif',
      title: 'Notifications',
      desc: 'Messages aur call ka notification milne ke liye.',
      check: async () => {
        if (Platform.OS === 'android') {
          const s = await notifee.getNotificationSettings();
          return s.authorizationStatus === AuthorizationStatus.AUTHORIZED;
        }
        return true;
      },
      action: async () => {
        await notifee.requestPermission();
      },
    },
    {
      key: 'fullscreen',
      title: 'Full-screen intent',
      desc: 'Lock screen pe WhatsApp jaisi call screen ke liye.',
      check: async () => {
        if (Platform.OS !== 'android') return true;
        try {
          const ok = await notifee.getNotificationSettings();
          return ok.android?.alarm === 1; // heuristic
        } catch {
          return true;
        }
      },
      action: async () => {
        try {
          await openSettings('full_screen_intent');
        } catch {
          Alert.alert(
            'Permission kholo',
            'Settings > Apps > Crizon > Special access > Full-screen intent — ON karo.'
          );
        }
      },
    },
    {
      key: 'overlay',
      title: 'Display over other apps',
      desc: 'Call screen kisi bhi app ke upar kholne ke liye.',
      check: async () => {
        if (Platform.OS !== 'android') return true;
        const perm = await check(PERMISSIONS.ANDROID.SYSTEM_ALERT_WINDOW);
        return perm === RESULTS.GRANTED;
      },
      action: async () => {
        try {
          await openSettings('overlay');
        } catch {
          Linking.openSettings();
        }
      },
    },
    {
      key: 'battery',
      title: 'Battery optimization off',
      desc: 'Xiaomi/Oppo/Vivo pe background push rokne se bachne ke liye.',
      check: async () => true,
      action: async () => {
        try {
          await openSettings('battery_optimization');
        } catch {
          Alert.alert(
            'Battery',
            'Settings > Battery > Battery optimization > Crizon > Don\'t optimize.'
          );
        }
      },
    },
    {
      key: 'mic',
      title: 'Microphone',
      desc: 'Voice call aur voice message ke liye.',
      check: async () => {
        if (Platform.OS !== 'android') return true;
        const p = await check(PERMISSIONS.ANDROID.RECORD_AUDIO);
        return p === RESULTS.GRANTED;
      },
      action: async () => {
        await request(PERMISSIONS.ANDROID.RECORD_AUDIO);
      },
    },
    {
      key: 'media',
      title: 'Photos and media',
      desc: 'Chat me image/video bhejne ke liye.',
      check: async () => {
        if (Platform.OS !== 'android') return true;
        const p = await check(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES);
        return p === RESULTS.GRANTED;
      },
      action: async () => {
        await request(PERMISSIONS.ANDROID.READ_MEDIA_IMAGES);
        await request(PERMISSIONS.ANDROID.READ_MEDIA_VIDEO);
      },
    },
  ];

  const refresh = async () => {
    const s: Record<string, boolean> = {};
    for (const r of rows) {
      try {
        s[r.key] = await r.check();
      } catch {
        s[r.key] = false;
      }
    }
    setStatuses(s);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleRow = async (row: Row) => {
    await row.action();
    setTimeout(refresh, 800);
  };

  const handleContinue = async () => {
    await AsyncStorage.setItem(KEY_DONE, '1');
    navigation.replace('ChatList');
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.heading}>Setup Crizon</Text>
        <Text style={styles.sub}>
          App ko theek se chalane ke liye ye permissions zaroori hain. Ek-ek pe
          tap karke ON karo.
        </Text>

        {rows.map((r) => {
          const ok = statuses[r.key];
          return (
            <TouchableOpacity
              key={r.key}
              style={styles.row}
              onPress={() => handleRow(r)}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.badge,
                  { backgroundColor: ok ? '#d4f7dc' : '#fff1cd' },
                ]}
              >
                <Text
                  style={[
                    styles.badgeGlyph,
                    { color: ok ? '#1a9c3c' : '#b58300' },
                  ]}
                >
                  {ok ? '✓' : '!'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{r.title}</Text>
                <Text style={styles.rowDesc}>{r.desc}</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={styles.continue}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueText}>Continue to Crizon</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff', paddingTop: 50 },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1a1a',
    paddingHorizontal: 24,
    fontFamily: 'Inter-Bold',
  },
  sub: {
    fontSize: 14,
    color: '#8e8e93',
    paddingHorizontal: 24,
    marginTop: 6,
    marginBottom: 24,
    fontFamily: 'Inter-Regular',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5ea',
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  badgeGlyph: { fontSize: 18, fontWeight: '700' },
  rowTitle: {
    fontSize: 15.5,
    fontWeight: '600',
    color: '#1a1a1a',
    fontFamily: 'Inter-SemiBold',
  },
  rowDesc: {
    fontSize: 12.5,
    color: '#8e8e93',
    marginTop: 2,
    fontFamily: 'Inter-Regular',
  },
  chevron: { color: '#c7c7cc', fontSize: 22 },
  continue: {
    backgroundColor: GREEN,
    marginHorizontal: 24,
    marginTop: 32,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
});
