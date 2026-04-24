import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings as SettingsIcon, Save, Database, Shield, Bell, Globe } from 'lucide-react';
import { useLanguageStore, LANGUAGES } from '@/stores/languageStore';

const Settings = () => {
  const { language, setLanguage, t } = useLanguageStore();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
        <p className="text-muted-foreground">
          {language === 'es' ? 'Configura los parámetros generales de la plataforma' :
           language === 'en' ? 'Configure general platform settings' :
           language === 'fr' ? 'Configurez les paramètres généraux de la plateforme' :
           'Configure as configurações gerais da plataforma'}
        </p>
      </div>

      <div className="grid gap-6">
        {/* Language Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>{t('settings.language')}</span>
            </CardTitle>
            <CardDescription>
              {language === 'es' ? 'Selecciona el idioma de la interfaz' :
               language === 'en' ? 'Select the interface language' :
               language === 'fr' ? 'Sélectionnez la langue de l\'interface' :
               'Selecione o idioma da interface'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>{t('settings.languageLabel')}</Label>
              <Select value={language} onValueChange={(value) => setLanguage(value as any)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      <span className="mr-2">{lang.flag}</span>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <SettingsIcon className="h-5 w-5" />
              <span>
                {language === 'es' ? 'Configuración General' :
                 language === 'en' ? 'General Settings' :
                 language === 'fr' ? 'Paramètres Généraux' :
                 'Configurações Gerais'}
              </span>
            </CardTitle>
            <CardDescription>
              {language === 'es' ? 'Configuraciones básicas de la plataforma' :
               language === 'en' ? 'Basic platform settings' :
               language === 'fr' ? 'Paramètres de base de la plateforme' :
               'Configurações básicas da plataforma'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="platform-name">
                {language === 'es' ? 'Nombre de la Plataforma' :
                 language === 'en' ? 'Platform Name' :
                 language === 'fr' ? 'Nom de la Plateforme' :
                 'Nome da Plataforma'}
              </Label>
              <Input id="platform-name" defaultValue="YUSIOP" />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="contact-email">
                {language === 'es' ? 'Email de Contacto' :
                 language === 'en' ? 'Contact Email' :
                 language === 'fr' ? 'Email de Contact' :
                 'Email de Contato'}
              </Label>
              <Input id="contact-email" type="email" placeholder="admin@yusiop.com" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>
                  {language === 'es' ? 'Registros Públicos' :
                   language === 'en' ? 'Public Registration' :
                   language === 'fr' ? 'Inscriptions Publiques' :
                   'Registros Públicos'}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {language === 'es' ? 'Permitir registro de nuevos usuarios' :
                   language === 'en' ? 'Allow new user registration' :
                   language === 'fr' ? 'Autoriser l\'inscription de nouveaux utilisateurs' :
                   'Permitir registro de novos usuários'}
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>
                  {language === 'es' ? 'Modo Mantenimiento' :
                   language === 'en' ? 'Maintenance Mode' :
                   language === 'fr' ? 'Mode Maintenance' :
                   'Modo Manutenção'}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {language === 'es' ? 'Activar modo mantenimiento para la plataforma' :
                   language === 'en' ? 'Enable maintenance mode for the platform' :
                   language === 'fr' ? 'Activer le mode maintenance pour la plateforme' :
                   'Ativar modo de manutenção para a plataforma'}
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* Database Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Base de Datos</span>
            </CardTitle>
            <CardDescription>
              Configuraciones relacionadas con la base de datos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="backup-frequency">Frecuencia de Respaldo</Label>
              <select className="w-full p-2 border rounded-md">
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Respaldos Automáticos</Label>
                <p className="text-sm text-muted-foreground">
                  Activar respaldos automáticos de la base de datos
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <Button variant="outline" className="w-full">
              <Database className="h-4 w-4 mr-2" />
              Ejecutar Respaldo Manual
            </Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Seguridad</span>
            </CardTitle>
            <CardDescription>
              Configuraciones de seguridad y autenticación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="session-timeout">Tiempo de Sesión (minutos)</Label>
              <Input id="session-timeout" type="number" defaultValue="60" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Autenticación de Dos Factores</Label>
                <p className="text-sm text-muted-foreground">
                  Requerir 2FA para administradores
                </p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Logs de Seguridad</Label>
                <p className="text-sm text-muted-foreground">
                  Registrar intentos de acceso y cambios
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notificaciones</span>
            </CardTitle>
            <CardDescription>
              Configurar notificaciones del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Nuevos Usuarios</Label>
                <p className="text-sm text-muted-foreground">
                  Notificar cuando se registre un nuevo usuario
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Errores del Sistema</Label>
                <p className="text-sm text-muted-foreground">
                  Notificar errores críticos del sistema
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Actividad Sospechosa</Label>
                <p className="text-sm text-muted-foreground">
                  Alertar sobre actividad inusual
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Card>
          <CardContent className="p-6">
            <Button className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Guardar Configuración
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;