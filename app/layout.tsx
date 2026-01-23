import type { Metadata, Viewport } from "next";
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ClerkProvider } from "@clerk/nextjs";
import { ErrorBoundary } from "@/components/error-boundary";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://armory.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Armory - Developer Survival Game",
    template: "%s | Armory",
  },
  description:
    "Stake your HP on GitHub activity. Survive or perish. A gamified productivity tool that turns your commits into XP and inactivity into damage.",
  keywords: [
    "developer productivity",
    "GitHub gamification",
    "coding game",
    "developer tools",
    "commit tracking",
    "survival game",
    "developer motivation",
    "programming challenges",
  ],
  authors: [{ name: "Armory" }],
  creator: "Armory",
  publisher: "Armory",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: "/apple-icon.png",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Armory",
    title: "Armory - Developer Survival Game",
    description:
      "Stake your HP on GitHub activity. Survive or perish. Turn your commits into XP.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Armory - Developer Survival Game",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Armory - Developer Survival Game",
    description:
      "Stake your HP on GitHub activity. Survive or perish. Turn your commits into XP.",
    images: ["/og-image.png"],
    creator: "@armorydev",
  },
  alternates: {
    canonical: siteUrl,
  },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#000000" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
};

// JSON-LD structured data for the site
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Armory",
      description:
        "Stake your HP on GitHub activity. Survive or perish. A gamified productivity tool for developers.",
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${siteUrl}/u/{search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Armory",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icon.png`,
      },
    },
    {
      "@type": "WebApplication",
      "@id": `${siteUrl}/#webapp`,
      name: "Armory",
      url: siteUrl,
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Any",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      description:
        "A gamified productivity tool that turns GitHub commits into XP and inactivity into HP damage. Survive the developer survival game.",
      featureList: [
        "GitHub activity tracking",
        "XP and leveling system",
        "HP survival mechanics",
        "Public profile pages",
        "Streak tracking",
        "Repository commitments",
      ],
    },
  ],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
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
