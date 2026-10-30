// The one Supabase client, for the website's backend, unchanged. The
// publishable key only: row-level security decides what each member sees.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local');
}

export const supabase = createClient(url, key, {
  auth: {
    // Web (static render) has no window during export; AsyncStorage handles it on device.
    ...(Platform.OS !== 'web' || typeof window !== 'undefined' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});

// Refresh the session only while the app is in the foreground (Supabase's
// React Native guidance): timers don't run reliably in the background.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export const PHOTO_BUCKET = 'member-photos';
export const DOCUMENT_BUCKET = 'member-documents';

/** Public URL of a member photo path, or "" for none. */
export function photoUrl(path: string | null | undefined) {
  return path ? supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl : '';
}
