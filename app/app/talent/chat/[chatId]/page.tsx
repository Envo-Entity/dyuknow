"use client";

import { useParams } from "next/navigation";
import { ChatView } from "@/components/chat/ChatView";

export default function TalentChatPage() {
  const params = useParams<{ chatId: string }>();
  return <ChatView side="talent" chatId={params.chatId} />;
}
