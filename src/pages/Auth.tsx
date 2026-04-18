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
    <div className="dark relative min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden">
      {/* Vapor orbs */}
      <div className="vapor-orb w-96 h-96 bg-vapor top-[-100px] left-[-100px] animate-float-slow" />
      <div className="vapor-orb w-[28rem] h-[28rem] bg-vapor bottom-[-150px] right-[-150px] animate-float-slower opacity-50" />

      <div className="relative z-10 w-full max-w-md glass-strong rounded-3xl p-7 animate-fade-in">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 rounded-2xl vapor-gradient flex items-center justify-center mb-4 shadow-glow">
            <span className="font-display text-3xl font-bold text-primary-foreground">Y</span>
          </div>
          <h1 className="font-display text-3xl font-bold vapor-text">YUSIOP</h1>
          <p className="text-sm text-muted-foreground mt-2">Descubre, previsualiza y descarga música con QR</p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 glass rounded-2xl p-1 h-auto mb-5">
            <TabsTrigger value="signin" className="rounded-xl data-[state=active]:vapor-gradient data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="signup" className="rounded-xl data-[state=active]:vapor-gradient data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow">Registrarse</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="yusiop-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">Contraseña</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="yusiop-input" />
              </div>
              <Button type="submit" className="w-full h-11 rounded-2xl vapor-gradient text-primary-foreground border-0 shadow-glow font-semibold hover:opacity-90" disabled={loading}>
                {loading ? 'Iniciando…' : 'Iniciar Sesión'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs uppercase tracking-wider text-muted-foreground">Nombre de usuario</Label>
                <Input id="username" type="text" placeholder="usuario123" value={username} onChange={(e) => setUsername(e.target.value)} required className="yusiop-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input id="signup-email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="yusiop-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-xs uppercase tracking-wider text-muted-foreground">Contraseña</Label>
                <Input id="signup-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="yusiop-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-xs uppercase tracking-wider text-muted-foreground">Repetir Contraseña</Label>
                <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="yusiop-input" />
              </div>
              <Button type="submit" className="w-full h-11 rounded-2xl vapor-gradient text-primary-foreground border-0 shadow-glow font-semibold hover:opacity-90" disabled={loading}>
                {loading ? 'Registrando…' : 'Crear Cuenta'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;