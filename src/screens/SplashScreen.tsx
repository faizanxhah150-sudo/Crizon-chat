import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function SplashScreen({ navigation }: any) {
  const letters = ['C', 'r', 'i', 'z', 'o', 'n'];
  const anims = letters.map(() => useRef(new Animated.Value(0)).current);
  const shimmer = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const fadeAll = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Letters reveal
    letters.forEach((_, i) => {
      Animated.timing(anims[i], {
        toValue: 1,
        duration: 700,
        delay: 200 + i * 100,
        useNativeDriver: true,
      }).start();
    });

    // Glow pulse
    Animated.sequence([
      Animated.delay(500),
      Animated.timing(glow, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0.6, duration: 1500, useNativeDriver: true }),
    ]).start();

    // Shimmer sweep
    Animated.sequence([
      Animated.delay(1200),
      Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
    ]).start();

    // Fade out at 3.8s -> go to Login (App.tsx handles initial routing, but this navigates if needed)
    const t = setTimeout(() => {
      Animated.timing(fadeAll, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }).start(() => {
        // App.tsx already decided initial route; Splash is just visual.
        navigation?.replace?.('Login');
      });
    }, 3800);

    return () => clearTimeout(t);
  }, []);

  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAll }]}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />

      {/* ambient glow */}
      <Animated.View
        style={[
          styles.ambient,
          {
            opacity: glow,
            transform: [
              {
                scale: glow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1.05],
                }),
              },
            ],
          },
        ]}
      />

      {/* Letters row + shimmer overlay */}
      <View style={styles.textRow}>
        {letters.map((L, i) => {
          const opacity = anims[i];
          const translateY = anims[i].interpolate({
            inputRange: [0, 1],
            outputRange: [40, 0],
          });
          const scale = anims[i].interpolate({
            inputRange: [0, 1],
            outputRange: [0.9, 1],
          });
          return (
            <Animated.Text
              key={i}
              style={[
                styles.letter,
                { opacity, transform: [{ translateY }, { scale }] },
              ]}
            >
              {L}
            </Animated.Text>
          );
        })}

        {/* Shimmer */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.shimmer,
            { transform: [{ translateX: shimmerTranslate }] },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ambient: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    backgroundColor: 'rgba(212,175,55,0.06)',
    borderRadius: 9999,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  letter: {
    color: '#f2efe9',
    fontSize: 54,
    fontWeight: '700',
    letterSpacing: 10,
    textShadowColor: 'rgba(242,239,233,0.12)',
    textShadowRadius: 20,
    textShadowOffset: { width: 0, height: 0 },
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.55)',
    transform: [{ skewX: '-20deg' }],
    opacity: 0.6,
  },
});
