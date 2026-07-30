import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/cn";

interface StepHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  center?: boolean;
}

export function StepHeader({ eyebrow, title, description, center }: StepHeaderProps) {
  return (
    <div className={center ? "text-center" : undefined}>
      <Eyebrow className={center ? "justify-center" : undefined}>{eyebrow}</Eyebrow>
      <div className="mt-2 font-serif text-[30px] leading-[1.08] tracking-[-0.01em] lg:text-[40px]">{title}</div>
      {description && (
        <p
          className={cn(
            "mt-2.5 text-[14px] leading-[1.55] text-muted lg:text-[16px] lg:leading-[1.6]",
            center && "mx-auto max-w-[340px] lg:max-w-[420px]"
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
