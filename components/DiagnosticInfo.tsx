import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react-native';

export function DiagnosticInfo() {
  const [testResults, setTestResults] = useState<{
    envCheck: boolean;
    healthCheck: boolean | null;
    ttsCheck: boolean | null;
    error: string | null;
  }>({
    envCheck: false,
    healthCheck: null,
    ttsCheck: null,
    error: null,
  });
  const [testing, setTesting] = useState(false);

  const API_BASE = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'NOT SET';

  const runDiagnostics = async () => {
    setTesting(true);
    const results = {
      envCheck: !!process.env.EXPO_PUBLIC_RORK_API_BASE_URL,
      healthCheck: null as boolean | null,
      ttsCheck: null as boolean | null,
      error: null as string | null,
    };

    try {
      console.log('🔍 Running diagnostics...');
      console.log('🔍 API Base URL:', API_BASE);

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
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Endpoint Tests</Text>
        
        <View style={styles.row}>
          {testResults.healthCheck === null ? (
            <AlertCircle size={20} color="#6b7280" />
          ) : testResults.healthCheck ? (
            <CheckCircle size={20} color="#10b981" />
          ) : (
            <XCircle size={20} color="#ef4444" />
          )}
          <Text style={styles.label}>Health Check (/api/health)</Text>
        </View>

        <View style={styles.row}>
          {testResults.ttsCheck === null ? (
            <AlertCircle size={20} color="#6b7280" />
          ) : testResults.ttsCheck ? (
            <CheckCircle size={20} color="#10b981" />
          ) : (
            <XCircle size={20} color="#ef4444" />
          )}
          <Text style={styles.label}>TTS Endpoint (/api/tts)</Text>
        </View>
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
        <Text style={styles.instructionsTitle}>📋 Troubleshooting Steps:</Text>
        <Text style={styles.instructionsText}>
          1. Verify the URL above matches your Vercel deployment{'\n'}
          2. Open the URL in your phone&apos;s browser to test connectivity{'\n'}
          3. Check that your phone has internet access{'\n'}
          4. If URL is &quot;NOT SET&quot;, rebuild the app after setting .env{'\n'}
          5. Check Vercel deployment logs for errors
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
