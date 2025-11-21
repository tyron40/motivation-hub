import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { trpcClient } from '@/lib/trpc';

interface DiagnosticResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export function PodcastDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (result: DiagnosticResult) => {
    setResults(prev => [...prev, result]);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);

    const BACKEND_URL = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'https://motivation-hub-iota.vercel.app';
    const TEST_RSS_URL = 'https://feeds.feedburner.com/thetonyrobbinspodcast';

    addResult({
      test: 'Environment Check',
      status: 'success',
      message: `Backend URL: ${BACKEND_URL}`,
    });

    addResult({
      test: 'Health Check',
      status: 'pending',
      message: 'Testing backend availability...',
    });

    try {
      const healthResponse = await fetch(`${BACKEND_URL}/api/health`, {
        method: 'GET',
      });

      if (!healthResponse.ok) {
        throw new Error(`HTTP ${healthResponse.status}`);
      }

      const healthData = await healthResponse.json();

      addResult({
        test: 'Health Check',
        status: 'success',
        message: 'Backend is reachable',
        details: healthData,
      });
    } catch (error) {
      addResult({
        test: 'Health Check',
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to reach backend',
        details: error,
      });
      setIsRunning(false);
      return;
    }

    addResult({
      test: 'Direct RSS Fetch',
      status: 'pending',
      message: 'Testing direct RSS feed access...',
    });

    try {
      const rssResponse = await fetch(TEST_RSS_URL, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      });

      if (!rssResponse.ok) {
        throw new Error(`HTTP ${rssResponse.status}`);
      }

      const rssText = await rssResponse.text();

      addResult({
        test: 'Direct RSS Fetch',
        status: 'success',
        message: `Successfully fetched RSS (${rssText.length} bytes)`,
      });
    } catch (error) {
      addResult({
        test: 'Direct RSS Fetch',
        status: 'error',
        message: `CORS blocked or network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: error,
      });
    }

    addResult({
      test: 'tRPC Podcast Query (via trpcClient)',
      status: 'pending',
      message: 'Testing tRPC podcast.rssFeed endpoint...',
    });

    try {
      const result = await trpcClient.podcast.rssFeed.query({
        url: TEST_RSS_URL,
      });

      addResult({
        test: 'tRPC Podcast Query (via trpcClient)',
        status: 'success',
        message: `Successfully fetched ${result.items?.length || 0} items`,
        details: { itemCount: result.items?.length, hasImage: !!result.image },
      });
    } catch (error) {
      addResult({
        test: 'tRPC Podcast Query (via trpcClient)',
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to fetch via tRPC',
        details: error,
      });
    }

    addResult({
      test: 'Manual tRPC HTTP Request',
      status: 'pending',
      message: 'Testing manual HTTP request to tRPC endpoint...',
    });

    try {
      const manualResponse = await fetch(`${BACKEND_URL}/api/trpc/podcast.rssFeed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: TEST_RSS_URL,
        }),
      });

      console.log('Manual tRPC response status:', manualResponse.status);
      console.log('Manual tRPC response headers:', Object.fromEntries(manualResponse.headers.entries()));

      const responseText = await manualResponse.text();
      console.log('Manual tRPC response text (first 500 chars):', responseText.substring(0, 500));

      if (!manualResponse.ok) {
        throw new Error(`HTTP ${manualResponse.status}: ${responseText}`);
      }

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        throw new Error('Response is not valid JSON');
      }

      addResult({
        test: 'Manual tRPC HTTP Request',
        status: 'success',
        message: 'Manual HTTP request succeeded',
        details: responseData,
      });
    } catch (error) {
      addResult({
        test: 'Manual tRPC HTTP Request',
        status: 'error',
        message: error instanceof Error ? error.message : 'Manual HTTP request failed',
        details: error,
      });
    }

    setIsRunning(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Podcast Diagnostic Tool</Text>
        <Text style={styles.subtitle}>
          This tool helps diagnose why podcast RSS feeds are not loading
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, isRunning && styles.buttonDisabled]}
        onPress={runDiagnostics}
        disabled={isRunning}
      >
        {isRunning ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Run Diagnostics</Text>
        )}
      </TouchableOpacity>

      <View style={styles.results}>
        {results.map((result, index) => (
          <View key={index} style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTest}>{result.test}</Text>
              <View
                style={[
                  styles.statusBadge,
                  result.status === 'success' && styles.statusSuccess,
                  result.status === 'error' && styles.statusError,
                  result.status === 'pending' && styles.statusPending,
                ]}
              >
                <Text style={styles.statusText}>
                  {result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : '⏳'}
                </Text>
              </View>
            </View>
            <Text style={styles.resultMessage}>{result.message}</Text>
            {result.details && (
              <Text style={styles.resultDetails}>
                {JSON.stringify(result.details, null, 2).substring(0, 200)}
              </Text>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    margin: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  results: {
    padding: 20,
  },
  resultCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultTest: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusSuccess: {
    backgroundColor: '#00800020',
  },
  statusError: {
    backgroundColor: '#ff000020',
  },
  statusPending: {
    backgroundColor: '#ffa50020',
  },
  statusText: {
    fontSize: 16,
  },
  resultMessage: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 4,
  },
  resultDetails: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Courier',
    marginTop: 8,
  },
});
