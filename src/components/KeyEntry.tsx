import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { playChime, wrongFeedback } from "@/lib/sound";

type Props = {
  title: string;
  subtitle?: string;
  placeholder: string;
  buttonLabel: string;
  wrongLabel: string;
  numeric?: boolean;
  check: (value: string) => Promise<boolean>;
  onSuccess: (value: string) => void;
};

export function KeyEntry({ title, subtitle, placeholder, buttonLabel, wrongLabel, numeric, check, onSuccess }: Props) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const [error, setError] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    try {
      const ok = await check(value.trim());
      if (ok) {
        playChime();
        onSuccess(value.trim());
      } else {
        wrongFeedback();
        setError(true);
        setShake((s) => s + 1);
        setValue("");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      key={shake}
      onSubmit={submit}
      className={cn("w-full space-y-4 text-center", shake > 0 && "animate-shake")}
    >
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary animate-glow">
        <Lock className="size-6" />
      </div>
      <h2 className="font-display text-2xl text-gold">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      <Input
        type={numeric ? "password" : "text"}
        inputMode={numeric ? "numeric" : "text"}
        autoComplete="off"
        autoFocus
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(false);
        }}
        className={cn("h-12 text-center text-lg tracking-[0.3em]", error && "border-destructive")}
      />
      {error && <p className="text-sm text-destructive">{wrongLabel}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? "…" : buttonLabel}
      </Button>
    </form>
  );
}
