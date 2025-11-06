const TopBar = () => {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center p-4 bg-background/95 backdrop-blur-sm border-b border-border/50">
      <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
        Yusiop
      </h1>
    </div>
  );
};

export default TopBar;