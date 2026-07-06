import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ProfileProvider } from '@/lib/profile-context'

export const metadata: Metadata = {
  title: "M4 Club Tracker",
  description: "M4 Soccer Academy — Club management for coaches and directors",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body><ProfileProvider>{children}</ProfileProvider></body>
    </html>
  );
}
