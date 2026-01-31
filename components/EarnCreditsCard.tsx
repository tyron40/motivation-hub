import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useIAP } from '@/hooks/iap-context';
import { Tv, Gift, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAdMob } from '@/hooks/admob-context';

export function EarnCreditsCard() {
  const { showRewardedAd, rewardAmount, isShowingAd, canShowAds } = useAdMob();
  const { usageStats } = useIAP();
  const { colors } = useTheme();

  const handleWatchAd = async () => {
    await showRewardedAd();
  };

  if (!canShowAds) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <View style={styles.premiumBadge}>
          <Sparkles size={16} color="#FFD700" />
          <Text style={[styles.premiumText, { color: colors.text }]}>Premium - Ad Free</Text>
        </View>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Enjoy unlimited access without ads!
        </Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[colors.primary + '20', colors.card]}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Tv size={24} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Earn Free Credits</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Watch ads to unlock AI features
          </Text>
        </View>
      </View>

      <View style={styles.rewardInfo}>
        <Gift size={20} color={colors.primary} />
        <Text style={[styles.rewardText, { color: colors.text }]}>
          Earn {rewardAmount} credits per ad
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: colors.primary },
          isShowingAd && styles.buttonDisabled,
        ]}
        onPress={handleWatchAd}
        disabled={isShowingAd}
      >
        {isShowingAd ? (
          <>
            <ActivityIndicator color={colors.text} />
            <Text style={[styles.buttonText, { color: colors.text }]}>Loading Ad...</Text>
          </>
        ) : (
          <>
            <Tv size={20} color={colors.text} />
            <Text style={[styles.buttonText, { color: colors.text }]}>Watch Ad</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={[styles.currentCredits, { color: colors.textSecondary }]}>
        Current Balance: {usageStats.credits} credits
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 12,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  subtitle: {
    fontSize: 14,
  },
  rewardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 8,
  },
  rewardText: {
    fontSize: 15,
    fontWeight: '600' as const,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  currentCredits: {
    fontSize: 13,
    textAlign: 'center' as const,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  premiumText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  description: {
    fontSize: 14,
    textAlign: 'center' as const,
  },
});
