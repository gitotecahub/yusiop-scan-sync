import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
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

      <Card>
        <CardContent className="p-2 sm:p-4">
          <Accordion type="single" collapsible defaultValue="language" className="w-full">
            {/* Language Settings */}
            <AccordionItem value="language">
              <AccordionTrigger className="px-2">
                <div className="flex items-center gap-2 text-left">
                  <Globe className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold">{t('settings.language')}</p>
                    <p className="text-xs text-muted-foreground font-normal">
                      {language === 'es' ? 'Idioma de la interfaz' :
                       language === 'en' ? 'Interface language' :
                       language === 'fr' ? 'Langue de l\'interface' :
                       'Idioma da interface'}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-2">
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
              </AccordionContent>
            </AccordionItem>

            {/* General Settings */}
            <AccordionItem value="general">
              <AccordionTrigger className="px-2">
                <div className="flex items-center gap-2 text-left">
                  <SettingsIcon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold">
                      {language === 'es' ? 'Configuración General' :
                       language === 'en' ? 'General Settings' :
                       language === 'fr' ? 'Paramètres Généraux' :
                       'Configurações Gerais'}
                    </p>
                    <p className="text-xs text-muted-foreground font-normal">
                      {language === 'es' ? 'Configuraciones básicas de la plataforma' :
                       language === 'en' ? 'Basic platform settings' :
                       language === 'fr' ? 'Paramètres de base de la plateforme' :
                       'Configurações básicas da plataforma'}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-2 space-y-4">
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
              </AccordionContent>
            </AccordionItem>

            {/* Database Settings */}
            <AccordionItem value="database">
              <AccordionTrigger className="px-2">
                <div className="flex items-center gap-2 text-left">
                  <Database className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold">Base de Datos</p>
                    <p className="text-xs text-muted-foreground font-normal">
                      Configuraciones relacionadas con la base de datos
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-2 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="backup-frequency">Frecuencia de Respaldo</Label>
                  <select className="w-full p-2 border rounded-md bg-background">
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
              </AccordionContent>
            </AccordionItem>

            {/* Security Settings */}
            <AccordionItem value="security">
              <AccordionTrigger className="px-2">
                <div className="flex items-center gap-2 text-left">
                  <Shield className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold">
                      {language === 'es' ? 'Seguridad' :
                       language === 'en' ? 'Security' :
                       language === 'fr' ? 'Sécurité' :
                       'Segurança'}
                    </p>
                    <p className="text-xs text-muted-foreground font-normal">
                      {language === 'es' ? 'Configuraciones de seguridad y autenticación' :
                       language === 'en' ? 'Security and authentication settings' :
                       language === 'fr' ? 'Paramètres de sécurité et d\'authentification' :
                       'Configurações de segurança e autenticação'}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-2 space-y-4">
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
                       language === 'fr' ? 'Enregistrer les tentativas de acceso e cambios' :
                       'Registrar tentativas de acesso e alterações'}
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Notification Settings */}
            <AccordionItem value="notifications">
              <AccordionTrigger className="px-2">
                <div className="flex items-center gap-2 text-left">
                  <Bell className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold">
                      {language === 'es' ? 'Notificaciones' :
                       language === 'en' ? 'Notifications' :
                       language === 'fr' ? 'Notifications' :
                       'Notificações'}
                    </p>
                    <p className="text-xs text-muted-foreground font-normal">
                      {language === 'es' ? 'Configurar notificaciones del sistema' :
                       language === 'en' ? 'Configure system notifications' :
                       language === 'fr' ? 'Configurer les notifications du système' :
                       'Configurar notificações do sistema'}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-2 space-y-4">
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
              </AccordionContent>
            </AccordionItem>
          </Accordion>
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
  );
};

export default Settings;
