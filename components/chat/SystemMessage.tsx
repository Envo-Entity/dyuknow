import Link from "next/link";

export function SystemMessage({ text, href }: { text: string; href: string }) {
  return (
    <div className="my-1 flex max-w-full items-center gap-2 self-center rounded-full bg-mist px-4 py-2.5 text-xs font-semibold">
      <span className="h-2 w-2 flex-none rounded-full bg-sage" />
      <span className="overflow-hidden text-ellipsis whitespace-nowrap">{text}</span>
      <Link href={href} className="flex-none underline">
        View
      </Link>
    </div>
  );
}
