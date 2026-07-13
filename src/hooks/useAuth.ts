import { useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

// Invoke this for Expo WebBrowser to work properly with deep links for auth
WebBrowser.maybeCompleteAuthSession();

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // アプリが立ち上がった瞬間に、端末（AsyncStorage）に保存されている過去のログイン情報（セッション）があるかを非同期で取得
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      setSession(session);
      setUser(session?.user || null);
      
      // 過去のログイン情報がない場合は、自動で匿名ログインを実行
      if (!session && !error) {
        signInAnonymously();
      } else {
        setIsLoading(false);
      }
    });

    // Listen to Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInAnonymously = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error('Anonymous auth error:', error.message);
    }
    setIsLoading(false);
  };

  const linkGoogleAccount = async () => {
    try {
      const redirectUrl = Linking.createURL('/');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) throw error;
      
      if (data?.url) {
        // Open web browser for OAuth
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        
        if (result.type === 'success') {
          // Authentication success, the session state will update via onAuthStateChange
          console.log('Successfully linked Google account.');
        }
      }
    } catch (error) {
      console.error('Google linking error:', error);
    }
  };

  return {
    session,
    user,
    isLoading,
    linkGoogleAccount
  };
};
