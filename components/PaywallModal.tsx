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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Sparkles, Zap, Check, RefreshCw, Shield, Youtube } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { IAP_PRODUCTS, IAPProductId } from '@/constants/iap';
import { useIAP } from '@/hooks/iap-context';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

const PRICE_MAP: Record<string, string> = {
  'com.tyrotech.motivationhub.credits.100': '$4.99',
  'com.tyrotech.motivationhub.credits.500': '$19.99',
  'com.tyrotech.motivationhub.credits.1000': '$34.99',
  'com.tyrotech.motivationhub.premium.monthly': '$4.99/month',
};

export default function PaywallModal({ visible, onClose }: PaywallModalProps) {
  const { entitlements, isPurchasing, isRestoring, purchase, restorePurchases } = useIAP();

  const handlePurchase = async (productId: IAPProductId) => {
    await purchase(productId);
  };

  const handleRestore = async () => {
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
          <Text style={styles.headerTitle}>Upgrade Your Experience</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X color={Colors.text} size={24} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.currentBalanceCard}>
            <Sparkles color={Colors.primary} size={24} />
            <Text style={styles.currentBalanceLabel}>Current Balance</Text>
            <Text style={styles.currentBalanceValue}>{entitlements.credits} Credits</Text>
            {entitlements.isPremium && (
              <View style={styles.premiumBadge}>
                <Shield color={Colors.accent} size={16} />
                <Text style={styles.premiumBadgeText}>Premium Active</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Buy Credits</Text>
            <Text style={styles.sectionSubtitle}>
              Use credits for AI chat, text-to-speech, and more
            </Text>

            {creditProducts.map((product) => (
              <TouchableOpacity
                key={product.productId}
                style={[
                  styles.productCard,
                  product.popular && styles.productCardPopular,
                ]}
                onPress={() => handlePurchase(product.productId)}
                disabled={isPurchasing}
              >
                {product.badge && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>{product.badge}</Text>
                  </View>
                )}
                <View style={styles.productHeader}>
                  <Zap color={Colors.primary} size={24} />
                  <View style={styles.productInfo}>
                    <Text style={styles.productTitle}>{product.title}</Text>
                    <Text style={styles.productDescription}>{product.description}</Text>
                  </View>
                  <Text style={styles.productPrice}>{PRICE_MAP[product.productId]}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Go Ad-Free</Text>
            <Text style={styles.sectionSubtitle}>
              Remove all ads - AI features still require credits
            </Text>

            {premiumProducts.map((product) => (
              <TouchableOpacity
                key={product.productId}
                style={[
                  styles.premiumCard,
                  product.popular && styles.productCardPopular,
                ]}
                onPress={() => handlePurchase(product.productId)}
                disabled={isPurchasing}
              >
                {product.badge && (
                  <View style={styles.adFreeBadge}>
                    <Text style={styles.popularBadgeText}>{product.badge}</Text>
                  </View>
                )}
                <View style={styles.premiumHeader}>
                  <Shield color={Colors.accent} size={32} />
                  <View style={styles.premiumMainInfo}>
                    <Text style={styles.premiumTitle}>{product.title}</Text>
                    <Text style={styles.premiumPrice}>{PRICE_MAP[product.productId]}</Text>
                  </View>
                </View>
                <Text style={styles.adFreeDescription}>{product.description}</Text>
                <View style={styles.featureList}>
                  <View style={styles.featureItem}>
                    <Check color={Colors.accent} size={18} />
                    <Text style={styles.featureText}>No Banner Ads</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Check color={Colors.accent} size={18} />
                    <Text style={styles.featureText}>No Interstitial Ads</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Check color={Colors.accent} size={18} />
                    <Text style={styles.featureText}>Uninterrupted Experience</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Check color={Colors.accent} size={18} />
                    <Text style={styles.featureText}>Support Development</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <X color={Colors.textSecondary} size={18} />
                    <Text style={[styles.featureText, { color: Colors.textSecondary }]}>Does NOT unlock unlimited AI credits</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.subscribeButton}
                  onPress={() => handlePurchase(product.productId)}
                  disabled={isPurchasing}
                >
                  <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.youtubeDisclaimer}>
            <Youtube color={Colors.textSecondary} size={20} />
            <Text style={styles.youtubeDisclaimerText}>
              YouTube videos are provided by YouTube and remain free. Purchases (credits and ad-free) do not unlock or alter YouTube content. Credits are used for AI features only.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={isRestoring || isPurchasing}
          >
            {isRestoring ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <RefreshCw color={Colors.primary} size={18} />
                <Text style={styles.restoreButtonText}>Restore Purchases</Text>
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
  currentBalanceCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  currentBalanceLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  currentBalanceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 4,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.accent + '20',
    borderRadius: 12,
  },
  premiumBadgeText: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  productCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  productCardPopular: {
    borderColor: Colors.primary,
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: {
    color: Colors.background,
    fontSize: 11,
    fontWeight: 'bold',
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  productDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  premiumCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: Colors.accent,
    position: 'relative',
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
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
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
    fontSize: 18,
    fontWeight: '600',
    color: Colors.accent,
  },
  adFreeDescription: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 22,
  },
  featureList: {
    gap: 12,
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 15,
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
  subscribeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.background,
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
