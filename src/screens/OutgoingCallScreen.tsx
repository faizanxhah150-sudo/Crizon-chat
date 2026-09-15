import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  Image,
  Alert,
} from 'react-native';
import { Session } from '../services/session';
import { CallsService } from '../services/calls';
import { AgoraService } from '../services/agora';

export default function OutgoingCallScreen({ route, navigation }: any) {
  const contact = route?.params?.contact;
  const [me, setMe] = useState<any>(null);

  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const startAt = useRef(Date.now());

  useEffect(() => {
    const loop = (a: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(a, {
            toValue: 1,
            duration: 3000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(a, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
    loop(ring1, 0).start();
    loop(ring2, 1000).start();
    loop(ring3, 2000).start();

    (async () => {
      const s = await Session.load();
      if (!s || !contact) return;
      setMe(s);
      const channel = CallsService.channelFor(s.username, contact.username);
      try {
        await CallsService.sendCallSignal({
          callerName: s.name,
          callerUsername: s.username,
          toUsername: contact.username,
          channel,
          callerUid: 1,
          myUid: 1,
        });
      } catch {}
    })();

    return () => {
      AgoraService.leave().catch(() => {});
    };
  }, []);

  const handleEnd = async () => {
    await AgoraService.leave().catch(() => {});
    if (me && contact) {
      const dur = Math.round((Date.now() - startAt.current) / 1000);
      await CallsService.logCall({
        from: me.username,
        to: contact.username,
        type: 'outgoing',
        duration: dur,
        at: Date.now(),
      });
    }
    navigation.goBack();
  };

  const initials = (n: string) =>
    (n || '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0f" />

      <View style={styles.content}>
        <View style={styles.profileContainer}>
          {[ring1, ring2, ring3].map((r, i) => {
            const scale = r.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.6],
            });
            const opacity = r.interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 0],
            });
            return (
              <Animated.View
                key={i}
                style={[
                  styles.pulseRing,
                  { opacity, transform: [{ scale }] },
                ]}
              />
            );
          })}
          <View style={styles.profilePhoto}>
            {contact?.profileUrl ? (
              <Image source={{ uri: contact.profileUrl }} style={styles.photoImg} />
            ) : (
              <Text style={styles.photoInitials}>{initials(contact?.name)}</Text>
            )}
          </View>
        </View>

        <Text style={styles.name}>{contact?.name || 'Calling…'}</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusText}>Calling</Text>
          <Text style={styles.statusDot}>•</Text>
          <Text style={styles.statusDot}>•</Text>
          <Text style={styles.statusDot}>•</Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.endBtn}
          activeOpacity={0.85}
          onPress={handleEnd}
        >
          <Text style={styles.endGlyph}>📞</Text>
        </TouchableOpacity>
        <Text style={styles.endLabel}>End Call</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0d0d0f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { alignItems: 'center' },
  profileContainer: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  pulseRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  profilePhoto: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  photoImg: { width: 160, height: 160 },
  photoInitials: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  name: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
    fontFamily: 'Inter-Bold',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  statusText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  statusDot: { color: 'rgba(255,255,255,0.4)', fontSize: 18 },

  bottom: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  endBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff3b30',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  endGlyph: {
    fontSize: 28,
    color: '#fff',
    transform: [{ rotate: '135deg' }],
  },
  endLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 14,
    fontFamily: 'Inter-Regular',
  },
});
