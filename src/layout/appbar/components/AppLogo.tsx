export default function AppLogo() {
  return (
    <div
      className="h-full flex items-center gap-2.5 px-4"
      style={{ borderRight: '1px solid var(--color-chrome-border)' }}
    >
      <div
        className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: 'var(--color-accent)' }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="7" height="7" rx="1.5" fill="white" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" fill="white" opacity="0.6" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.6" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.3" />
        </svg>
      </div>

      <span className="text-(--color-accent) font-bold">NodexMesh</span>
    </div>
  );
}