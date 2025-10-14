import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react-native';
import { fetchTrendingYouTubeContent } from '@/services/youtubeDirectService';

export function DiagnosticInfo() {
  const [testResults, setTestResults] = useState<{
    envCheck: boolean;
    youtubeApiCheck: boolean | null;
    healthCheck: boolean | null;
    ttsCheck: boolean | null;
    error: string | null;
  }>({
    envCheck: false,
    youtubeApiCheck: null,
    healthCheck: null,
    ttsCheck: null,
    error: null,
  });
  const [testing, setTesting] = useState(false);

  const API_BASE = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'NOT SET';
  const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || 'NOT SET';

  const runDiagnostics = async () => {
    setTesting(true);
    const results = {
      envCheck: !!process.env.EXPO_PUBLIC_RORK_API_BASE_URL,
      youtubeApiCheck: null as boolean | null,
      healthCheck: null as boolean | null,
      ttsCheck: null as boolean | null,
      error: null as string | null,
    };

    try {
      console.log('🔍 Running diagnostics...');
      console.log('🔍 API Base URL:', API_BASE);
      console.log('🔍 YouTube API Key:', YOUTUBE_API_KEY.substring(0, 10) + '...');
      console.log('🔍 Platform:', Platform.OS);

      console.log('🔍 Testing YouTube API (direct)...');
      try {
        const videos = await fetchTrendingYouTubeContent(5);
        results.youtubeApiCheck = videos.length > 0;
        console.log('✅ YouTube API check result:', videos.length, 'videos fetched');
      } catch (error: any) {
        console.error('❌ YouTube API error:', error);
        results.youtubeApiCheck = false;
        if (!results.error) {
          results.error = `YouTube API: ${error?.message || 'Unknown error'}`;
        }
      }

      const healthUrl = `${API_BASE}/api/health`;
      console.log('🔍 Testing health endpoint:', healthUrl);

      const healthResponse = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        },
        cache: 'no-store',
      });

      results.healthCheck = healthResponse.ok;
      console.log('✅ Health check result:', healthResponse.ok, healthResponse.status);

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('✅ Health data:', healthData);

        const ttsUrl = `${API_BASE}/api/tts`;
        console.log('🔍 Testing TTS endpoint:', ttsUrl);

        const ttsResponse = await fetch(ttsUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            text: 'Test',
            voice: 'alloy',
          }),
        });

        results.ttsCheck = ttsResponse.ok;
        console.log('✅ TTS check result:', ttsResponse.ok, ttsResponse.status);
      }
    } catch (error: any) {
      console.error('❌ Diagnostic error:', error);
      results.error = error?.message || 'Unknown error';
    }

    setTestResults(results);
    setTesting(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Diagnostic Info</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Environment Variables</Text>
        <View style={styles.row}>
          {testResults.envCheck ? (
            <CheckCircle size={20} color="#10b981" />
          ) : (
            <XCircle size={20} color="#ef4444" />
          )}
          <Text style={styles.label}>EXPO_PUBLIC_RORK_API_BASE_URL:</Text>
        </View>
        <Text style={styles.value}>{API_BASE}</Text>
        
        <View style={[styles.row, { marginTop: 12 }]}>
          {YOUTUBE_API_KEY !== 'NOT SET' ? (
            <CheckCircle size={20} color="#10b981" />
          ) : (
            <XCircle size={20} color="#ef4444" />
          )}
          <Text style={styles.label}>EXPO_PUBLIC_YOUTUBE_API_KEY:</Text>
        </View>
        <Text style={styles.value}>{YOUTUBE_API_KEY.substring(0, 20)}...</Text>
        
        <View style={[styles.row, { marginTop: 12 }]}>
          <AlertCircle size={20} color="#6b7280" />
          <Text style={styles.label}>Platform: {Platform.OS}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Tests</Text>
        
        <View style={styles.row}>
          {testResults.youtubeApiCheck === null ? (
            <AlertCircle size={20} color="#6b7280" />
          ) : testResults.youtubeApiCheck ? (
            <CheckCircle size={20} color="#10b981" />
          ) : (
            <XCircle size={20} color="#ef4444" />
          )}
          <Text style={styles.label}>YouTube API (Direct)</Text>
        </View>
        <Text style={styles.helperText}>Tests direct YouTube API calls from client</Text>
        
        <View style={[styles.row, { marginTop: 12 }]}>
          {testResults.healthCheck === null ? (
            <AlertCircle size={20} color="#6b7280" />
          ) : testResults.healthCheck ? (
            <CheckCircle size={20} color="#10b981" />
          ) : (
            <XCircle size={20} color="#ef4444" />
          )}
          <Text style={styles.label}>Vercel Health Check</Text>
        </View>
        <Text style={styles.helperText}>Tests Vercel backend connectivity</Text>

        <View style={[styles.row, { marginTop: 12 }]}>
          {testResults.ttsCheck === null ? (
            <AlertCircle size={20} color="#6b7280" />
          ) : testResults.ttsCheck ? (
            <CheckCircle size={20} color="#10b981" />
          ) : (
            <XCircle size={20} color="#ef4444" />
          )}
          <Text style={styles.label}>TTS Endpoint</Text>
        </View>
        <Text style={styles.helperText}>Tests text-to-speech backend feature</Text>
      </View>

      {testResults.error && (
        <View style={styles.errorSection}>
          <Text style={styles.errorTitle}>Error:</Text>
          <ScrollView style={styles.errorScroll}>
            <Text style={styles.errorText}>{testResults.error}</Text>
          </ScrollView>
        </View>
      )}

      <TouchableOpacity
        style={[styles.button, testing && styles.buttonDisabled]}
        onPress={runDiagnostics}
        disabled={testing}
      >
        {testing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Run Diagnostics</Text>
        )}
      </TouchableOpacity>

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>📋 What This Means:</Text>
        <Text style={styles.instructionsText}>
          ✅ YouTube API (Direct): Your app fetches videos directly from YouTube.{' '}
          This is the PRIMARY method and should work on TestFlight.{'\n\n'}
          ⚠️ Vercel Backend: Only needed for AI Chat, Voice Coach, and TTS features.{' '}
          If these fail, your YouTube videos will still work!{'\n\n'}
          🔧 Troubleshooting:{'\n'}
          1. If YouTube API fails: Check EXPO_PUBLIC_YOUTUBE_API_KEY in .env{'\n'}
          2. If Vercel fails: Check backend deployment at Vercel dashboard{'\n'}
          3. Test connectivity: Open Vercel URL in Safari on your device{'\n'}
          4. Rebuild app after changing .env variables
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 20,
    color: '#111827',
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 10,
    color: '#374151',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500' as const,
  },
  value: {
    fontSize: 12,
    color: '#111827',
    fontFamily: 'monospace',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  helperText: {
    fontSize: 11,
    color: '#9ca3af',
    marginLeft: 28,
    marginTop: 2,
    fontStyle: 'italic' as const,
  },
  errorSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#dc2626',
    marginBottom: 8,
  },
  errorScroll: {
    maxHeight: 100,
  },
  errorText: {
    fontSize: 12,
    color: '#991b1b',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  instructions: {
    padding: 15,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1e40af',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 12,
    color: '#1e3a8a',
    lineHeight: 18,
  },
});
