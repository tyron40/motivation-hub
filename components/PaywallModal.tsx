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
import { X, Check, RefreshCw, Shield, Youtube, LogIn, Zap, Sparkles, Smartphone } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { IAP_PRODUCTS, IAPProductId } from '@/constants/iap';
import { useIAP } from '@/hooks/iap-context';
import { useAuth } from '@/hooks/auth-context';

const isWeb = Platform.OS === 'web' || (typeof window !== 'undefined' && !('ReactNativeWebView' in window));

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

const PRICE_MAP: Record<string, string> = {
  'com.tyrotech.motivationhub.credits.100': '$4.99',
  'com.tyrotech.motivationhub.credits.500': '$19.99',
  'com.tyrotech.motivationhub.credits.1000': '$34.99',
  'com.tyrotech.motivationhub.premium.monthly': '$9.99/month',
  'com.tyrotech.motivationhub.premium.annual': '$99.99/year',
};

export default function PaywallModal({ visible, onClose }: PaywallModalProps) {
  const { entitlements, usageStats, isPurchasing, isRestoring, purchase, restorePurchases } = useIAP();
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

  const creditProducts = IAP_PRODUCTS.filter(p => !p.isPremium);
  const premiumProducts = IAP_PRODUCTS.filter(p => p.isPremium);

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
          <Text style={styles.headerTitle}>Upgrade</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X color={Colors.text} size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {isWeb && (
            <View style={styles.webNoticeCard}>
              <Smartphone color={Colors.primary} size={24} />
              <Text style={styles.webNoticeTitle}>Mobile App Required</Text>
              <Text style={styles.webNoticeText}>
                In-app purchases are only available on iOS and Android devices. Please download the mobile app to upgrade to Premium.
              </Text>
            </View>
          )}

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

          <View style={styles.currentStatusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Zap color={Colors.primary} size={24} />
                <Text style={styles.statusLabel}>AI Credits</Text>
                <Text style={styles.statusValue}>{usageStats.credits}</Text>
              </View>
              {entitlements.isPremium && (
                <View style={styles.statusItem}>
                  <Shield color={Colors.accent} size={24} />
                  <Text style={styles.statusLabel}>Status</Text>
                  <Text style={styles.statusValue}>Premium</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Sparkles color={Colors.primary} size={24} />
              <Text style={styles.sectionTitle}>AI Credits</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Use credits for AI chat and voice interactions
            </Text>
            
            {creditProducts.map((product) => (
              <TouchableOpacity
                key={product.productId}
                style={[
                  styles.productCard,
                  product.popular && styles.productCardPopular,
                  (!isAuthenticated || isWeb) && styles.productCardDisabled,
                ]}
                onPress={() => handlePurchase(product.productId)}
                disabled={isPurchasing || !isAuthenticated || isWeb}
              >
                {product.badge && (
                  <View style={styles.productBadge}>
                    <Text style={styles.productBadgeText}>{product.badge}</Text>
                  </View>
                )}
                
                <View style={styles.productHeader}>
                  <Zap color={Colors.primary} size={32} />
                  <View style={styles.productInfo}>
                    <Text style={styles.productTitle}>{product.title}</Text>
                    <Text style={styles.productPrice}>
                      {product.price || PRICE_MAP[product.productId]}
                    </Text>
                  </View>
                </View>
                <Text style={styles.productDescription}>{product.description}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Shield color={Colors.accent} size={24} />
              <Text style={styles.sectionTitle}>Premium - Ad Free</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Remove all ads for a seamless experience
            </Text>
            
            {premiumProducts.map((product) => (
              <TouchableOpacity
                key={product.productId}
                style={[
                  styles.productCard,
                  styles.premiumCard,
                  (!isAuthenticated || isWeb) && styles.productCardDisabled,
                  entitlements.isPremium && styles.productCardActive,
                ]}
                onPress={() => handlePurchase(product.productId)}
                disabled={isPurchasing || !isAuthenticated || entitlements.isPremium || isWeb}
              >
                {product.badge && (
                  <View style={styles.premiumBadge}>
                    <Text style={styles.productBadgeText}>{product.badge}</Text>
                  </View>
                )}
                
                <View style={styles.productHeader}>
                  <Shield color={Colors.accent} size={32} />
                  <View style={styles.productInfo}>
                    <Text style={styles.productTitle}>{product.title}</Text>
                    <Text style={styles.premiumPrice}>
                      {product.price || PRICE_MAP[product.productId]}
                    </Text>
                  </View>
                </View>
                <Text style={styles.productDescription}>{product.description}</Text>
                
                {entitlements.isPremium && (
                  <View style={styles.activeIndicator}>
                    <Check color={Colors.accent} size={16} />
                    <Text style={styles.activeText}>Active</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.disclaimerCard}>
            <Text style={styles.disclaimerTitle}>How It Works</Text>
            <Text style={styles.disclaimerText}>
              • Credits are used for AI chat and voice interactions{'\n'}
              • Premium removes all ads from the app{'\n'}
              • All content remains freely accessible{'\n'}
              • YouTube videos remain unchanged
            </Text>
          </View>

          <View style={styles.youtubeDisclaimer}>
            <Youtube color={Colors.textSecondary} size={20} />
            <Text style={styles.youtubeDisclaimerText}>
              YouTube videos are provided by YouTube and remain free. Premium subscription only removes ads from the app experience and does not unlock or alter YouTube content.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={isRestoring || isPurchasing || !isAuthenticated || isWeb}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <RefreshCw color={(isAuthenticated && !isWeb) ? Colors.primary : Colors.textSecondary} size={18} />
                <Text style={[
                  styles.restoreButtonText,
                  (!isAuthenticated || isWeb) && styles.restoreButtonTextDisabled,
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
  webNoticeCard: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  webNoticeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  webNoticeText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
    gap: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  statusValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  productCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  productCardPopular: {
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
  },
  productCardDisabled: {
    opacity: 0.6,
  },
  productCardActive: {
    borderColor: Colors.accent,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  premiumCard: {
    borderWidth: 2,
    borderColor: Colors.accent,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  productBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  premiumBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: Colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  productBadgeText: {
    color: Colors.background,
    fontSize: 10,
    fontWeight: 'bold',
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  premiumPrice: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.accent,
  },
  productDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  activeText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
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
