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
} from 'react-native';
import { Session } from '../services/session';
import { AgoraService } from '../services/agora';
import { CallsService } from '../services/calls';
import { NotifeeService } from '../services/notifee';

export default function IncomingCallScreen({ route, navigation }: any) {
  const contact = route?.params?.contact || {};
  const channel = route?.params?.channel || CallsService.channelFor(contact.username || 'a', 'b');

  const [me, setMe] = useState<any>(null);
  const [status, setStatus] = useState<'ringing' | 'connected' | 'declined'>('ringing');

  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const vibrate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const s = await Session.load();
      if (s) setMe(s);
      await NotifeeService.dismissCall();
    })();

    const loop = (a: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(a, {
            toValue: 1,
            duration: 2500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(a, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
    loop(ring1, 0).start();
    loop(ring2, 800).start();
    loop(ring3, 1600).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(vibrate, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(vibrate, { toValue: -1, duration: 250, useNativeDriver: true }),
        Animated.timing(vibrate, { toValue: 0, duration: 250, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleAccept = async () => {
    setStatus('connected');
    try {
      await AgoraService.join(channel, 1);
      navigation.replace('ActiveCall', { contact, channel });
    } catch {
      navigation.replace('ActiveCall', { contact, channel });
    }
  };

  const handleDecline = async () => {
    setStatus('declined');
    await AgoraService.leave().catch(() => {});
    if (me && contact) {
      await CallsService.logCall({
        from: contact.username,
        to: me.username,
        type: 'missed',
        duration: 0,
        at: Date.now(),
      });
    }
    setTimeout(() => navigation.goBack(), 250);
  };

  const initials = (n: string) =>
    (n || '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0f" />

      <View style={styles.encryptionBanner}>
        <Text style={styles.lockGlyph}>🔒</Text>
        <Text style={styles.encryptionText}>End-to-end encrypted</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.profileContainer}>
          {[ring1, ring2, ring3].map((r, i) => {
            const scale = r.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.75],
            });
            const opacity = r.interpolate({
              inputRange: [0, 1],
              outputRange: [0.6, 0],
            });
            return (
              <Animated.View
                key={i}
                style={[styles.pulseRing, { opacity, transform: [{ scale }] }]}
              />
            );
          })}

          <Animated.View
            style={[
              styles.profilePhoto,
              {
                transform: [
                  {
                    translateX: vibrate.interpolate({
                      inputRange: [-1, 1],
                      outputRange: [-2, 2],
                    }),
                  },
                ],
              },
            ]}
          >
            {contact?.profileUrl ? (
              <Image source={{ uri: contact.profileUrl }} style={styles.photoImg} />
            ) : (
              <Text style={styles.photoInitials}>{initials(contact?.name)}</Text>
            )}
          </Animated.View>
        </View>

        <Text style={styles.name}>{contact?.name || 'Incoming…'}</Text>
        <Text style={styles.username}>{contact?.username || ''}</Text>
        <View style={styles.statusRow}>
          <View style={styles.dot} />
          <Text style={styles.statusText}>
            {status === 'connected'
              ? 'Connected'
              : status === 'declined'
              ? 'Declined'
              : 'Incoming voice call'}
          </Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.actionRow}>
          <View style={styles.actionItem}>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={handleDecline}
              activeOpacity={0.85}
            >
              <Text style={styles.declineGlyph}>📞</Text>
            </TouchableOpacity>
            <Text style={styles.actionLabel}>Decline</Text>
          </View>

          <View style={styles.actionItem}>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={handleAccept}
              activeOpacity={0.85}
            >
              <Text style={styles.acceptGlyph}>📞</Text>
            </TouchableOpacity>
            <Text style={styles.actionLabel}>Accept</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.messageBtn}>
          <Text style={styles.messageGlyph}>💬</Text>
          <Text style={styles.messageText}>Message</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0d0d0f',
    alignItems: 'center',
    paddingTop: 60,
  },
  encryptionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 60,
  },
  lockGlyph: { fontSize: 12 },
  encryptionText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  content: { alignItems: 'center', flex: 1 },
  profileContainer: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  pulseRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: 'rgba(52,199,89,0.15)',
  },
  profilePhoto: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  photoImg: { width: 150, height: 150 },
  photoInitials: {
    color: '#fff',
    fontSize: 52,
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
  username: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 15,
    marginTop: 4,
    fontFamily: 'Inter-Regular',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(52,199,89,0.8)',
  },
  statusText: {
    color: 'rgba(52,199,89,0.8)',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
  },

  bottom: {
    paddingBottom: 60,
    alignItems: 'center',
    width: '100%',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 80,
    marginBottom: 28,
  },
  actionItem: { alignItems: 'center', gap: 10 },
  declineBtn: {
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
  declineGlyph: {
    fontSize: 28,
    color: '#fff',
    transform: [{ rotate: '135deg' }],
  },
  acceptBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#34c759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#34c759',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  acceptGlyph: { fontSize: 28, color: '#fff' },
  actionLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  messageGlyph: { fontSize: 14 },
  messageText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
});
