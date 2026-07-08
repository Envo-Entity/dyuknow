"use client";

import { useParams } from "next/navigation";
import { ChatView } from "@/components/chat/ChatView";

export default function VenueChatPage() {
  const params = useParams<{ chatId: string }>();
  return <ChatView side="venue" chatId={params.chatId} />;
}
