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
              <span>
                {language === 'es' ? 'Seguridad' :
                 language === 'en' ? 'Security' :
                 language === 'fr' ? 'Sécurité' :
                 'Segurança'}
              </span>
            </CardTitle>
            <CardDescription>
              {language === 'es' ? 'Configuraciones de seguridad y autenticación' :
               language === 'en' ? 'Security and authentication settings' :
               language === 'fr' ? 'Paramètres de sécurité et d\'authentification' :
               'Configurações de segurança e autenticação'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="session-timeout">
                {language === 'es' ? 'Tiempo de Sesión (minutos)' :
                 language === 'en' ? 'Session Timeout (minutes)' :
                 language === 'fr' ? 'Délai de Session (minutes)' :
                 'Tempo de Sessão (minutos)'}
              </Label>
              <Input id="session-timeout" type="number" defaultValue="60" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>
                  {language === 'es' ? 'Autenticación de Dos Factores' :
                   language === 'en' ? 'Two-Factor Authentication' :
                   language === 'fr' ? 'Authentification à Deux Facteurs' :
                   'Autenticação de Dois Fatores'}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {language === 'es' ? 'Requerir 2FA para administradores' :
                   language === 'en' ? 'Require 2FA for administrators' :
                   language === 'fr' ? 'Exiger 2FA pour les administrateurs' :
                   'Exigir 2FA para administradores'}
                </p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>
                  {language === 'es' ? 'Logs de Seguridad' :
                   language === 'en' ? 'Security Logs' :
                   language === 'fr' ? 'Journaux de Sécurité' :
                   'Logs de Segurança'}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {language === 'es' ? 'Registrar intentos de acceso y cambios' :
                   language === 'en' ? 'Log access attempts and changes' :
                   language === 'fr' ? 'Enregistrer les tentatives d\'accès et les modifications' :
                   'Registrar tentativas de acesso e alterações'}
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
              <span>
                {language === 'es' ? 'Notificaciones' :
                 language === 'en' ? 'Notifications' :
                 language === 'fr' ? 'Notifications' :
                 'Notificações'}
              </span>
            </CardTitle>
            <CardDescription>
              {language === 'es' ? 'Configurar notificaciones del sistema' :
               language === 'en' ? 'Configure system notifications' :
               language === 'fr' ? 'Configurer les notifications du système' :
               'Configurar notificações do sistema'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>
                  {language === 'es' ? 'Nuevos Usuarios' :
                   language === 'en' ? 'New Users' :
                   language === 'fr' ? 'Nouveaux Utilisateurs' :
                   'Novos Usuários'}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {language === 'es' ? 'Notificar cuando se registre un nuevo usuario' :
                   language === 'en' ? 'Notify when a new user registers' :
                   language === 'fr' ? 'Notifier lorsqu\'un nouvel utilisateur s\'inscrit' :
                   'Notificar quando um novo usuário se registrar'}
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>
                  {language === 'es' ? 'Errores del Sistema' :
                   language === 'en' ? 'System Errors' :
                   language === 'fr' ? 'Erreurs du Système' :
                   'Erros do Sistema'}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {language === 'es' ? 'Notificar errores críticos del sistema' :
                   language === 'en' ? 'Notify critical system errors' :
                   language === 'fr' ? 'Notifier les erreurs critiques du système' :
                   'Notificar erros críticos do sistema'}
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>
                  {language === 'es' ? 'Actividad Sospechosa' :
                   language === 'en' ? 'Suspicious Activity' :
                   language === 'fr' ? 'Activité Suspecte' :
                   'Atividade Suspeita'}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {language === 'es' ? 'Alertar sobre actividad inusual' :
                   language === 'en' ? 'Alert on unusual activity' :
                   language === 'fr' ? 'Alerter sur toute activité inhabituelle' :
                   'Alertar sobre atividade incomum'}
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
              {language === 'es' ? 'Guardar Configuración' :
               language === 'en' ? 'Save Settings' :
               language === 'fr' ? 'Enregistrer les Paramètres' :
               'Salvar Configurações'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;