"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={cx("font-script leading-none select-none", className)}>
      Score<span className="text-pink">26</span>
    </span>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "sage";
const variants: Record<BtnVariant, string> = {
  primary: "bg-pink text-white hover:bg-pink/90 active:bg-pink-dark",
  secondary: "bg-surface-2 text-white border border-line hover:border-muted active:bg-line",
  ghost: "bg-transparent text-white/80 hover:bg-surface-2",
  danger: "bg-live/15 text-live border border-live/40 active:bg-live/30",
  sage: "bg-sage-dark text-white active:bg-sage",
};

export function Button({
  children, onClick, variant = "secondary", className = "", disabled, href, type = "button", size = "md",
}: {
  children: ReactNode; onClick?: () => void; variant?: BtnVariant; className?: string; disabled?: boolean;
  href?: string; type?: "button" | "submit"; size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "px-3 py-2 text-sm rounded-lg", md: "px-5 py-3 text-base rounded-xl", lg: "px-6 py-4 text-xl rounded-2xl" };
  const cls = cx(
    "inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none",
    sizes[size], variants[variant], className,
  );
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type={type} onClick={onClick} disabled={disabled} className={cls}>{children}</button>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-2xl border border-line bg-surface/90 p-4 sm:p-5", className)}>{children}</div>;
}

export function PageHeader({ title, back, right }: { title: ReactNode; back?: string | true; right?: ReactNode }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-20 -mx-4 mb-4 flex items-center gap-3 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      {back && (
        <button
          onClick={() => (back === true ? router.back() : router.push(back))}
          className="grid h-11 w-11 place-items-center rounded-xl bg-surface-2 text-2xl"
          aria-label="Zurück"
        >
          ‹
        </button>
      )}
      <h1 className="flex-1 truncate font-display text-2xl font-semibold tracking-wide uppercase">{title}</h1>
      {right}
    </header>
  );
}

export function Page({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <main className={cx("mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6", className)}>{children}</main>;
}

export function Segmented<T extends string | number>({
  value, options, onChange, className = "", size = "md",
}: {
  value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; className?: string; size?: "md" | "lg";
}) {
  return (
    <div className={cx("inline-flex flex-wrap rounded-xl bg-surface-2 p-1 border border-line", className)}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={cx(
            "whitespace-nowrap rounded-lg font-semibold transition-colors",
            size === "lg" ? "px-5 py-3 text-lg" : "px-3.5 py-2 text-sm",
            o.value === value ? "bg-pink text-white" : "text-white/70 hover:text-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, onChange, min = 0, max = 99, step = 1, label }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label?: string;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <button className="h-10 w-10 rounded-lg bg-surface-2 border border-line text-xl" onClick={() => onChange(Math.max(min, value - step))}>−</button>
      <span className="min-w-12 text-center font-display text-xl tabular">{value}{label ? <span className="ml-1 text-sm text-muted">{label}</span> : null}</span>
      <button className="h-10 w-10 rounded-lg bg-surface-2 border border-line text-xl" onClick={() => onChange(Math.min(max, value + step))}>+</button>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-lg text-white placeholder:text-white/30 outline-none focus:border-pink";

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose?: () => void; title?: ReactNode; children: ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className={cx("animate-pop max-h-[92dvh] w-full overflow-auto rounded-3xl border border-line bg-surface p-5 sm:p-6", wide ? "max-w-3xl" : "max-w-lg")}
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="mb-4 font-display text-2xl font-semibold uppercase tracking-wide">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">{children}</div>;
}

export function Loading() {
  return <div className="grid min-h-dvh place-items-center"><Wordmark className="text-5xl opacity-60" /></div>;
}
