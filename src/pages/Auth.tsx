import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { signInSchema, signUpSchema } from '@/lib/validation';

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
const handleSignIn = async (e: React.FormEvent) => {
  e.preventDefault();
  const parsed = signInSchema.safeParse({ email, password });
  if (!parsed.success) {
    toast.error(parsed.error.issues[0].message);
    return;
  }
  const { error } = await signIn(parsed.data.email, parsed.data.password);
  if (error) {
    toast.error('Error al iniciar sesión: ' + error.message);
  } else {
    toast.success('¡Bienvenido a YUSIOP!');
    navigate('/', { replace: true });
  }
};

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    const parsed = signUpSchema.safeParse({ email, password, username });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    const { error } = await signUp(parsed.data.email, parsed.data.password, parsed.data.username);
    if (error) {
      toast.error('Error al registrarse: ' + error.message);
    } else {
      toast.success('¡Cuenta creada! Revisa tu email para confirmar.');
    }
  };

  return (
    <div className="dark relative min-h-screen bg-background flex items-center justify-center p-5 overflow-hidden grain">
      <div className="relative z-10 w-full max-w-md">
        {/* Editorial header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="h-px w-8 bg-border" />
            <p className="eyebrow">Edición digital</p>
            <span className="h-px w-8 bg-border" />
          </div>
          <h1 className="display-xl text-7xl mb-2">
            <span className="gold-text">Y</span>USIOP
          </h1>
          <p className="eyebrow mt-4">Scan · Sync · Play</p>
        </div>

        <div className="border border-border p-7 bg-card">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-transparent border-b border-border rounded-none p-0 h-auto gap-0 mb-6">
              <TabsTrigger
                value="signin"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none py-3 text-xs uppercase tracking-[0.18em] font-medium"
              >
                Iniciar Sesión
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none py-3 text-xs uppercase tracking-[0.18em] font-medium"
              >
                Registrarse
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="eyebrow">Email</Label>
                  <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-none border-border bg-input h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="eyebrow">Contraseña</Label>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="rounded-none border-border bg-input h-11" />
                </div>
                <Button type="submit" className="w-full h-11 rounded-none bg-primary text-primary-foreground hover:bg-primary/90 font-medium tracking-wide" disabled={loading}>
                  {loading ? 'Iniciando…' : 'Iniciar Sesión'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username" className="eyebrow">Nombre de usuario</Label>
                  <Input id="username" type="text" placeholder="usuario123" value={username} onChange={(e) => setUsername(e.target.value)} required className="rounded-none border-border bg-input h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="eyebrow">Email</Label>
                  <Input id="signup-email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-none border-border bg-input h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="eyebrow">Contraseña</Label>
                  <Input id="signup-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="rounded-none border-border bg-input h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="eyebrow">Repetir Contraseña</Label>
                  <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="rounded-none border-border bg-input h-11" />
                </div>
                <Button type="submit" className="w-full h-11 rounded-none bg-primary text-primary-foreground hover:bg-primary/90 font-medium tracking-wide" disabled={loading}>
                  {loading ? 'Registrando…' : 'Crear Cuenta'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="eyebrow text-center mt-6">© Yusiop · MMXXVI</p>
      </div>
    </div>
  );
};

export default Auth;