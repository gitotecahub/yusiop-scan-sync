import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Search,
  UserPlus,
  Shield,
  ShieldCheck,
  Pencil,
  Trash2,
  Users as UsersIcon,
  Eye,
  Crown,
  Gift,
  ShoppingBag,
  KeyRound,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';
import { StaffPermissionsDialog } from '@/components/admin/StaffPermissionsDialog';
import { useAuth } from '@/hooks/useAuth';

interface UserProfile {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  downloads_remaining: number | null;
  created_at: string;
  role: 'admin' | 'user';
  purchaseCount: number;
  totalSpentCents: number;
  cardCount: number;
  hasGiftRedeemed: boolean;
  downloadCount: number;
}

type SegmentFilter = 'all' | 'vip' | 'customers' | 'gift_redeemers' | 'no_purchases' | 'admins';

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [segment, setSegment] = useState<SegmentFilter>('all');
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', username: '', downloads_remaining: 0 });
  const [savingEdit, setSavingEdit] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [profilesRes, rolesRes, purchasesRes, cardsRes, downloadsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, role'),
        supabase
          .from('card_purchases')
          .select('buyer_user_id, amount_cents, status'),
        supabase.from('qr_cards').select('owner_user_id, activated_by, is_gift, gift_redeemed'),
        supabase.from('user_downloads').select('user_id'),
      ]);

      if (profilesRes.error) throw profilesRes.error;

      const adminIds = new Set(
        (rolesRes.data ?? []).filter((r) => r.role === 'admin').map((r) => r.user_id),
      );

      // Aggregate purchases
      const purchaseStats = new Map<string, { count: number; total: number }>();
      (purchasesRes.data ?? []).forEach((p) => {
        if (p.status !== 'paid' || !p.buyer_user_id) return;
        const cur = purchaseStats.get(p.buyer_user_id) ?? { count: 0, total: 0 };
        cur.count += 1;
        cur.total += p.amount_cents ?? 0;
        purchaseStats.set(p.buyer_user_id, cur);
      });

      // Aggregate cards
      const cardStats = new Map<string, { count: number; giftRedeemed: boolean }>();
      (cardsRes.data ?? []).forEach((c) => {
        const owners = [c.owner_user_id, c.activated_by].filter(Boolean) as string[];
        owners.forEach((uid) => {
          const cur = cardStats.get(uid) ?? { count: 0, giftRedeemed: false };
          cur.count += 1;
          if (c.is_gift && c.gift_redeemed) cur.giftRedeemed = true;
          cardStats.set(uid, cur);
        });
      });

      // Aggregate downloads per user
      const downloadStats = new Map<string, number>();
      (downloadsRes.data ?? []).forEach((d) => {
        if (!d.user_id) return;
        downloadStats.set(d.user_id, (downloadStats.get(d.user_id) ?? 0) + 1);
      });

      const merged: UserProfile[] = (profilesRes.data ?? []).map((p) => {
        const purch = purchaseStats.get(p.user_id);
        const card = cardStats.get(p.user_id);
        return {
          id: p.id,
          user_id: p.user_id,
          username: p.username,
          full_name: p.full_name,
          avatar_url: p.avatar_url,
          downloads_remaining: p.downloads_remaining,
          created_at: p.created_at,
          role: adminIds.has(p.user_id) ? 'admin' : 'user',
          purchaseCount: purch?.count ?? 0,
          totalSpentCents: purch?.total ?? 0,
          cardCount: card?.count ?? 0,
          hasGiftRedeemed: card?.giftRedeemed ?? false,
          downloadCount: downloadStats.get(p.user_id) ?? 0,
        };
      });

      setUsers(merged);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminRole = async (userId: string, currentRole: string) => {
    try {
      if (currentRole === 'admin') {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });
        if (error) throw error;
      }

      toast({
        title: 'Éxito',
        description: `Rol ${currentRole === 'admin' ? 'removido' : 'asignado'} correctamente`,
      });
      fetchUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el rol del usuario',
        variant: 'destructive',
      });
    }
  };

  const openEdit = (user: UserProfile) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name ?? '',
      username: user.username ?? '',
      downloads_remaining: user.downloads_remaining ?? 0,
    });
  };

  const saveEdit = async () => {
    if (!editingUser) return;
    if (editForm.username.trim().length < 3) {
      toast({ title: 'Datos inválidos', description: 'El usuario debe tener al menos 3 caracteres', variant: 'destructive' });
      return;
    }
    if (editForm.downloads_remaining < 0) {
      toast({ title: 'Datos inválidos', description: 'Las descargas no pueden ser negativas', variant: 'destructive' });
      return;
    }
    try {
      setSavingEdit(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name.trim() || null,
          username: editForm.username.trim(),
          downloads_remaining: editForm.downloads_remaining,
        })
        .eq('id', editingUser.id);
      if (error) throw error;
      toast({ title: 'Éxito', description: 'Usuario actualizado' });
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'No se pudo actualizar el usuario',
        variant: 'destructive',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    try {
      await supabase.from('user_roles').delete().eq('user_id', deletingUser.user_id);
      const { error } = await supabase.from('profiles').delete().eq('id', deletingUser.id);
      if (error) throw error;
      toast({ title: 'Usuario eliminado', description: 'El perfil se eliminó correctamente' });
      setDeletingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'No se pudo eliminar el usuario',
        variant: 'destructive',
      });
    }
  };

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return users.filter((u) => {
      const matchesSearch =
        !term ||
        (u.username ?? '').toLowerCase().includes(term) ||
        (u.full_name ?? '').toLowerCase().includes(term);

      const matchesSegment =
        segment === 'all' ||
        (segment === 'vip' && u.downloadCount >= 50) ||
        (segment === 'customers' && u.purchaseCount >= 1) ||
        (segment === 'gift_redeemers' && u.hasGiftRedeemed) ||
        (segment === 'no_purchases' && u.purchaseCount === 0) ||
        (segment === 'admins' && u.role === 'admin');

      return matchesSearch && matchesSegment;
    });
  }, [users, searchTerm, segment]);

  const stats = useMemo(() => ({
    total: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    vip: users.filter((u) => u.downloadCount >= 50).length,
    customers: users.filter((u) => u.purchaseCount >= 1).length,
  }), [users]);

  const formatEur = (cents: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="grid gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">CRM de Usuarios</h1>
          <p className="text-muted-foreground">Gestiona y segmenta a tus clientes</p>
        </div>
        <Button onClick={() => setCreateUserOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total" value={stats.total} icon={UsersIcon} />
        <StatCard title="Clientes" value={stats.customers} icon={ShoppingBag} hint="Con ≥1 compra" />
        <StatCard title="VIP" value={stats.vip} icon={Crown} hint="Con ≥50 descargas" accent />
        <StatCard title="Admins" value={stats.admins} icon={ShieldCheck} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar y filtrar</CardTitle>
          <CardDescription>Encuentra usuarios por nombre o segmento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nombre o username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={segment} onValueChange={(v: SegmentFilter) => setSegment(v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Segmento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los usuarios</SelectItem>
                <SelectItem value="vip">⭐ VIP (≥50 descargas)</SelectItem>
                <SelectItem value="customers">Clientes (≥1 compra)</SelectItem>
                <SelectItem value="gift_redeemers">🎁 Canjearon regalo</SelectItem>
                <SelectItem value="no_purchases">Sin compras</SelectItem>
                <SelectItem value="admins">Administradores</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Mostrando {filteredUsers.length} de {users.length} usuarios
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="hover:border-primary/40 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <button
                  onClick={() => navigate(`/admin/users/${user.user_id}`)}
                  className="flex items-center space-x-4 text-left flex-1 min-w-0"
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center text-primary-foreground font-bold shrink-0">
                    {(user.username ?? user.full_name ?? 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">
                      {user.full_name || user.username || 'Sin nombre'}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      @{user.username || 'sin-usuario'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {user.role === 'admin' && (
                        <Badge variant="default" className="text-xs gap-1">
                          <ShieldCheck className="h-3 w-3" /> Admin
                        </Badge>
                      )}
                      {user.downloadCount >= 50 && (
                        <Badge variant="default" className="text-xs gap-1 bg-primary/80">
                          <Crown className="h-3 w-3" /> VIP
                        </Badge>
                      )}
                      {user.purchaseCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {user.purchaseCount} compra{user.purchaseCount > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {user.hasGiftRedeemed && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Gift className="h-3 w-3" /> Regalo
                        </Badge>
                      )}
                      {user.totalSpentCents > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {formatEur(user.totalSpentCents)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/users/${user.user_id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" /> Ver
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openEdit(user)}>
                    <Pencil className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  <Button
                    variant={user.role === 'admin' ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => toggleAdminRole(user.user_id, user.role)}
                  >
                    {user.role === 'admin' ? (
                      <><ShieldCheck className="h-4 w-4 mr-1" /> Quitar</>
                    ) : (
                      <><Shield className="h-4 w-4 mr-1" /> Admin</>
                    )}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setDeletingUser(user)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No se encontraron usuarios</p>
          </CardContent>
        </Card>
      )}

      <CreateUserDialog
        open={createUserOpen}
        onOpenChange={setCreateUserOpen}
        onUserCreated={fetchUsers}
      />

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>Actualiza la información del perfil</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fullname">Nombre completo</Label>
              <Input
                id="edit-fullname"
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-username">Nombre de usuario</Label>
              <Input
                id="edit-username"
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-downloads">Descargas restantes</Label>
              <Input
                id="edit-downloads"
                type="number"
                min={0}
                value={editForm.downloads_remaining}
                onChange={(e) =>
                  setEditForm({ ...editForm, downloads_remaining: parseInt(e.target.value, 10) || 0 })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
            <Button onClick={saveEdit} disabled={savingEdit}>
              {savingEdit ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el perfil de <strong>{deletingUser?.full_name || deletingUser?.username}</strong>{' '}
              y sus roles asociados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  hint,
  accent,
}: {
  title: string;
  value: number;
  icon: any;
  hint?: string;
  accent?: boolean;
}) => (
  <Card className={accent ? 'border-primary/30 bg-primary/5' : ''}>
    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`h-4 w-4 ${accent ? 'text-primary' : 'text-muted-foreground'}`} />
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">{value}</div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </CardContent>
  </Card>
);

export default Users;
