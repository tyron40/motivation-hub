import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      return (
        <LinearGradient
          colors={[Colors.background, '#1A1A2E', '#0F0F1E']}
          style={styles.container}
        >
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <AlertTriangle color={Colors.accent} size={64} />
            </View>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              We&apos;re sorry, but something unexpected happened. Please try again.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={this.resetError}>
              <RefreshCw color={Colors.background} size={20} />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(236, 72, 153, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  message: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundary;