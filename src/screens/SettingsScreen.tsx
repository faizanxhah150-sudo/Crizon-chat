import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>APP</Text>
        <View style={styles.card}>
          <Text style={styles.name}>Crizon</Text>
          <Text style={styles.muted}>Version 1.0.0</Text>
        </View>
        <Text style={styles.section}>DEVICE SETTINGS</Text>
        <TouchableOpacity style={styles.item} onPress={() => Linking.openSettings()}>
          <Text style={styles.itemTitle}>Open Android settings</Text>
          <Text style={styles.muted}>Permissions, battery and notification controls</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  back: { width: 40, height: 40, justifyContent: 'center' },
  backText: { fontSize: 38, lineHeight: 40, color: '#075E54' },
  title: { fontSize: 20, fontWeight: '700', color: '#111' },
  content: { padding: 16 },
  section: { fontSize: 12, fontWeight: '700', color: '#777', marginTop: 12, marginBottom: 8 },
  card: { padding: 16, borderRadius: 12, backgroundColor: '#f6f6f6' },
  name: { fontSize: 17, fontWeight: '700', color: '#111' },
  item: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#111', marginBottom: 5 },
  muted: { fontSize: 13, color: '#777' },
});
