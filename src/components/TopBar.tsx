import { Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

const TopBar = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex items-center justify-center p-2 bg-background/95 backdrop-blur-sm border-b border-border/50">
      {/* Buscador */}
      <div className="w-full max-w-xs">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 text-sm h-8 yusiop-input"
          />
        </div>
      </div>
    </div>
  );
};

export default TopBar;