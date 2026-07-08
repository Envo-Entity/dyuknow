"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@/components/icons";
import { IconButton } from "./IconButton";

export function BackButton({ fallback }: { fallback?: string }) {
  const router = useRouter();
  return (
    <IconButton
      title="Back"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback ?? "/");
      }}
    >
      <ArrowLeftIcon />
    </IconButton>
  );
}
