import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { useLive } from '@/data/store';
import { useTheme } from '@/theme/useTheme';
import { ErrorState, Loading } from '@/ui';

/** Anchor route: sends each person to the part of the app they belong in. */
export default function Index() {
  const live = useLive();
  const { c } = useTheme();

  switch (live.status) {
    case 'signed-out':
      return <Redirect href="/sign-in" />;
    case 'no-member':
      return <Redirect href="/join" />;
    case 'admin-only':
      return <Redirect href="/admin" />;
    case 'ready':
      if (!live.approved) return <Redirect href={live.side === 'venue' ? '/v/profile' : '/t/profile'} />;
      return <Redirect href={live.side === 'venue' ? '/v/book' : '/t/shifts'} />;
    case 'error':
      return (
        <View style={{ flex: 1, backgroundColor: c.page, justifyContent: 'center' }}>
          <ErrorState title="Couldn’t load Dyuknow" message={live.error ?? undefined} onRetry={live.reload} />
        </View>
      );
    default:
      return (
        <View style={{ flex: 1, backgroundColor: c.page, paddingTop: 120 }}>
          <Loading />
        </View>
      );
  }
}
