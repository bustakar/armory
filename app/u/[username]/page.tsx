import type { Metadata } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { PublicProfileContent } from "./content";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://armory.rip";

// Generate dynamic metadata for profile pages
export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;

  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const profile = await convex.query(api.characters.getPublicProfile, { username });

    if (!profile) {
      return {
        title: "Player Not Found",
        description: `No adventurer named @${username} exists in the Armory.`,
        robots: { index: false, follow: false },
      };
    }

    const { user, character } = profile;
    const characterInfo = character
      ? `Level ${character.level} ${character.difficulty?.toUpperCase() || "EASY"} - ${Math.round(character.hp)}/${character.maxHp} HP`
      : "No active character";

    const title = `@${user.githubUsername}'s Profile`;
    const description = character
      ? `${character.name} - ${characterInfo}. ${character.streak > 0 ? `${character.streak} day streak!` : ""} View their adventure in Armory.`
      : `@${user.githubUsername} hasn't started their adventure yet. View their profile in Armory.`;

    return {
      title,
      description,
      alternates: {
        canonical: `${siteUrl}/u/${username}`,
      },
      openGraph: {
        type: "profile",
        title: `${user.githubUsername} | Armory`,
        description,
        url: `${siteUrl}/u/${username}`,
        siteName: "Armory",
        images: [
          {
            url: user.avatarUrl || `${siteUrl}/og-image.png`,
            width: 200,
            height: 200,
            alt: `${user.githubUsername}'s avatar`,
          },
        ],
        username: user.githubUsername,
      },
      twitter: {
        card: "summary",
        title: `@${user.githubUsername} | Armory`,
        description,
        images: [user.avatarUrl || `${siteUrl}/og-image.png`],
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: `@${username}'s Profile`,
      description: "View this player's profile on Armory.",
    };
  }
}

// JSON-LD structured data component
function ProfileJsonLd({
  username,
  avatarUrl,
  character,
}: {
  username: string;
  avatarUrl?: string;
  character?: {
    name: string;
    level: number;
    hp: number;
    maxHp: number;
    streak: number;
    createdAt: number;
  } | null;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: username,
      alternateName: character?.name,
      image: avatarUrl,
      url: `${siteUrl}/u/${username}`,
      sameAs: [`https://github.com/${username}`],
    },
    ...(character && {
      dateCreated: new Date(character.createdAt).toISOString(),
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export default async function PublicProfile({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  // Pre-fetch profile data for JSON-LD
  let profileData: {
    username: string;
    avatarUrl?: string;
    character?: {
      name: string;
      level: number;
      hp: number;
      maxHp: number;
      streak: number;
      createdAt: number;
    } | null;
  } | null = null;

  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const profile = await convex.query(api.characters.getPublicProfile, { username });
    if (profile) {
      profileData = {
        username: profile.user.githubUsername,
        avatarUrl: profile.user.avatarUrl,
        character: profile.character,
      };
    }
  } catch {
    // Continue without profile data for JSON-LD
  }

  return (
    <>
      {profileData && (
        <ProfileJsonLd
          username={profileData.username}
          avatarUrl={profileData.avatarUrl}
          character={profileData.character}
        />
      )}
      <PublicProfileContent username={username} />
    </>
  );
}
