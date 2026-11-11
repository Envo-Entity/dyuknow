import { NativeTabs } from 'expo-router/native-tabs';
import { DynamicColorIOS, Platform } from 'react-native';

import { useLive } from '@/data/store';
import { palettes } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import { icons, type IconName } from '@/ui/icons';

type Tab = { name: string; label: string; icon: IconName; badge?: string | null; prominent?: boolean };

const ink = Platform.OS === 'ios' ? DynamicColorIOS({ light: palettes.light.ink, dark: palettes.dark.ink }) : undefined;

function countLabel(n: number) {
  return n > 9 ? '9+' : String(n);
}

/** Native tab bar: Liquid Glass on iOS, Material on Android. */
function SideTabs({ tabs }: { tabs: Tab[] }) {
  const { c } = useTheme();
  return (
    <NativeTabs
      tintColor={ink ?? c.ink}
      labelStyle={{ selected: { color: ink ?? c.ink } }}
      backgroundColor={Platform.OS === 'android' ? c.card : undefined}
      indicatorColor={Platform.OS === 'android' ? c.neutralBg : undefined}
      // Every tab badge means "waiting on you", so it is ink, like a lit ticket.
      badgeBackgroundColor={ink ?? c.ink}
      badgeTextColor={c.onInk}
      minimizeBehavior="onScrollDown">
      {tabs.map((tab) => {
        const icon = icons[tab.icon];
        return (
          <NativeTabs.Trigger key={tab.name} name={tab.name} prominent={tab.prominent}>
            <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf={{ default: icon.ios, selected: icon.iosSelected }} md={icon.android} />
            {tab.badge != null ? <NativeTabs.Trigger.Badge>{tab.badge}</NativeTabs.Trigger.Badge> : null}
          </NativeTabs.Trigger>
        );
      })}
    </NativeTabs>
  );
}

function useCommonBadges() {
  const { badges } = useLive();
  return {
    needsYou: badges.needsYou > 0 ? countLabel(badges.needsYou) : null,
    // An empty badge is a plain dot.
    messages: badges.unreadConversationIds.length > 0 ? '' : null,
    profile: badges.accountAttention ? '' : null,
  };
}

export function TalentTabs() {
  const b = useCommonBadges();
  return (
    <SideTabs
      tabs={[
        { name: 'shifts', label: 'Shifts', icon: 'shifts', badge: b.needsYou },
        { name: 'availability', label: 'Availability', icon: 'availability' },
        { name: 'messages', label: 'Messages', icon: 'messages', badge: b.messages },
        { name: 'profile', label: 'Profile', icon: 'profile', badge: b.profile },
      ]}
    />
  );
}

export function VenueTabs() {
  const b = useCommonBadges();
  return (
    <SideTabs
      tabs={[
        { name: 'book', label: 'Book', icon: 'book' },
        { name: 'bookings', label: 'Bookings', icon: 'bookings', badge: b.needsYou },
        { name: 'post', label: 'Post a job', icon: 'post', prominent: true },
        { name: 'messages', label: 'Messages', icon: 'messages', badge: b.messages },
        { name: 'profile', label: 'Profile', icon: 'profile', badge: b.profile },
      ]}
    />
  );
}
