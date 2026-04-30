import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, UserPlus, Check, X, UserMinus, Users, Inbox, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useFriends, FriendProfile } from '@/hooks/useFriends';

const Friends = () => {
  const navigate = useNavigate();
  const {
    friends,
    incoming,
    outgoing,
    loading,
    sendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    removeFriend,
    searchUsers,
  } = useFriends();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FriendProfile[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      const data = await searchUsers(query);
      if (cancelled) return;
      setResults(data);
      setSearching(false);
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, searchUsers]);

  const friendIds = new Set(friends.map((f) => f.user_id));
  const outgoingIds = new Set(outgoing.map((r) => r.receiver_id));
  const incomingIds = new Set(incoming.map((r) => r.sender_id));

  const handleAdd = async (uid: string) => {
    const { error } = await sendRequest(uid);
    if (error) toast.error(error.includes('duplicate') ? 'Ya hay una solicitud pendiente' : 'No se pudo enviar');
    else toast.success('Solicitud enviada');
  };

  return (
    <div className="pb-24">
      <header className="bg-background">
        <div className="flex items-center gap-3 h-14">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-yusiop-primary via-yusiop-accent to-yusiop-secondary flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <h1 className="font-display text-lg font-bold">Amigos</h1>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o username…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 rounded-full"
          />
        </div>

        {query.trim().length >= 2 && (
          <div className="space-y-2">
            <p className="eyebrow">Resultados</p>
            {searching ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Buscando…</p>
            ) : results.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Sin resultados</p>
            ) : (
              <ul className="space-y-2">
                {results.map((u) => {
                  const isFriend = friendIds.has(u.user_id);
                  const isPendingOut = outgoingIds.has(u.user_id);
                  const isPendingIn = incomingIds.has(u.user_id);
                  return (
                    <li
                      key={u.user_id}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback>
                          {(u.full_name || u.username || '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {u.full_name || u.username || 'Usuario'}
                        </p>
                        {u.username && (
                          <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                        )}
                      </div>
                      {isFriend ? (
                        <Badge variant="secondary" className="rounded-full">Amigos</Badge>
                      ) : isPendingOut ? (
                        <Badge variant="outline" className="rounded-full">Enviada</Badge>
                      ) : isPendingIn ? (
                        <Badge variant="outline" className="rounded-full">Te invitó</Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleAdd(u.user_id)}
                          className="rounded-full bg-gradient-to-r from-yusiop-primary via-yusiop-accent to-yusiop-secondary"
                        >
                          <UserPlus className="h-4 w-4 mr-1" /> Añadir
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="w-full grid grid-cols-3 rounded-full">
            <TabsTrigger value="friends" className="rounded-full">
              <Users className="h-4 w-4 mr-1" /> Amigos
              {friends.length > 0 && <span className="ml-1 text-xs">({friends.length})</span>}
            </TabsTrigger>
            <TabsTrigger value="incoming" className="rounded-full">
              <Inbox className="h-4 w-4 mr-1" /> Recibidas
              {incoming.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {incoming.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="rounded-full">
              <Clock className="h-4 w-4 mr-1" /> Enviadas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-4 space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Cargando…</p>
            ) : friends.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aún no tienes amigos. Búscalos arriba 👆
              </p>
            ) : (
              friends.map((f) => (
                <div
                  key={f.user_id}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={f.avatar_url || undefined} />
                    <AvatarFallback>
                      {(f.full_name || f.username || '?').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {f.full_name || f.username || 'Usuario'}
                    </p>
                    {f.username && (
                      <p className="text-xs text-muted-foreground truncate">@{f.username}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-destructive"
                    onClick={async () => {
                      const { error } = await removeFriend(f.user_id);
                      if (error) toast.error('No se pudo eliminar');
                      else toast.success('Amigo eliminado');
                    }}
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="incoming" className="mt-4 space-y-2">
            {incoming.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No tienes solicitudes pendientes
              </p>
            ) : (
              incoming.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={r.profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {(r.profile?.full_name || r.profile?.username || '?').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {r.profile?.full_name || r.profile?.username || 'Usuario'}
                    </p>
                    <p className="text-xs text-muted-foreground">quiere ser tu amigo</p>
                  </div>
                  <Button
                    size="icon"
                    className="h-9 w-9 rounded-full bg-gradient-to-r from-yusiop-primary via-yusiop-accent to-yusiop-secondary"
                    onClick={async () => {
                      const { error } = await acceptRequest(r.id);
                      if (error) toast.error('Error al aceptar');
                      else toast.success('Ahora sois amigos 🎉');
                    }}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    onClick={async () => {
                      const { error } = await rejectRequest(r.id);
                      if (error) toast.error('Error');
                      else toast.success('Solicitud rechazada');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="outgoing" className="mt-4 space-y-2">
            {outgoing.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No tienes solicitudes enviadas
              </p>
            ) : (
              outgoing.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30 border border-border"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={r.profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {(r.profile?.full_name || r.profile?.username || '?').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {r.profile?.full_name || r.profile?.username || 'Usuario'}
                    </p>
                    <p className="text-xs text-muted-foreground">Pendiente</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={async () => {
                      const { error } = await cancelRequest(r.id);
                      if (error) toast.error('Error');
                      else toast.success('Solicitud cancelada');
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Friends;
