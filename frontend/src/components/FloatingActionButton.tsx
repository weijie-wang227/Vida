import type { ButtonHTMLAttributes, ReactNode } from "react";

type FloatingActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export function FloatingActionButton({
  children,
  className = "",
  style,
  type = "button",
  ...props
}: FloatingActionButtonProps) {
  return (
    <button
      type={type}
      className={`absolute bottom-20 right-5 z-20 flex h-12 w-12 items-center justify-center rounded-full shadow-2xl transition-transform active:scale-95 ${className}`}
      style={{
        background:
          "linear-gradient(135deg, var(--brand-green), var(--brand-yellow))",
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
