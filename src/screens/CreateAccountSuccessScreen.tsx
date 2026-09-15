import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');
const GREEN = '#34c759';

export default function CreateAccountSuccessScreen({ route, navigation }: any) {
  const name = route?.params?.name || 'User';

  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ring3 = useRef(new Animated.Value(0)).current;
  const circle = useRef(new Animated.Value(0)).current;
  const check = useRef(new Animated.Value(0)).current;
  const text = useRef(new Animated.Value(0)).current;
  const btn = useRef(new Animated.Value(0)).current;

  // Confetti
  const confetti = [
    { v: useRef(new Animated.Value(0)).current, color: '#34c759', shape: 'circle', x: width * 0.15 },
    { v: useRef(new Animated.Value(0)).current, color: '#667eea', shape: 'square', x: width * 0.8 },
    { v: useRef(new Animated.Value(0)).current, color: '#f59e0b', shape: 'circle', x: width * 0.25 },
    { v: useRef(new Animated.Value(0)).current, color: '#ec4899', shape: 'square', x: width * 0.75 },
  ];

  useEffect(() => {
    const loopRing = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );

    loopRing(ring1, 0).start();
    loopRing(ring2, 500).start();
    loopRing(ring3, 1000).start();

    Animated.sequence([
      Animated.timing(circle, {
        toValue: 1,
        duration: 600,
        delay: 200,
        easing: Easing.out(Easing.back(1.56)),
        useNativeDriver: true,
      }),
      Animated.timing(check, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(text, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(btn, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    confetti.forEach((c, i) => {
      Animated.timing(c.v, {
        toValue: 1,
        duration: 3000,
        delay: 1500 + i * 100,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
  }, []);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Confetti */}
      {confetti.map((c, i) => {
        const translateY = c.v.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 400],
        });
        const opacity = c.v.interpolate({
          inputRange: [0, 0.8, 1],
          outputRange: [1, 1, 0],
        });
        return (
          <Animated.View
            key={i}
            style={[
              {
                position: 'absolute',
                top: '20%',
                left: c.x,
                width: 10,
                height: 10,
                backgroundColor: c.color,
                borderRadius: c.shape === 'circle' ? 5 : 2,
                opacity,
                transform: [{ translateY }],
              },
            ]}
          />
        );
      })}

      <View style={styles.center}>
        {/* Rings */}
        <View style={styles.iconContainer}>
          {[ring1, ring2, ring3].map((r, i) => {
            const scale = r.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.5],
            });
            const opacity = r.interpolate({
              inputRange: [0, 1],
              outputRange: [0.5, 0],
            });
            return (
              <Animated.View
                key={i}
                style={[
                  styles.ring,
                  {
                    opacity,
                    transform: [{ scale }],
                  },
                ]}
              />
            );
          })}

          {/* Main circle */}
          <Animated.View
            style={[
              styles.circle,
              {
                transform: [
                  {
                    scale: circle.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1],
                    }),
                  },
                ],
                opacity: circle,
              },
            ]}
          >
            <Animated.Text
              style={[
                styles.checkText,
                {
                  opacity: check,
                  transform: [
                    {
                      scale: check.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              ✓
            </Animated.Text>
          </Animated.View>
        </View>

        {/* Text */}
        <Animated.View
          style={[
            styles.textBlock,
            {
              opacity: text,
              transform: [
                {
                  translateY: text.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.title}>Account Created{'\n'}Successfully!</Text>
          <Text style={styles.subtitle}>Welcome to Crizon, {name}</Text>
        </Animated.View>
      </View>

      {/* Continue button */}
      <Animated.View
        style={[
          styles.bottom,
          {
            opacity: btn,
            transform: [
              {
                translateY: btn.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.continueBtn}
          activeOpacity={0.85}
          onPress={() => navigation.replace('ChatList')}
        >
          <Text style={styles.continueText}>Continue to Chats</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 160,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  ring: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: 'rgba(52,199,89,0.25)',
  },
  circle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: GREEN,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: GREEN,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  checkText: {
    color: '#fff',
    fontSize: 64,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
    marginTop: -4,
  },
  textBlock: { alignItems: 'center' },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: 10,
    fontFamily: 'Inter-Bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#8e8e93',
    fontFamily: 'Inter-Regular',
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  continueBtn: {
    backgroundColor: GREEN,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: GREEN,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  continueText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
});
