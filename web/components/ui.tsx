"use client";

import { forwardRef, useState } from "react";
import { Icon, type IconName } from "./icons";

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(" ");

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Yuklanmoqda"
      className={cx("inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent", className)}
    />
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "violet" | "soft";
  loading?: boolean;
  icon?: IconName;
  full?: boolean;
  small?: boolean;
};

const VARIANTS = {
  primary: "bg-brand text-white shadow-sm active:bg-blue-700",
  violet: "bg-violet text-white shadow-sm active:bg-violet-700",
  danger: "bg-red-500 text-white active:bg-red-600",
  secondary: "border border-line bg-white text-ink active:bg-slate-50",
  soft: "bg-brand-bg text-brand active:bg-blue-100",
};

export function Button({ variant = "primary", loading, icon, full, small, className, children, disabled, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors select-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        small ? "min-h-10 px-3 text-sm" : "min-h-12 px-4 text-[15px]",
        full && "w-full",
        VARIANTS[variant],
        className,
      )}
    >
      {loading ? <Spinner className="size-4" /> : icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}

export function IconButton({
  icon,
  label,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: IconName; label: string }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={cx("inline-flex size-11 items-center justify-center rounded-xl text-ink-soft active:bg-slate-100", className)}
    >
      <Icon name={icon} size={20} />
    </button>
  );
}

type FieldProps = {
  label?: string;
  hint?: string;
  icon?: IconName;
  right?: React.ReactNode;
};

export const TextInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & FieldProps>(
  function TextInput({ label, hint, icon, right, className, ...rest }, ref) {
    return (
      <label className="block">
        {label && <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>}
        <span className="relative flex items-center">
          {icon && <Icon name={icon} size={18} className="pointer-events-none absolute left-3.5 text-ink-mute" />}
          <input
            ref={ref}
            {...rest}
            className={cx(
              "min-h-12 w-full rounded-xl border border-line bg-slate-50 text-ink outline-none transition",
              "placeholder:text-ink-mute focus:border-brand-light focus:bg-white focus:ring-2 focus:ring-brand/15",
              icon ? "pl-11" : "pl-4",
              right ? "pr-12" : "pr-4",
              className,
            )}
          />
          {right && <span className="absolute right-1 flex items-center">{right}</span>}
        </span>
        {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
      </label>
    );
  },
);

export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  const [show, setShow] = useState(false);
  return (
    <TextInput
      {...props}
      type={show ? "text" : "password"}
      right={<IconButton type="button" icon={show ? "eyeOff" : "eye"} label={show ? "Yashirish" : "Ko'rsatish"} onClick={() => setShow(!show)} />}
    />
  );
}

export function Select({ label, className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>}
      <select
        {...rest}
        className={cx(
          "min-h-12 w-full rounded-xl border border-line bg-slate-50 px-3 text-ink outline-none focus:border-brand-light focus:bg-white focus:ring-2 focus:ring-brand/15",
          className,
        )}
      >
        {children}
      </select>
    </label>
  );
}

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-40",
        checked ? "bg-brand" : "bg-slate-300",
      )}
    >
      <span className={cx("inline-block size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-6" : "translate-x-1")} />
    </button>
  );
}

export function Badge({ children, color = "slate" }: { children: React.ReactNode; color?: "slate" | "blue" | "orange" | "violet" | "green" | "red" }) {
  const map = {
    slate: "bg-slate-100 text-slate-500",
    blue: "bg-blue-50 text-brand",
    orange: "bg-orange-50 text-accent",
    violet: "bg-violet-50 text-violet",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-500",
  };
  return <span className={cx("inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-extrabold uppercase tracking-wide", map[color])}>{children}</span>;
}

export function Empty({ icon = "package", text }: { icon?: IconName; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center text-ink-soft">
      <Icon name={icon} size={44} className="text-ink-mute" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="m-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
      <p>{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 font-semibold underline">
          Qayta urinish
        </button>
      )}
    </div>
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={cx(
        "flex size-7 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
        checked ? "border-brand bg-brand text-white" : "border-slate-300 bg-white",
      )}
    >
      {checked && <Icon name="tick" size={16} />}
    </button>
  );
}

export const cn = cx;
