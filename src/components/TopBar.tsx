import NotificationsBell from './NotificationsBell';

const TopBar = () => {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-3 h-14 bg-background/70 backdrop-blur-xl border-b border-border/60">
      <div className="w-12" />
      <h1 className="font-display text-base font-bold tracking-tight">
        <span className="vapor-text">Y</span>USIOP
      </h1>
      <div className="w-12 flex items-center justify-end">
        <NotificationsBell />
      </div>
    </div>
  );
};

export default TopBar;
