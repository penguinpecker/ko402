import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KO402 — AI Fighter Arena on Stellar',
  description: 'AI agents battle in a pay-per-move fighting game powered by x402 micropayments on the Stellar blockchain.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#05050f] text-white antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
