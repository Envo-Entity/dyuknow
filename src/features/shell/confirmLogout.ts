import { Alert } from 'react-native';

/** Logging out is one tap from Profile and Account, so it asks first, as iOS settings do. */
export function confirmLogout(logout: () => Promise<void>) {
  Alert.alert('Log out?', 'You’ll need your email and password to sign back in.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Log out', style: 'destructive', onPress: () => void logout() },
  ]);
}
