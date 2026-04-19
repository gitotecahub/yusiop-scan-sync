import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, Plus, QrCode, Eye, Trash2, Download, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRCodeLib from 'qrcode';

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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [selectedCard, setSelectedCard] = useState<QRCard | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [newCardType, setNewCardType] = useState('standard');
  const [newCardQuantity, setNewCardQuantity] = useState('1');
  const [isGenerating, setIsGenerating] = useState(false);
  const newCardCredits = newCardType === 'premium' ? '10' : '4';
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
      const uniqueCode = `QR${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const { error } = await supabase
        .from('qr_cards')
        .insert({
          code: uniqueCode,
          card_type: newCardType as 'standard' | 'premium',
          download_credits: parseInt(newCardCredits),
        });

      if (error) throw error;

      toast({
        title: 'Éxito',
        description: 'Nuevo código QR generado correctamente',
      });

      setShowCreateDialog(false);
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

  const generateQRImage = async (code: string) => {
    try {
      const qrDataUrl = await QRCodeLib.toDataURL(code, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrDataUrl;
    } catch (error) {
      console.error('Error generating QR image:', error);
      return '';
    }
  };

  const handleViewQR = async (card: QRCard) => {
    setSelectedCard(card);
    const qrImage = await generateQRImage(card.code);
    setQrImageUrl(qrImage);
    setShowQRDialog(true);
  };

  const handleDownloadQR = () => {
    if (qrImageUrl && selectedCard) {
      const link = document.createElement('a');
      link.download = `QR-${selectedCard.code}.png`;
      link.href = qrImageUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Copiado',
      description: 'Código copiado al portapapeles',
    });
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
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Generar QR
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Código QR</DialogTitle>
              <DialogDescription>
                Configura los parámetros para el nuevo código QR
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="card-type">Tipo de Tarjeta</Label>
                <Select value={newCardType} onValueChange={setNewCardType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Estándar (4 créditos)</SelectItem>
                    <SelectItem value="premium">Premium (10 créditos)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground">
                Créditos asignados automáticamente: <span className="font-semibold text-foreground">{newCardCredits}</span>
              </div>
              <Button onClick={generateNewQRCard} className="w-full">
                <QrCode className="h-4 w-4 mr-2" />
                Generar Código QR
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                       <Badge variant={card.is_activated ? 'destructive' : 'default'}>
                         {card.is_activated ? 'Activada' : 'Disponible'}
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
                       <p className="text-xs text-orange-600">
                         Activada: {formatDate(card.activated_at)}
                       </p>
                     )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleViewQR(card)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Ver QR
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCopyCode(card.code)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar
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

      {/* Dialog para mostrar el código QR */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Código QR - {selectedCard?.code}</DialogTitle>
            <DialogDescription>
              Escanea este código para activar {selectedCard?.download_credits} créditos de descarga
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {qrImageUrl && (
              <div className="bg-white p-4 rounded-lg border">
                <img 
                  src={qrImageUrl} 
                  alt="Código QR" 
                  className="w-64 h-64"
                />
              </div>
            )}
            <div className="flex space-x-2 w-full">
              <Button 
                variant="outline" 
                onClick={handleDownloadQR}
                className="flex-1"
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar
              </Button>
              <Button 
                variant="outline" 
                onClick={() => selectedCard && handleCopyCode(selectedCard.code)}
                className="flex-1"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar Código
              </Button>
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">{selectedCard?.code}</p>
              <div className="flex justify-center space-x-2">
                <Badge variant={selectedCard?.is_activated ? 'default' : 'secondary'}>
                  {selectedCard?.is_activated ? 'Activado' : 'Pendiente'}
                </Badge>
                <Badge variant="outline">{selectedCard?.card_type}</Badge>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QRCards;