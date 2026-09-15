import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { AuthService } from '../services/auth';

const THEME = {
  green: '#075E54',
  greenDark: '#0a7a6d',
  text: '#1a1a1a',
  sub: '#999',
  inputBg: '#f7f8fa',
  inputBorder: '#e8e8e8',
  icon: '#bbb',
};

export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const fadeTop = useRef(new Animated.Value(0)).current;
  const fadeDown = useRef(new Animated.Value(0)).current;
  const fadeUp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(fadeTop, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(fadeDown, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(fadeUp, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Ruko', 'Username aur password dono bharo');
      return;
    }
    setLoading(true);
    try {
      await AuthService.signIn(username, password);
      navigation.replace('ChatList');
    } catch (e: any) {
      Alert.alert('Login fail', e?.message || 'Username ya password galat hai');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top section: logo + heading */}
          <Animated.View
            style={[
              styles.topSection,
              {
                opacity: fadeTop,
                transform: [
                  {
                    translateY: fadeTop.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.logoBox}>
              <Text style={styles.logoLetter}>C</Text>
            </View>
            <Text style={styles.logoText}>Crizon</Text>
            <Text style={styles.heading}>Welcome back</Text>
            <Text style={styles.subheading}>
              Sign in to continue your conversations
            </Text>
            <View style={styles.dots}>
              <View style={[styles.dot, { opacity: 0.3 }]} />
              <View style={[styles.dotLong, { opacity: 0.6 }]} />
              <View style={[styles.dot, { opacity: 0.3 }]} />
            </View>
          </Animated.View>

          {/* Form */}
          <Animated.View
            style={[
              styles.formSection,
              {
                opacity: fadeDown,
                transform: [
                  {
                    translateY: fadeDown.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* Username */}
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your username"
                placeholderTextColor="#aaa"
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={setUsername}
              />
            </View>

            {/* Password */}
            <Text style={[styles.label, { marginTop: 18 }]}>Password</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="#aaa"
                secureTextEntry={!showPw}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPw(!showPw)}
                style={styles.eyeBtn}
              >
                <Text style={styles.eyeText}>{showPw ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            {/* Forgot */}
            <TouchableOpacity style={styles.forgotRow}>
              <Text style={styles.forgotLink}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Login button */}
            <TouchableOpacity
              style={[styles.submit, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Log In</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social buttons (visually present, disabled for private app) */}
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn} disabled>
                <Text style={styles.socialIcon}>G</Text>
                <Text style={styles.socialText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn} disabled>
                <Text style={[styles.socialIcon, { color: '#1877F2' }]}>f</Text>
                <Text style={styles.socialText}>Facebook</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Bottom link */}
          <Animated.View
            style={[
              styles.bottomSection,
              { opacity: fadeUp },
            ]}
          >
            <Text style={styles.signupText}>
              Don't have an account?
              <Text
                style={styles.signupLink}
                onPress={() => navigation.navigate('CreateAccount')}
              >
                {' '}Create new account
              </Text>
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#ffffff' },
  scroll: {
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
    flexGrow: 1,
  },

  topSection: { alignItems: 'center', marginBottom: 36 },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: THEME.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: THEME.green,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  logoLetter: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.green,
    letterSpacing: 1,
    marginBottom: 24,
    fontFamily: 'Inter-Bold',
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: THEME.text,
    textAlign: 'center',
    fontFamily: 'Inter-Bold',
  },
  subheading: {
    fontSize: 14,
    color: THEME.sub,
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  dots: { flexDirection: 'row', gap: 6, marginTop: 20 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.green },
  dotLong: { width: 20, height: 6, borderRadius: 3, backgroundColor: THEME.green },

  formSection: { width: '100%' },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
    marginBottom: 8,
    fontFamily: 'Inter-Medium',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.inputBg,
    borderWidth: 1.5,
    borderColor: THEME.inputBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  inputIcon: { fontSize: 16, marginRight: 8 },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 15,
    color: THEME.text,
    fontFamily: 'Inter-Regular',
  },
  eyeBtn: { padding: 6 },
  eyeText: { fontSize: 16 },

  forgotRow: { alignItems: 'flex-end', marginTop: 10, marginBottom: 24 },
  forgotLink: {
    color: THEME.green,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
  },

  submit: {
    backgroundColor: THEME.green,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: THEME.green,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 28,
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: THEME.inputBorder },
  dividerText: {
    fontSize: 11,
    color: '#aaa',
    fontWeight: '500',
    letterSpacing: 0.6,
    fontFamily: 'Inter-Medium',
  },

  socialRow: { flexDirection: 'row', gap: 12 },
  socialBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: THEME.inputBorder,
    borderRadius: 14,
    gap: 8,
    opacity: 0.6,
  },
  socialIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
    fontFamily: 'Inter-Bold',
  },
  socialText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
  },

  bottomSection: { marginTop: 'auto', alignItems: 'center', paddingTop: 24 },
  signupText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
  signupLink: {
    color: THEME.green,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
});
