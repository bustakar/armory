import type { MetadataRoute } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://armory.rip";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
  ];

  // Dynamic profile pages from Convex
  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const users = await convex.query(api.users.getAllUsernames);

    const profilePages: MetadataRoute.Sitemap = users.map((user) => ({
      url: `${baseUrl}/u/${user.username}`,
      lastModified: new Date(user.createdAt),
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));

    return [...staticPages, ...profilePages];
  } catch (error) {
    console.error("Failed to fetch users for sitemap:", error);
    // Return static pages only if Convex fails
    return staticPages;
  }
}
