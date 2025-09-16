import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, QrCode, Eye, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRCard {
  id: string;
  code: string;
  card_type: string;
  download_credits: number;
  is_activated: boolean;
  activated_by: string | null;
  activated_at: string | null;
  created_at: string;
}

const QRCards = () => {
  const [qrCards, setQrCards] = useState<QRCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchQRCards();
  }, []);

  const fetchQRCards = async () => {
    try {
      const { data, error } = await supabase
        .from('qr_cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching QR cards:', error);
        return;
      }

      setQrCards(data || []);
    } catch (error) {
      console.error('Error fetching QR cards:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los códigos QR',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteQRCard = async (cardId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este código QR?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('qr_cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Código QR eliminado correctamente',
      });

      fetchQRCards();
    } catch (error) {
      console.error('Error deleting QR card:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el código QR',
        variant: 'destructive',
      });
    }
  };

  const generateNewQRCard = async () => {
    try {
      const { error } = await supabase
        .from('qr_cards')
        .insert({
          code: `QR${Date.now()}`,
          card_type: 'standard',
          download_credits: 5,
        });

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Nuevo código QR generado correctamente',
      });

      fetchQRCards();
    } catch (error) {
      console.error('Error generating QR card:', error);
      toast({
        title: 'Error',
        description: 'No se pudo generar el código QR',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredQRCards = qrCards.filter(card =>
    card.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Códigos QR</h1>
          <p className="text-muted-foreground">
            Administra los códigos QR de la plataforma
          </p>
        </div>
        <Button onClick={generateNewQRCard}>
          <Plus className="h-4 w-4 mr-2" />
          Generar QR
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Códigos QR</CardTitle>
          <CardDescription>
            Encuentra códigos QR por código
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar códigos QR..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredQRCards.map((card) => (
          <Card key={card.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-yusiop-primary to-yusiop-accent rounded-lg flex items-center justify-center">
                    <QrCode className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{card.code}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant={card.is_activated ? 'default' : 'secondary'}>
                        {card.is_activated ? 'Activado' : 'Pendiente'}
                      </Badge>
                      <Badge variant="outline">{card.card_type}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {card.download_credits} créditos
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Creado: {formatDate(card.created_at)}
                    </p>
                    {card.activated_at && (
                      <p className="text-xs text-muted-foreground">
                        Activado: {formatDate(card.activated_at)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    Ver QR
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteQRCard(card.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredQRCards.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No se encontraron códigos QR</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QRCards;