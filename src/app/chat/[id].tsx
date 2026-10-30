import { useLocalSearchParams } from 'expo-router';

import { ChatScreen } from '@/features/messages/ChatScreen';

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ChatScreen id={String(id ?? '')} />;
}
