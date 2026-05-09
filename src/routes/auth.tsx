import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { getDeviceId } from "@/lib/finance/device";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function claimAndGo() {
    try {
      const dev = getDeviceId();
      await supabase.rpc("claim_device_data", { _device_id: dev });
    } catch {}
    navigate({ to: "/" });
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Selamat datang kembali!");
    claimAndGo();
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: name },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Akun dibuat, kamu langsung masuk!");
    claimAndGo();
  }

  async function google() {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (r.error) {
      setBusy(false);
      toast.error("Gagal login Google");
      return;
    }
    if (!r.redirected) {
      // tokens received, set
      claimAndGo();
    }
  }

  return (
    <main className="min-h-screen grid place-items-center px-4 bg-background">
      <Toaster richColors theme="dark" position="top-center" />
      <div className="w-full max-w-md bg-gradient-card rounded-2xl border border-border shadow-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="size-9 rounded-xl bg-gradient-money grid place-items-center shadow-glow">
            <Sparkles className="size-5 text-primary-foreground" />
          </span>
          <h1 className="text-xl font-extrabold tracking-tight">Dompet Pintar</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-5">Masuk supaya datamu tersinkron antar perangkat.</p>

        <Button variant="outline" className="w-full mb-4" disabled={busy} onClick={google}>
          <svg className="size-4 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
          Lanjutkan dengan Google
        </Button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">atau email</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <Tabs defaultValue="login">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="login">Masuk</TabsTrigger>
            <TabsTrigger value="signup">Daftar</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="pt-4">
            <form onSubmit={handleLogin} className="space-y-3">
              <div><Label>Email</Label><Input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div><Label>Password</Label><Input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
              <Button type="submit" className="w-full bg-gradient-money text-primary-foreground" disabled={busy}>
                {busy && <Loader2 className="size-4 mr-2 animate-spin" />}Masuk
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="pt-4">
            <form onSubmit={handleSignup} className="space-y-3">
              <div><Label>Nama</Label><Input required value={name} onChange={e => setName(e.target.value)} placeholder="Nama panggilan" /></div>
              <div><Label>Email</Label><Input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div><Label>Password</Label><Input type="password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 karakter" /></div>
              <Button type="submit" className="w-full bg-gradient-money text-primary-foreground" disabled={busy}>
                {busy && <Loader2 className="size-4 mr-2 animate-spin" />}Daftar
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <p className="text-[11px] text-muted-foreground text-center mt-5">
          Datamu hanya kamu yang bisa lihat. Aman di Lovable Cloud.
        </p>
        <div className="text-center mt-2">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground underline">Kembali</Link>
        </div>
      </div>
    </main>
  );
}