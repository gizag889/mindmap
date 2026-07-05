import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useBilling } from '../hooks/useBilling';
import { useAuth } from '../hooks/useAuth';
import { PurchasesPackage } from 'react-native-purchases';

interface Props {
  visible: boolean;
  reason?: 'insufficient_credits' | 'add_credits';
  onClose: () => void;
}

export const PaywallModal = ({ visible, reason = 'insufficient_credits', onClose }: Props) => {
  const { packages, purchasePackage, isReady } = useBilling();
  const { user, session, linkGoogleAccount } = useAuth();
  
  const isAnonymous = user?.is_anonymous;

  const handlePurchase = async (pack: PurchasesPackage) => {
    const result = await purchasePackage(pack);
    if (result.success) {
      // Notify backend to immediately give credits or Pro status
      try {
        // Find worker url for local test
        const hostIp = '10.0.2.2'; // Simplified fallback for Android/iOS local dev
        const url = `http://${hostIp}:8787/api/verify-purchase`;
        
        await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            entitlement: pack.identifier === 'pro_monthly' ? 'pro_monthly' : null,
            creditsToAdd: pack.identifier.includes('credit') ? 100 : null, // Dummy logic based on id
          }),
        });
      } catch (e) {
        console.error('Verify purchase error', e);
      }
      onClose();
    }
  };

  const title = reason === 'insufficient_credits' ? 'クレジットが不足しています' : 'プラン・クレジットの追加';
  const subtitle = reason === 'insufficient_credits' 
    ? 'AI機能を継続して利用するにはクレジットを追加してください。'
    : 'より多くのAI機能を利用するために、プランをアップグレードするかクレジットを追加してください。';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          
          {isAnonymous && (
            <View style={styles.linkAccountContainer}>
              <Text style={styles.linkAccountText}>
                ⚠️ 匿名アカウントのままです。購入したクレジットを安全に引き継ぐために、アカウント連携を強くおすすめします。
              </Text>
              <TouchableOpacity style={styles.linkButton} onPress={linkGoogleAccount}>
                <Text style={styles.linkButtonText}>Googleアカウントと連携する</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isReady ? (
             <ActivityIndicator size="large" color="#2563eb" style={{ marginVertical: 20 }} />
          ) : packages.length === 0 ? (
            <Text style={styles.emptyText}>現在利用可能なプランがありません</Text>
          ) : (
            packages.map((pkg) => (
              <TouchableOpacity key={pkg.identifier} style={styles.packageButton} onPress={() => handlePurchase(pkg)}>
                <Text style={styles.packageTitle}>{pkg.product.title}</Text>
                <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
              </TouchableOpacity>
            ))
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  linkAccountContainer: {
    backgroundColor: '#451a03',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    width: '100%',
  },
  linkAccountText: {
    color: '#fde047',
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  linkButton: {
    backgroundColor: '#eab308',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#1e293b',
    fontWeight: 'bold',
    fontSize: 14,
  },
  packageButton: {
    backgroundColor: '#2563eb',
    width: '100%',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  packageTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  packagePrice: {
    color: '#fff',
    fontSize: 16,
  },
  emptyText: {
    color: '#94a3b8',
    marginVertical: 20,
  },
  closeButton: {
    marginTop: 12,
    padding: 12,
  },
  closeButtonText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
