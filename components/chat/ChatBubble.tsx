import { cn } from "@/lib/cn";

export function ChatBubble({ text, mine }: { text: string; mine: boolean }) {
  return (
    <div
      className={cn(
        "max-w-[80%] rounded-[22px] px-4 py-3 text-[14.5px] leading-[1.45]",
        mine ? "self-end rounded-br-[7px] bg-ink text-white" : "self-start rounded-bl-[7px] bg-mist text-ink"
      )}
    >
      {text}
    </div>
  );
}
