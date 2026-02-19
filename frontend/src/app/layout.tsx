import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NotificationProvider, NotificationContainer } from "@/components/NotificationSystem";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nexen — Supply Chain Intelligence",
  description: "Real-time supply chain performance monitoring, AI-powered analytics, and operational intelligence for warehouse logistics.",
  keywords: ["supply chain", "logistics", "dashboard", "analytics", "AI", "warehouse"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <NotificationProvider>
          {children}
          <NotificationContainer />
        </NotificationProvider>
      </body>
    </html>
  );
}
