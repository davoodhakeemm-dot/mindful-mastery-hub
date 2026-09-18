import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage, useT } from "@/lib/i18n";
import { useProfile, useSession } from "@/lib/useAuth";

export const Route = createFileRoute("/_authenticated/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const t = useT();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { user } = useSession();
  const { data: profile, isLoading } = useProfile(user?.id);

  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [gmail, setGmail] = useState("");
  const [address, setAddress] = useState("");
  const [courseId, setCourseId] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title_en, title_ml")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (user?.email) setGmail((g) => g || user.email!);
  }, [user?.email]);

  useEffect(() => {
    if (profile) navigate({ to: "/dashboard", replace: true });
  }, [profile, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (gmail.trim().toLowerCase() !== (user.email ?? "").toLowerCase()) {
      toast.error(t("gmailMismatch"));
      return;
    }
    if (!consent) {
      toast.error(t("consent"));
      return;
    }
    setBusy(true);
    try {
      let photoPath: string | null = null;
      if (photo) {
        const ext = photo.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/photo.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("student-photos")
          .upload(path, photo, { upsert: true });
        if (upErr) throw upErr;
        photoPath = path;
      }

      const { error } = await supabase.from("profiles").insert({
        id: user.id,
        full_name: fullName.trim(),
        age: age ? Number(age) : null,
        phone: phone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        gmail: gmail.trim().toLowerCase(),
        address: address.trim() || null,
        photo_url: photoPath,
        selected_course: courseId || null,
        consent_accepted: true,
      });
      if (error) throw error;
      toast.success(t("pendingApproval"));
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <p className="p-8 text-center text-sm text-muted-foreground">…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-5 py-8">
        <h1 className="font-display text-2xl text-foreground">{t("registerTitle")}</h1>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("privacyNotice")}</p>

        <form onSubmit={submit} className="mt-6 space-y-4 rounded-3xl surface-card p-5">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">{t("fullName")}</Label>
            <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="age">{t("age")}</Label>
              <Input id="age" type="number" min={1} max={120} value={age} onChange={(e) => setAge(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input id="phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="whatsapp">{t("whatsapp")}</Label>
            <Input id="whatsapp" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gmail">{t("gmail")}</Label>
            <Input id="gmail" type="email" required value={gmail} onChange={(e) => setGmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">{t("address")}</Label>
            <Textarea id="address" rows={3} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="photo">{t("photo")}</Label>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="course">{t("course")}</Label>
            <select
              id="course"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              <option value="">—</option>
              {courses?.map((c) => (
                <option key={c.id} value={c.id}>
                  {lang === "ml" ? c.title_ml : c.title_en}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-start gap-3 rounded-2xl border border-border p-3 text-xs leading-relaxed text-foreground/90">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
            <span>{t("consent")}</span>
          </label>
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {t("submit")}
          </Button>
        </form>
      </main>
    </div>
  );
}
