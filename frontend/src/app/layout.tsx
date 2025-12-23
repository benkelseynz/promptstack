import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'PromptStack - Premium AI Prompts for Kiwi Professionals',
  description: 'The leading AI prompt library built by Kiwis, for Kiwis. Unlock premium prompts for finance, technology, marketing, and more.',
  keywords: 'AI prompts, New Zealand, business, professional, ChatGPT, Claude, productivity',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-NZ">
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
