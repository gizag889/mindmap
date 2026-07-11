import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { useAuth } from './useAuth';

const API_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_RC_APPLE_API_KEY || '',
  android: process.env.EXPO_PUBLIC_RC_GOOGLE_API_KEY || '',
});

export const useBilling = () => {
  const { user } = useAuth();
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!API_KEY) {
        console.warn('RevenueCat API key is missing');
        setIsReady(true);
        return;
      }

      try {
        const configured = await Purchases.isConfigured();
        
        if (!configured) {
          if (user?.id) {
            Purchases.configure({ apiKey: API_KEY, appUserID: user.id });
          } else {
            Purchases.configure({ apiKey: API_KEY });
          }
        } else if (user?.id) {
          // If already configured and we have a user ID, ensure it matches
          const currentAppUserID = await Purchases.getAppUserID();
          if (currentAppUserID !== user.id) {
            await Purchases.logIn(user.id);
          }
        }

        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);

        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length !== 0) {
          setPackages(offerings.current.availablePackages);
        }
      } catch (e) {
        console.error('Error fetching RevenueCat data', e);
      } finally {
        setIsReady(true);
      }
    };

    init();
  }, [user?.id]);

  const purchasePackage = async (pack: PurchasesPackage) => {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pack);
      setCustomerInfo(customerInfo);
      return { success: true, customerInfo };
    } catch (e: any) {
      if (!e.userCancelled) {
        console.error('Error purchasing package', e);
      }
      return { success: false, error: e };
    }
  };

  return { customerInfo, packages, purchasePackage, isReady };
};
