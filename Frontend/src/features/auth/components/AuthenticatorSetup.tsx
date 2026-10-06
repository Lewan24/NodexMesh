import { QRCodeSVG } from 'qrcode.react';
import { translate } from '@/shared/i18n';

export default function AuthenticatorSetup({ secret, uri }: { secret: string; uri?: string | null }) {
  return (
    <div className="space-y-2">
      {uri && (
        <>
          <p>{translate('Scan this QR code with your authenticator app.')}</p>
          <QRCodeSVG
            value={uri}
            size={240}
            marginSize={4}
            level="M"
            bgColor="#ffffff"
            fgColor="#000000"
            title={translate('Authenticator setup QR code')}
            role="img"
            aria-label={translate('Authenticator setup QR code')}
            className="h-auto max-w-full"
          />
        </>
      )}
      <p>{translate('Add this secret to your authenticator app as a time-based token:')}</p>
      <code className="block break-all select-all">{secret}</code>
      {uri && (
        <a className="underline" href={uri}>
          {translate('Open in authenticator app')}
        </a>
      )}
      <p>{translate('Issuer: NodexMesh · SHA-1 · 6 digits · 30 seconds')}</p>
    </div>
  );
}
