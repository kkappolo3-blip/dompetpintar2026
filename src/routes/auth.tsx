import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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