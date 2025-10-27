import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { X, MessageCircle, Mic, Activity, FileText } from 'lucide-react-native';
import { CREDIT_COSTS, CREDIT_PACKAGES, calculateEstimatedUsage } from '@/constants/credits';

interface CreditsInfoModalProps {
  visible: boolean;
  onClose: () => void;
}

const iconMap = {
  MessageCircle,
  Mic,
  Activity,
  FileText,
} as const;

export function CreditsInfoModal({ visible, onClose }: CreditsInfoModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>AI Credits Guide</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.subtitle}>Credit Costs</Text>
            <Text style={styles.description}>
              AI features require credits to power our advanced speech coaching technology.
              Here&apos;s what each feature costs:
            </Text>

            {CREDIT_COSTS.map((item, index) => {
              const IconComponent = iconMap[item.icon as keyof typeof iconMap];
              return (
                <View key={index} style={styles.featureCard}>
                  <View style={styles.featureHeader}>
                    <View style={styles.iconContainer}>
                      <IconComponent size={20} color="#6366f1" />
                    </View>
                    <View style={styles.featureInfo}>
                      <Text style={styles.featureName}>{item.feature}</Text>
                      <Text style={styles.featureDescription}>{item.description}</Text>
                    </View>
                    <View style={styles.costBadge}>
                      <Text style={styles.costText}>{item.cost}</Text>
                      <Text style={styles.costLabel}>credit{item.cost > 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                  {item.examples && (
                    <View style={styles.examplesContainer}>
                      <Text style={styles.examplesTitle}>Examples:</Text>
                      {item.examples.map((example, idx) => (
                        <Text key={idx} style={styles.exampleItem}>
                          • {example}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}

            <Text style={[styles.subtitle, styles.packagesTitle]}>Credit Packages</Text>
            <Text style={styles.description}>
              Purchase credits to unlock AI-powered coaching features:
            </Text>

            {CREDIT_PACKAGES.map((pkg, index) => (
              <View
                key={index}
                style={[
                  styles.packageCard,
                  pkg.popular && styles.packageCardPopular,
                ]}
              >
                {pkg.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>BEST VALUE</Text>
                  </View>
                )}
                <View style={styles.packageHeader}>
                  <View>
                    <Text style={styles.packageTitle}>{pkg.title}</Text>
                    <Text style={styles.packageDescription}>{pkg.description}</Text>
                  </View>
                  <View style={styles.packageCredits}>
                    <Text style={styles.packageCreditsAmount}>{pkg.credits}</Text>
                    <Text style={styles.packageCreditsLabel}>credits</Text>
                  </View>
                </View>
                <View style={styles.packageFooter}>
                  <Text style={styles.packagePrice}>{pkg.price}</Text>
                  <Text style={styles.packageEstimate}>{pkg.estimated}</Text>
                </View>
              </View>
            ))}

            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>💡 Tips for Managing Credits</Text>
              <Text style={styles.tipText}>
                • New authenticated users receive 10 free credits to get started
              </Text>
              <Text style={styles.tipText}>
                • Guest users need to create an account to use AI features
              </Text>
              <Text style={styles.tipText}>
                • Credits never expire - use them whenever you need coaching
              </Text>
              <Text style={styles.tipText}>
                • Watch free content to learn without using credits
              </Text>
              <Text style={styles.tipText}>
                • Enable voice reading only when needed to save credits
              </Text>
            </View>

            <View style={styles.exampleUsageCard}>
              <Text style={styles.exampleTitle}>Example: 100 Credits Gets You</Text>
              {(() => {
                const usage = calculateEstimatedUsage(100);
                return (
                  <>
                    <View style={styles.usageRow}>
                      <MessageCircle size={16} color="#666" />
                      <Text style={styles.usageText}>
                        Up to {usage.chatMessages} AI chat messages
                      </Text>
                    </View>
                    <View style={styles.usageRow}>
                      <Mic size={16} color="#666" />
                      <Text style={styles.usageText}>
                        Up to {usage.voiceGenerations} voice generations
                      </Text>
                    </View>
                    <View style={styles.usageRow}>
                      <Activity size={16} color="#666" />
                      <Text style={styles.usageText}>
                        Up to {usage.voiceAnalysis} voice analyses
                      </Text>
                    </View>
                    <View style={styles.usageRow}>
                      <FileText size={16} color="#666" />
                      <Text style={styles.usageText}>
                        Up to {usage.transcriptions} transcriptions
                      </Text>
                    </View>
                  </>
                );
              })()}
              <Text style={styles.usageNote}>
                Mix and match features based on your needs!
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const { height } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.9,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  featureCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureInfo: {
    flex: 1,
    marginRight: 12,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  costBadge: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  costText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  costLabel: {
    fontSize: 11,
    color: '#fff',
    opacity: 0.9,
  },
  examplesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  examplesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  exampleItem: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginLeft: 4,
  },
  packagesTitle: {
    marginTop: 32,
  },
  packageCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  packageCardPopular: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  popularText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  packageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 14,
    color: '#666',
  },
  packageCredits: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  packageCreditsAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6366f1',
  },
  packageCreditsLabel: {
    fontSize: 12,
    color: '#666',
  },
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  packageEstimate: {
    fontSize: 13,
    color: '#666',
  },
  tipCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 22,
    marginBottom: 6,
  },
  exampleUsageCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 16,
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  usageText: {
    fontSize: 14,
    color: '#166534',
  },
  usageNote: {
    fontSize: 13,
    color: '#15803d',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
});
