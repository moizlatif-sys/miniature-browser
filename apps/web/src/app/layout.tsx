import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Miniature Browser',
  description: 'A small web, and the browser you read it in.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
