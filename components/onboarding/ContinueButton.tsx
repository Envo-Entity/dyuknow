interface ContinueButtonProps {
  onClick: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function ContinueButton({ onClick, disabled, children = "Continue" }: ContinueButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-full cursor-pointer rounded-full border-none bg-ink px-5 py-3.5 text-sm font-semibold text-white disabled:opacity-30 lg:py-4 lg:text-[15px]"
    >
      {children}
    </button>
  );
}
