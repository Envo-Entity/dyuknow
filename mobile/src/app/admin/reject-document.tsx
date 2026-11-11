import { useLocalSearchParams } from 'expo-router';

import { RejectDocument } from '@/features/admin';

export default function RejectDocumentSheet() {
  const { documentId } = useLocalSearchParams<{ documentId: string }>();
  return <RejectDocument key={documentId} documentId={documentId} />;
}
