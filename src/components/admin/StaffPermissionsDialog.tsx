import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  STAFF_AREA_LABELS,
  STAFF_AREA_LIST,
  StaffArea,
} from '@/hooks/useStaffAreas';
import { Loader2, ShieldCheck } from 'lucide-react';

interface StaffPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  username: string;
  isSuperAdmin: boolean;
}

export function StaffPermissionsDialog({
  open,
  onOpenChange,
  userId,
  username,
  isSuperAdmin,
}: StaffPermissionsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<StaffArea>>(new Set());
  const [original, setOriginal] = useState<Set<StaffArea>>(new Set());

  useEffect(() => {
    if (!open) return;
    const fetchAreas = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('staff_permissions')
        .select('area')
        .eq('user_id', userId);
      if (error) {
        toast({
          title: 'Error',
          description: 'No se pudieron cargar los permisos',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      const set = new Set<StaffArea>(
        (data ?? []).map((r) => r.area as StaffArea),
      );
      setSelected(new Set(set));
      setOriginal(new Set(set));
      setLoading(false);
    };
    fetchAreas();
  }, [open, userId, toast]);

  const toggle = (area: StaffArea, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(area);
    else next.delete(area);
    setSelected(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const toAdd = [...selected].filter((a) => !original.has(a));
      const toRemove = [...original].filter((a) => !selected.has(a));

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('staff_permissions')
          .delete()
          .eq('user_id', userId)
          .in('area', toRemove);
        if (error) throw error;
      }

      if (toAdd.length > 0) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('staff_permissions').insert(
          toAdd.map((area) => ({
            user_id: userId,
            area,
            granted_by: user?.id ?? null,
          })),
        );
        if (error) throw error;
      }

      toast({
        title: 'Permisos actualizados',
        description: `Se actualizaron los accesos del equipo para @${username}`,
      });
      onOpenChange(false);
    } catch (e: any) {
      toast({
        title: 'Error',
        description: e?.message ?? 'No se pudieron guardar los cambios',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Permisos del equipo · @{username}
          </DialogTitle>
          <DialogDescription>
            Asigna las áreas del panel a las que este usuario tendrá acceso.
            Solo el super-admin puede modificar estos permisos.
          </DialogDescription>
        </DialogHeader>

        {isSuperAdmin && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
            <p className="font-medium">Este usuario es super-admin</p>
            <p className="text-muted-foreground text-xs mt-1">
              Tiene acceso completo a todas las áreas del panel. Los permisos
              específicos abajo solo aplican si se le quita el rol de admin.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {STAFF_AREA_LIST.map((area) => (
              <div
                key={area}
                className="flex items-start gap-3 rounded-md border p-3 hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  id={`area-${area}`}
                  checked={selected.has(area)}
                  onCheckedChange={(c) => toggle(area, !!c)}
                  disabled={saving}
                />
                <Label
                  htmlFor={`area-${area}`}
                  className="text-sm font-normal leading-relaxed cursor-pointer flex-1"
                >
                  {STAFF_AREA_LABELS[area]}
                </Label>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar permisos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
