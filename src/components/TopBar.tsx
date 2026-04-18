const TopBar = () => {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-5 h-14 bg-background/85 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
        <span className="eyebrow text-foreground/80">Yusiop · ed.01</span>
      </div>
      <h1 className="font-display text-base font-bold tracking-tight">
        <span className="gold-text">Y</span>USIOP
      </h1>
      <div className="w-16" />
    </div>
  );
};

export default TopBar;
