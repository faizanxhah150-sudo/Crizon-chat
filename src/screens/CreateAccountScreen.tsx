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
} from 'react-native';
import { AuthService } from '../services/auth';

const THEME = {
  green: '#075E54',
  text: '#1a1a1a',
  sub: '#888',
  inputBg: '#f7f8fa',
  inputBorder: '#e8e8e8',
};

export default function CreateAccountScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [strength, setStrength] = useState(0);

  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // Password strength (same logic as HTML)
  useEffect(() => {
    const v = password;
    let s = 0;
    if (v.length >= 6) s++;
    if (v.length >= 10) s++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
    if (/[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v)) s++;
    setStrength(s);
  }, [password]);

  const handleCreate = async () => {
    if (!name.trim()) return Alert.alert('Ruko', 'Apna naam likho');
    if (!username.trim()) return Alert.alert('Ruko', 'Username likho');
    if (password.length < 4) return Alert.alert('Ruko', 'Password chhota hai');
    setLoading(true);
    try {
      await AuthService.signUp(name.trim(), username, password);
      navigation.replace('CreateAccountSuccess', { name: name.trim() });
    } catch (e: any) {
      Alert.alert('Account nahi bana', e?.message || 'Kuch galat hua');
    } finally {
      setLoading(false);
    }
  };

  const strengthColors = ['#e8e8e8', '#ff4444', '#ffaa00', '#44bb44', '#075E54'];

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
          {/* Back */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <Text style={styles.logoLetter}>C</Text>
            </View>
            <Text style={styles.logoText}>Crizon</Text>
          </View>

          {/* Heading */}
          <Text style={styles.heading}>Create your account</Text>
          <Text style={styles.subheading}>
            Join Crizon and start connecting today
          </Text>

          {/* Form */}
          <Animated.View style={{ opacity: fade }}>
            {/* Name */}
            <Text style={styles.label}>Your Name</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#aaa"
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Username */}
            <Text style={[styles.label, { marginTop: 18 }]}>Username</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, { paddingRight: 4 }]}
                placeholder="username"
                placeholderTextColor="#aaa"
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={(t) => setUsername(t.replace(/\s+/g, '').toLowerCase())}
              />
              <Text style={styles.suffix}>@crizon</Text>
            </View>

            {/* Password */}
            <Text style={[styles.label, { marginTop: 18 }]}>Password</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Create a strong password"
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

            {/* Strength bars */}
            <View style={styles.strengthRow}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[
                    styles.strengthBar,
                    {
                      backgroundColor:
                        i < strength ? strengthColors[strength] : '#e8e8e8',
                    },
                  ]}
                />
              ))}
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submit, loading && { opacity: 0.7 }]}
              onPress={handleCreate}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Bottom login link */}
            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.replace('Login')}>
                <Text style={styles.loginLink}> Log in</Text>
              </TouchableOpacity>
            </View>
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
    paddingTop: 50,
    paddingBottom: 40,
    flexGrow: 1,
  },

  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  backText: { fontSize: 20, color: '#333' },

  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 28,
  },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: THEME.green,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoLetter: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter-Bold',
  },
  logoText: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.green,
    letterSpacing: 0.5,
    fontFamily: 'Inter-Bold',
  },

  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 6,
    fontFamily: 'Inter-Bold',
  },
  subheading: {
    fontSize: 14,
    color: THEME.sub,
    marginBottom: 32,
    fontFamily: 'Inter-Regular',
  },

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
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 15,
    color: THEME.text,
    fontFamily: 'Inter-Regular',
  },
  suffix: {
    color: THEME.green,
    fontSize: 14,
    fontWeight: '500',
    paddingRight: 6,
    fontFamily: 'Inter-Medium',
  },
  eyeBtn: { padding: 6 },
  eyeText: { fontSize: 16 },

  strengthRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
    height: 3,
  },
  strengthBar: { flex: 1, height: 3, borderRadius: 2 },

  submit: {
    marginTop: 24,
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
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: THEME.inputBorder },
  dividerText: {
    fontSize: 12,
    color: '#aaa',
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
  },

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  loginText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
  loginLink: {
    fontSize: 14,
    color: THEME.green,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
});
