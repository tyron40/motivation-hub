import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={styles.container}>
        <Text style={styles.emoji}>🔍</Text>
        <Text style={styles.title}>Page Not Found</Text>
        <Text style={styles.subtitle}>The page you are looking for does not exist.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
          <Text style={styles.buttonText}>Go Home</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold' as const,
    marginBottom: 8,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 16,
    textAlign: 'center' as const,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#6C63FF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
