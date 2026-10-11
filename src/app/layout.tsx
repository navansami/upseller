import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Upseller · Fairmont The Palm",
  description: "Your personal upsell companion at Fairmont The Palm.",
  appleWebApp: { capable: true, title: "Upseller" },
};
export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#121212",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
