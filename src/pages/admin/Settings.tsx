import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, Save, Database, Shield, Bell } from 'lucide-react';

const Settings = () => {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración del Sistema</h1>
        <p className="text-muted-foreground">
          Configura los parámetros generales de la plataforma
        </p>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <SettingsIcon className="h-5 w-5" />
              <span>Configuración General</span>
            </CardTitle>
            <CardDescription>
              Configuraciones básicas de la plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="platform-name">Nombre de la Plataforma</Label>
              <Input id="platform-name" defaultValue="YUSIOP" />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="contact-email">Email de Contacto</Label>
              <Input id="contact-email" type="email" placeholder="admin@yusiop.com" />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Registros Públicos</Label>
                <p className="text-sm text-muted-foreground">
                  Permitir registro de nuevos usuarios
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Modo Mantenimiento</Label>
                <p className="text-sm text-muted-foreground">
                  Activar modo mantenimiento para la plataforma
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