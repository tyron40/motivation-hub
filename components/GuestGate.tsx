import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lock, UserPlus, LogIn, X } from 'lucide-react-native';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/auth-context';
import { useTheme } from '@/hooks/theme-context';

interface GuestGateProps {
  children: React.ReactNode;
  feature?: string;
}

export function GuestGate({ children, feature }: GuestGateProps) {
  const { isGuest } = useAuth();

  if (!isGuest) {
    return <>{children}</>;
  }

  return <GuestBlockScreen feature={feature} />;
}

interface GuestBlockScreenProps {
  feature?: string;
}

function GuestBlockScreen({ feature }: GuestBlockScreenProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const featureText = feature || 'this feature';

  return (
    <LinearGradient
      colors={[colors.background, colors.card, colors.background]}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <LinearGradient
            colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.04)']}
            style={styles.iconCircle}
          >
            <Lock color={colors.primary} size={40} />
          </LinearGradient>
        </View>

        <Text style={styles.title}>Account Required</Text>
        <Text style={styles.subtitle}>
          Create a free account or sign in to access {featureText}. It only takes a moment!
        </Text>

        <View style={styles.benefitsList}>
          {[
            'Unlimited access to AI Coach',
            'Save favorites & playlists',
            'Voice coach & personalized advice',
            'Track your progress & streaks',
          ].map((benefit, index) => (
            <View key={index} style={styles.benefitRow}>
              <View style={[styles.benefitDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/auth')}
          activeOpacity={0.8}
          testID="guest-gate-signup"
        >
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            style={styles.primaryButtonGradient}
          >
            <UserPlus color="#FFFFFF" size={20} />
            <Text style={styles.primaryButtonText}>Create Free Account</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/auth')}
          activeOpacity={0.8}
          testID="guest-gate-signin"
        >
          <LogIn color={colors.textSecondary} size={18} />
          <Text style={styles.secondaryButtonText}>Already have an account? Sign In</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

interface GuestGateModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: string;
}

export function GuestGateModal({ visible, onClose, feature }: GuestGateModalProps) {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const featureText = feature || 'this feature';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <LinearGradient
            colors={[colors.card, colors.background]}
            style={styles.modalGradient}
          >
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X color={colors.textSecondary} size={20} />
            </TouchableOpacity>

            <View style={styles.modalIconWrapper}>
              <Lock color={colors.primary} size={28} />
            </View>

            <Text style={styles.modalTitle}>Sign Up to Continue</Text>
            <Text style={styles.modalSubtitle}>
              Create a free account to {featureText}.
            </Text>

            <TouchableOpacity
              style={styles.modalPrimaryButton}
              onPress={() => {
                onClose();
                router.push('/auth');
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                style={styles.modalPrimaryGradient}
              >
                <UserPlus color="#FFFFFF" size={18} />
                <Text style={styles.modalPrimaryText}>Create Free Account</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalSecondaryButton}
              onPress={() => {
                onClose();
                router.push('/auth');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalSecondaryText}>Sign In Instead</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

export function useGuestGate() {
  const { isGuest } = useAuth();
  const [showModal, setShowModal] = React.useState(false);

  const checkAccess = React.useCallback((feature?: string): boolean => {
    if (isGuest) {
      setShowModal(true);
      return false;
    }
    return true;
  }, [isGuest]);

  const gateModal = React.useMemo(() => (
    <GuestGateModal
      visible={showModal}
      onClose={() => setShowModal(false)}
      feature={undefined}
    />
  ), [showModal]);

  return { isGuest, checkAccess, gateModal, showGateModal: showModal, setShowGateModal: setShowModal };
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconWrapper: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800' as const,
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  benefitsList: {
    width: '100%',
    marginBottom: 32,
    gap: 12,
  },
  benefitRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 12,
  },
  benefitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  benefitText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500' as const,
  },
  primaryButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden' as const,
    marginBottom: 14,
  },
  primaryButtonGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    gap: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700' as const,
  },
  secondaryButton: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '500' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalGradient: {
    padding: 28,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute' as const,
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 1,
  },
  modalIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalPrimaryButton: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden' as const,
    marginBottom: 12,
  },
  modalPrimaryGradient: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    gap: 8,
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  modalSecondaryButton: {
    paddingVertical: 10,
  },
  modalSecondaryText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
