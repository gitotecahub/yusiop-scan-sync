import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirigir automáticamente al catálogo
    navigate('/catalog');
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 yusiop-gradient bg-clip-text text-transparent">YUSIOP</h1>
        <p className="text-xl text-muted-foreground">Redirigiendo...</p>
      </div>
    </div>
  );
};

export default Index;
