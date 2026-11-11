import { useLocalSearchParams } from 'expo-router';

import { AdminMember, AdminMemberMissing } from '@/features/admin';

export default function AdminMemberRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return <AdminMemberMissing />;
  return <AdminMember key={id} id={id} />;
}
