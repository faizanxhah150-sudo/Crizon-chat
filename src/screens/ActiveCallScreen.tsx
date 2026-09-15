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

export default function ActiveCallScreen({ route, navigation }: any) {
  const contact = route?.params?.contact;
  const [me, setMe] = useState<any>(null);
  const [speaker, setSpeaker] = useState(false);
  const [mute, setMute] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [ended, setEnded] = useState(false);

  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
    loop(wave1, 0).start();
    loop(wave2, 800).start();

    (async () => {
      const s = await Session.load();
      if (s) setMe(s);
    })();

    const t = setInterval(() => setSeconds((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const toggleSpeaker = async () => {
    const next = !speaker;
    setSpeaker(next);
    await AgoraService.speaker(next);
  };

  const toggleMute = async () => {
    const next = !mute;
    setMute(next);
    await AgoraService.mute(next);
  };

  const endCall = async () => {
    if (ended) return;
    setEnded(true);
    await AgoraService.leave().catch(() => {});
    if (me && contact) {
      await CallsService.logCall({
        from: me.username,
        to: contact.username,
        type: 'outgoing',
        duration: seconds,
        at: Date.now(),
      });
    }
    setTimeout(() => navigation.goBack(), 200);
  };

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const initials = (n: string) =>
    (n || '?').split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase();

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0f" />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.iconGlyph}>▭</Text>
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <Text style={styles.topTitle}>{contact?.name || 'Call'}</Text>
          <Text style={styles.topSub}>🔒 End-to-end encrypted</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn}>
          <Text style={styles.iconGlyph}>➕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.profileContainer}>
          {[wave1, wave2].map((w, i) => {
            const scale = w.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.4],
            });
            const opacity = w.interpolate({
              inputRange: [0, 1],
              outputRange: [0.4, 0],
            });
            return (
              <Animated.View
                key={i}
                style={[
                  styles.audioWave,
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

        <Text style={styles.name}>{contact?.name || 'Call'}</Text>
        <View style={styles.timerRow}>
          <View style={styles.liveDot} />
          <Text style={styles.timer}>{fmt(seconds)}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.rowTop}>
          <View style={styles.controlItem}>
            <TouchableOpacity
              style={[styles.controlBtn, speaker && styles.controlBtnActive]}
              onPress={toggleSpeaker}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.controlGlyph,
                  speaker && styles.controlGlyphActive,
                ]}
              >
                🔊
              </Text>
            </TouchableOpacity>
            <Text
              style={[
                styles.controlLabel,
                speaker && styles.controlLabelActive,
              ]}
            >
              {speaker ? 'Speaker On' : 'Speaker'}
            </Text>
          </View>

          <View style={styles.controlItem}>
            <TouchableOpacity
              style={[styles.controlBtn, mute && styles.controlBtnActive]}
              onPress={toggleMute}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.controlGlyph,
                  mute && styles.controlGlyphActive,
                ]}
              >
                {mute ? '🔇' : '🎙'}
              </Text>
            </TouchableOpacity>
            <Text
              style={[
                styles.controlLabel,
                mute && styles.controlLabelActive,
              ]}
            >
              {mute ? 'Muted' : 'Mute'}
            </Text>
          </View>
        </View>

        <View style={styles.endWrap}>
          <TouchableOpacity
            style={styles.endBtn}
            onPress={endCall}
            activeOpacity={0.85}
          >
            <Text style={styles.endGlyph}>📞</Text>
          </TouchableOpacity>
          <Text style={styles.endLabel}>End</Text>
        </View>
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

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconGlyph: { color: '#fff', fontSize: 16 },
  topCenter: { flex: 1, alignItems: 'center' },
  topTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  topSub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'Inter-Regular',
  },

  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  profileContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  audioWave: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: 'rgba(52,199,89,0.3)',
  },
  profilePhoto: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOpacity: 0.3,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  photoImg: { width: 180, height: 180 },
  photoInitials: {
    color: '#fff',
    fontSize: 60,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  name: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
    fontFamily: 'Inter-Bold',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34c759',
  },
  timer: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 15,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    fontFamily: 'Inter-Medium',
  },

  controls: {
    width: '100%',
    paddingHorizontal: 24,
    paddingBottom: 60,
    alignItems: 'center',
    gap: 36,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 80,
    width: '100%',
  },
  controlItem: { alignItems: 'center', gap: 10 },
  controlBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnActive: { backgroundColor: '#ffffff' },
  controlGlyph: { fontSize: 26, color: '#fff' },
  controlGlyphActive: { color: '#1c1c1e' },
  controlLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
  controlLabelActive: { color: '#fff', fontWeight: '600' },

  endWrap: { alignItems: 'center', gap: 10 },
  endBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#ff3b30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff3b30',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  endGlyph: {
    fontSize: 30,
    color: '#fff',
    transform: [{ rotate: '135deg' }],
  },
  endLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontFamily: 'Inter-Medium',
  },
});
