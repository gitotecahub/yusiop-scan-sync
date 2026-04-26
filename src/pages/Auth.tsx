import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { signInSchema, signUpSchema } from '@/lib/validation';
import { useLanguageStore } from '@/stores/languageStore';
import { PasswordField } from '@/components/auth/PasswordField';

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, loading } = useAuthStore();
  const { t } = useLanguageStore();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
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
      toast.error(`${t('auth.signinError')}: ${error.message}`);
    } else {
      toast.success(`${t('auth.welcome')} YUSIOP!`);
      navigate('/', { replace: true });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t('auth.passwordsDontMatch'));
      return;
    }

    const parsed = signUpSchema.safeParse({ email, password, username });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    const { error } = await signUp(parsed.data.email, parsed.data.password, parsed.data.username);
    if (error) {
      if (error.message?.toLowerCase().includes('already') || error.message?.toLowerCase().includes('registered')) {
        toast.error(t('auth.emailRegistered'));
        setActiveTab('signin');
      } else {
        toast.error(`${t('auth.signupError')}: ${error.message}`);
      }
    } else {
      toast.success(t('auth.accountCreated'));
      setPassword('');
      setConfirmPassword('');
      setUsername('');
      setActiveTab('signin');
    }
  };

  return (
    <div className="dark relative min-h-screen w-full flex items-center justify-center p-5 overflow-hidden grain">
      {/* Full-screen fixed gradient background */}
      <div className="fixed inset-0 z-0" style={{ background: 'var(--gradient-vapor)' }} />
      {/* Ambient blobs over full gradient */}
      <div className="vapor-orb animate-blob-float fixed z-0" style={{ width: 500, height: 500, top: '-20%', left: '-20%', background: 'var(--gradient-sunset)', opacity: 0.55 }} />
      <div className="vapor-orb animate-blob-float fixed z-0" style={{ width: 420, height: 420, bottom: '-20%', right: '-20%', background: 'var(--gradient-aurora)', animationDelay: '4s', opacity: 0.5 }} />
      <div className="vapor-orb animate-blob-float fixed z-0" style={{ width: 360, height: 360, top: '40%', left: '60%', background: 'var(--gradient-vapor)', animationDelay: '7s', opacity: 0.4 }} />
      {/* Dark overlay for readability */}
      <div className="fixed inset-0 z-0 bg-background/40 backdrop-blur-2xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="display-xl text-7xl mb-2">
            <span className="vapor-text">Y</span>USIOP
          </h1>
          <p className="eyebrow mt-3">{t('auth.tagline')}</p>
        </div>

        <div className="glass-strong shadow-vapor p-7">

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'signin' | 'signup')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-card/40 border border-border rounded-full p-1 h-auto gap-1 mb-6">
              <TabsTrigger
                value="signin"
                className="rounded-full data-[state=active]:vapor-bg data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow py-2.5 text-xs font-bold tracking-wide"
              >
                {t('auth.signin')}
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="rounded-full data-[state=active]:vapor-bg data-[state=active]:text-primary-foreground data-[state=active]:shadow-glow py-2.5 text-xs font-bold tracking-wide"
              >
                {t('auth.signup')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="eyebrow">{t('auth.email')}</Label>
                  <Input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-2xl border-border bg-input h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="eyebrow">{t('auth.password')}</Label>
                  <PasswordField id="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="rounded-2xl border-border bg-input h-12" />
                </div>
                <Button type="submit" className="w-full h-12 rounded-full vapor-bg text-primary-foreground hover:opacity-90 font-bold shadow-glow" disabled={loading}>
                  {loading ? t('auth.signingIn') : t('auth.signinBtn')}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="eyebrow">{t('auth.username')}</Label>
                  <Input id="username" type="text" placeholder="usuario123" value={username} onChange={(e) => setUsername(e.target.value)} required className="rounded-2xl border-border bg-input h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="eyebrow">{t('auth.email')}</Label>
                  <Input id="signup-email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-2xl border-border bg-input h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="eyebrow">{t('auth.password')}</Label>
                  <Input id="signup-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="rounded-2xl border-border bg-input h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="eyebrow">{t('auth.confirmPassword')}</Label>
                  <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="rounded-2xl border-border bg-input h-12" />
                </div>
                <Button type="submit" className="w-full h-12 rounded-full vapor-bg text-primary-foreground hover:opacity-90 font-bold shadow-glow" disabled={loading}>
                  {loading ? t('auth.signingUp') : t('auth.signupBtn')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="eyebrow text-center mt-6">© Yusiop · 2026</p>
      </div>
    </div>
  );
};

export default Auth;
