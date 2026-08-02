"use client";

import { useRef, useState } from "react";
import { CheckIcon, PlusIcon } from "@/components/icons";
import { cn } from "@/lib/cn";

interface AddCustomChipProps {
  onAdd: (value: string) => void;
  placeholder?: string;
}

export function AddCustomChip({ onAdd, placeholder = "Add your own" }: AddCustomChipProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function open() {
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function commit() {
    const trimmed = value.trim();
    if (trimmed) onAdd(trimmed);
    setValue("");
    setEditing(false);
  }

  function cancel() {
    setValue("");
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={open}
        aria-label="Add a custom value"
        className="flex h-[38px] w-[38px] flex-none cursor-pointer items-center justify-center rounded-full border border-dashed border-hairline text-ink transition-colors hover:border-ink lg:h-[42px] lg:w-[42px]"
      >
        <PlusIcon size={14} />
      </button>
    );
  }

  return (
    <div className="flex h-[38px] w-[190px] flex-none items-center gap-1.5 rounded-full border border-ink bg-paper py-1 pl-4 pr-1 transition-[width] duration-200 ease-out lg:h-[42px] lg:w-[210px]">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        onBlur={commit}
        placeholder={placeholder}
        className={cn(
          "w-full min-w-0 bg-transparent text-[12.5px] font-semibold text-ink placeholder:font-normal placeholder:text-faint focus:outline-none lg:text-[13.5px]"
        )}
      />
      <button
        type="button"
        aria-label="Save custom value"
        onMouseDown={(e) => e.preventDefault()}
        onClick={commit}
        className="flex h-[26px] w-[26px] flex-none cursor-pointer items-center justify-center rounded-full bg-sage text-ink transition-opacity hover:opacity-80 lg:h-[30px] lg:w-[30px]"
      >
        <CheckIcon size={11} />
      </button>
    </div>
  );
}
