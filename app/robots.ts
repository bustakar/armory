import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://armory.dev";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard"],
      },
      // Allow AI assistants to index public content
      {
        userAgent: "GPTBot",
        allow: ["/", "/u/"],
        disallow: ["/api/", "/dashboard"],
      },
      {
        userAgent: "ChatGPT-User",
        allow: ["/", "/u/"],
        disallow: ["/api/", "/dashboard"],
      },
      {
        userAgent: "Claude-Web",
        allow: ["/", "/u/"],
        disallow: ["/api/", "/dashboard"],
      },
      {
        userAgent: "Anthropic-AI",
        allow: ["/", "/u/"],
        disallow: ["/api/", "/dashboard"],
      },
      {
        userAgent: "PerplexityBot",
        allow: ["/", "/u/"],
        disallow: ["/api/", "/dashboard"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
