import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Expensify - Smart Expense Tracker',
  description: 'Track and manage your expenses effortlessly',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100`}>
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}