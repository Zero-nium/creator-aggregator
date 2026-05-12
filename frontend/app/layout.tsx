import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Creator Aggregator",
  description: "Agent-powered content trend dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
