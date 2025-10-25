import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, RefreshCw, Shield, Youtube, LogIn } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { IAP_PRODUCTS, IAPProductId } from '@/constants/iap';
import { useIAP } from '@/hooks/iap-context';
import { useAuth } from '@/hooks/auth-context';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

const PRICE_MAP: Record<string, string> = {
  'com.tyrotech.motivationhub.premium.monthly': '$4.99/month',
};

export default function PaywallModal({ visible, onClose }: PaywallModalProps) {
  const { entitlements, isPurchasing, isRestoring, purchase, restorePurchases } = useIAP();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const handlePurchase = async (productId: IAPProductId) => {
    if (!isAuthenticated) {
      Alert.alert(
        'Account Required',
        'Please sign in or create an account to upgrade to Premium.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In',
            onPress: () => {
              onClose();
              router.push('/auth');
            },
          },
        ]
      );
      return;
    }

    await purchase(productId);
  };

  const handleRestore = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Account Required',
        'Please sign in to restore your purchases.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign In',
            onPress: () => {
              onClose();
              router.push('/auth');
            },
          },
        ]
      );
      return;
    }

    await restorePurchases();
  };

  const openTerms = () => {
    Linking.openURL('https://rork.com/terms');
  };

  const openPrivacy = () => {
    Linking.openURL('https://rork.com/privacy');
  };

  const premiumProduct = IAP_PRODUCTS[0];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={[Colors.background, '#1A1A2E', '#0F0F1E']}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Go Premium</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X color={Colors.text} size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {!isAuthenticated && (
            <View style={styles.authNoticeCard}>
              <LogIn color={Colors.primary} size={24} />
              <Text style={styles.authNoticeTitle}>Account Required</Text>
              <Text style={styles.authNoticeText}>
                Sign in or create an account to upgrade to Premium
              </Text>
              <TouchableOpacity
                style={styles.signInButton}
                onPress={() => {
                  onClose();
                  router.push('/auth');
                }}
              >
                <Text style={styles.signInButtonText}>Sign In / Sign Up</Text>
              </TouchableOpacity>
            </View>
          )}

          {entitlements.isPremium && (
            <View style={styles.currentStatusCard}>
              <Shield color={Colors.accent} size={32} />
              <Text style={styles.currentStatusTitle}>Premium Active</Text>
              <Text style={styles.currentStatusSubtitle}>
                Enjoy your ad-free experience!
              </Text>
            </View>
          )}

          {!entitlements.isPremium && (
            <>
              <View style={styles.heroSection}>
                <Shield color={Colors.accent} size={64} />
                <Text style={styles.heroTitle}>Remove All Ads</Text>
                <Text style={styles.heroSubtitle}>
                  Experience uninterrupted motivation
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.premiumCard,
                  !isAuthenticated && styles.premiumCardDisabled,
                ]}
                onPress={() => handlePurchase(premiumProduct.productId)}
                disabled={isPurchasing || !isAuthenticated}
              >
                <View style={styles.adFreeBadge}>
                  <Text style={styles.popularBadgeText}>{premiumProduct.badge}</Text>
                </View>
                
                <View style={styles.premiumHeader}>
                  <Shield color={Colors.accent} size={40} />
                  <View style={styles.premiumMainInfo}>
                    <Text style={styles.premiumTitle}>{premiumProduct.title}</Text>
                    <Text style={styles.premiumPrice}>
                      {PRICE_MAP[premiumProduct.productId]}
                    </Text>
                  </View>
                </View>

                <Text style={styles.adFreeDescription}>
                  {premiumProduct.description}
                </Text>

                <View style={styles.featureList}>
                  <View style={styles.featureItem}>
                    <Check color={Colors.accent} size={20} />
                    <Text style={styles.featureText}>No Banner Ads</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Check color={Colors.accent} size={20} />
                    <Text style={styles.featureText}>No Interstitial Ads</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Check color={Colors.accent} size={20} />
                    <Text style={styles.featureText}>Uninterrupted Experience</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Check color={Colors.accent} size={20} />
                    <Text style={styles.featureText}>Support Development</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.subscribeButton,
                    !isAuthenticated && styles.subscribeButtonDisabled,
                  ]}
                  onPress={() => handlePurchase(premiumProduct.productId)}
                  disabled={isPurchasing || !isAuthenticated}
                >
                  <Text style={styles.subscribeButtonText}>
                    {isAuthenticated ? 'Subscribe Now' : 'Sign In to Subscribe'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>

              <View style={styles.disclaimerCard}>
                <Text style={styles.disclaimerTitle}>What&apos;s Included</Text>
                <Text style={styles.disclaimerText}>
                  • Premium removes all ads from the app{'\n'}
                  • All content remains freely accessible{'\n'}
                  • YouTube videos remain unchanged
                </Text>
              </View>
            </>
          )}

          <View style={styles.youtubeDisclaimer}>
            <Youtube color={Colors.textSecondary} size={20} />
            <Text style={styles.youtubeDisclaimerText}>
              YouTube videos are provided by YouTube and remain free. Premium subscription only removes ads from the app experience and does not unlock or alter YouTube content.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={isRestoring || isPurchasing || !isAuthenticated}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <RefreshCw color={isAuthenticated ? Colors.primary : Colors.textSecondary} size={18} />
                <Text style={[
                  styles.restoreButtonText,
                  !isAuthenticated && styles.restoreButtonTextDisabled,
                ]}>
                  Restore Purchases
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <TouchableOpacity onPress={openTerms}>
              <Text style={styles.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.footerSeparator}>•</Text>
            <TouchableOpacity onPress={openPrivacy}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {isPurchasing && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Processing purchase...</Text>
            </View>
          </View>
        )}
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  authNoticeCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  authNoticeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  authNoticeText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  signInButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  currentStatusCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.accent,
  },
  currentStatusTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 12,
  },
  currentStatusSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  premiumCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.accent,
    position: 'relative',
  },
  premiumCardDisabled: {
    opacity: 0.6,
  },
  adFreeBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: Colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  popularBadgeText: {
    color: Colors.background,
    fontSize: 11,
    fontWeight: 'bold',
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  premiumMainInfo: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  premiumPrice: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.accent,
  },
  adFreeDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  featureList: {
    gap: 14,
    marginBottom: 28,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  subscribeButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  subscribeButtonDisabled: {
    backgroundColor: Colors.textSecondary,
    shadowOpacity: 0,
  },
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.background,
  },
  disclaimerCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  youtubeDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(255,59,48,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.2)',
  },
  youtubeDisclaimerText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    marginBottom: 20,
  },
  restoreButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  restoreButtonTextDisabled: {
    color: Colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 20,
  },
  footerLink: {
    fontSize: 12,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },
  footerSeparator: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
});
