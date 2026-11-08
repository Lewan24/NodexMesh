import Brand from '@/features/branding/Brand';
export default function AppLogo() {
  return (
    <div
      className="app-logo h-full flex items-center px-4"
      style={{ borderRight: '1px solid var(--color-chrome-border)' }}
    >
      <Brand chrome />
    </div>
  );
}
