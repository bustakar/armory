import type { Metadata } from "next";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { ErrorBoundary } from "@/components/error-boundary";

export const metadata: Metadata = {
  title: "Armory - Developer Survival Game",
  description: "Stake your HP on GitHub activity. Survive or perish.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-black focus:text-[var(--pixel-green)] focus:p-2 focus:border focus:border-[var(--pixel-green)]"
        >
          Skip to main content
        </a>
        <ClerkProvider dynamic>
          <ConvexClientProvider>
            <ErrorBoundary>{children}</ErrorBoundary>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
