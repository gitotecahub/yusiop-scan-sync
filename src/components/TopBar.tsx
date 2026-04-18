const TopBar = () => {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-5 h-14 bg-background/70 backdrop-blur-xl border-b border-border/60">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full vapor-bg shadow-glow" />
        <span className="eyebrow text-foreground/80">Yusiop</span>
      </div>
      <h1 className="font-display text-base font-bold tracking-tight">
        <span className="vapor-text">Y</span>USIOP
      </h1>
      <div className="w-16" />
    </div>
  );
};

export default TopBar;
