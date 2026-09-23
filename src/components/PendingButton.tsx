"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";

// Renders its children unless the enclosing form action is pending, in which
// case it swaps to `pendingLabel` so the user gets an immediate visual cue
// on click. Meant for server-action forms where the submit does network work.
export function PendingButton({
  children,
  pendingLabel,
  className,
  ...rest
}: {
  children: ReactNode;
  pendingLabel: ReactNode;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type">) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={className}
      {...rest}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
