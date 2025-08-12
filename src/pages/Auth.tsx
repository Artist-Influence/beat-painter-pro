import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Auth: React.FC = () => {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation() as any;
  const redirectTo = location.state?.from?.pathname ?? "/";

  React.useEffect(() => {
    // Basic SEO for Auth page
    document.title = mode === "signIn" ? "Sign in | Admin Access" : "Create account | Admin Access";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Sign in to access the visualizer studio and admin dashboard.";
      document.head.appendChild(m);
    } else {
      (metaDesc as HTMLMetaElement).content = "Sign in to access the visualizer studio and admin dashboard.";
    }

    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      link.setAttribute("href", window.location.href);
      document.head.appendChild(link);
    } else {
      link.setAttribute("href", window.location.href);
    }
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signUp") {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        toast.success("Account created. Please check your email to verify.");
        setMode("signIn");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in successfully");
        navigate(redirectTo, { replace: true });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>{mode === "signIn" ? "Sign in" : "Create account"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Please wait…" : mode === "signIn" ? "Sign in" : "Create account"}
              </Button>
            </form>
            <div className="mt-4 text-sm">
              {mode === "signIn" ? (
                <p>
                  No account?{" "}
                  <button className="underline" onClick={() => setMode("signUp")}>Sign up</button>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <button className="underline" onClick={() => setMode("signIn")}>Sign in</button>
                </p>
              )}
              <div className="mt-2">
                <Link to="/">Back to Studio</Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
