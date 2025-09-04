import { Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

const TopBar = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex items-center justify-between p-4 bg-background/95 backdrop-blur-sm border-b border-border/50">
      {/* Logo */}
      <div className="flex items-center">
        <h1 className="text-2xl font-bold yusiop-gradient bg-clip-text text-transparent">
          YUSIOP
        </h1>
      </div>

      {/* Buscador */}
      <div className="flex-1 max-w-md mx-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar música..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 yusiop-input"
          />
        </div>
      </div>

      {/* Perfil */}
      <Button variant="ghost" size="icon" className="rounded-full">
        <User className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default TopBar;