import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
const handleSignIn = async (e: React.FormEvent) => {
  e.preventDefault();
  const { error } = await signIn(email, password);
  if (error) {
    toast.error('Error al iniciar sesión: ' + error.message);
  } else {
    toast.success('¡Bienvenido a YUSIOP!');
    navigate('/', { replace: true });
  }
};

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await signUp(email, password, username);
    if (error) {
      toast.error('Error al registrarse: ' + error.message);
    } else {
      toast.success('¡Cuenta creada! Revisa tu email para confirmar.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 dark">
      <Card className="w-full max-w-md yusiop-card">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold yusiop-gradient bg-clip-text text-transparent">
            YUSIOP
          </CardTitle>
          <CardDescription>
            Descubre, previsualiza y descarga música con QR
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="yusiop-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="yusiop-input"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full yusiop-button-primary"
                  disabled={loading}
                >
                  {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Nombre de usuario</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="usuario123"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="yusiop-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="yusiop-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Contraseña</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="yusiop-input"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full yusiop-button-primary"
                  disabled={loading}
                >
                  {loading ? 'Registrando...' : 'Crear Cuenta'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;