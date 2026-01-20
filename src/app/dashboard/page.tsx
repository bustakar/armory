"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { CharacterCard } from "@/components/character-card";
import { CommitmentList } from "@/components/commitment-list";
import { RepoSelector } from "@/components/repo-selector";
import { CreateCharacter } from "@/components/create-character";
import { Graveyard } from "@/components/graveyard";
import { getSessionToken, clearSession } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [repos, setRepos] = useState<any[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [userCreated, setUserCreated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Get session token on mount
  useEffect(() => {
    const token = getSessionToken();
    console.log("[Dashboard] Cookie check:", {
      token: token ? `${token.substring(0, 20)}...` : null,
      allCookies: document.cookie
    });
    if (!token) {
      console.log("[Dashboard] No token found, redirecting to /");
      router.push("/");
      return;
    }
    setSessionToken(token);
    setIsInitialized(true);
  }, [router]);

  // Queries - pass sessionToken to all
  const user = useQuery(api.users.getBySession, sessionToken ? { sessionToken } : "skip");
  const character = useQuery(api.characters.get, sessionToken ? { sessionToken } : "skip");
  const commitments = useQuery(api.commitments.getActive, sessionToken ? { sessionToken } : "skip");
  const graveyard = useQuery(api.characters.getGraveyard, sessionToken ? { sessionToken } : "skip");

  // Mutations
  const upsertUser = useMutation(api.users.upsertFromSession);
  const createCharacter = useMutation(api.characters.create);
  const activateCommitment = useMutation(api.commitments.activate);
  const deactivateCommitment = useMutation(api.commitments.deactivate);
  const renewCommitment = useMutation(api.commitments.renew);

  // Create user in DB if needed
  useEffect(() => {
    if (user && "needsCreation" in user && user.needsCreation && sessionToken && !userCreated) {
      setUserCreated(true);
      upsertUser({ sessionToken }).catch(console.error);
    }
  }, [user, sessionToken, upsertUser, userCreated]);

  // Redirect if no user found (after query completes)
  useEffect(() => {
    console.log("[Dashboard] User query state:", { isInitialized, user });
    if (isInitialized && user === null) {
      console.log("[Dashboard] User query returned null, redirecting to /");
      router.push("/");
    }
  }, [isInitialized, user, router]);

  // Fetch repos when user is loaded
  useEffect(() => {
    if (user && user.githubAccessToken && sessionToken) {
      setIsLoadingRepos(true);
      fetch(
        `https://api.github.com/user/repos?per_page=100&sort=updated`,
        {
          headers: {
            Authorization: `Bearer ${user.githubAccessToken}`,
            Accept: "application/vnd.github+json",
          },
        }
      )
        .then((res) => res.json())
        .then((data) => setRepos(Array.isArray(data) ? data : []))
        .catch(console.error)
        .finally(() => setIsLoadingRepos(false));
    }
  }, [user, sessionToken]);

  // Loading state
  if (!isInitialized || !sessionToken || user === undefined || user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--pixel-green)]">Loading...</p>
      </div>
    );
  }

  const handleLogout = () => {
    clearSession();
    router.push("/");
  };

  const handleCreateCharacter = async (name: string) => {
    if (!sessionToken) return;
    await createCharacter({ name, sessionToken });
  };

  const handleActivate = async (owner: string, repo: string) => {
    if (!sessionToken) return;
    await activateCommitment({ owner, repo, sessionToken });
  };

  const handleDeactivate = async (id: string) => {
    if (!sessionToken) return;
    const now = Date.now();
    const commitment = commitments?.find((c) => c._id === id);
    const isEarlyExit = commitment && now < commitment.commitmentEndsAt;

    if (isEarlyExit) {
      if (!confirm("Are you sure? Early exit costs 50 HP!")) {
        return;
      }
    }
    await deactivateCommitment({ commitmentId: id as any, sessionToken });
  };

  const handleRenew = async (id: string) => {
    if (!sessionToken) return;
    await renewCommitment({ commitmentId: id as any, sessionToken });
  };

  const activeRepoNames = (commitments || []).map(
    (c) => `${c.owner}/${c.repo}`
  );

  return (
    <main className="min-h-screen p-4 max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-700">
        <h1 className="text-xl text-[var(--pixel-gold)]">ARMORY</h1>
        <div className="flex items-center gap-4">
          <a
            href={`/u/${user.githubUsername}`}
            className="text-sm text-[var(--pixel-green)] hover:underline"
            title="View public profile"
          >
            @{user.githubUsername}
          </a>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-gray-300"
          >
            Logout
          </button>
        </div>
      </header>

      {/* No character - show creation form */}
      {!character ? (
        <CreateCharacter
          githubUsername={user.githubUsername}
          onSubmit={handleCreateCharacter}
          isLoading={false}
        />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Left column - Character */}
          <div className="space-y-6">
            <CharacterCard
              character={character}
              activeRepoCount={commitments?.length || 0}
              avatarUrl={user.avatarUrl}
            />

            <RepoSelector
              repos={repos}
              activeRepoNames={activeRepoNames}
              onActivate={handleActivate}
              isLoading={isLoadingRepos}
            />
          </div>

          {/* Right column - Commitments */}
          <div className="space-y-6">
            <div>
              <h2 className="text-sm text-gray-400 mb-3">
                ACTIVE COMMITMENTS ({commitments?.length || 0})
              </h2>
              <CommitmentList
                commitments={commitments || []}
                onDeactivate={handleDeactivate}
                onRenew={handleRenew}
              />
            </div>
          </div>
        </div>
      )}

      {/* Graveyard */}
      {graveyard && graveyard.length > 0 && (
        <div className="mt-8">
          <Graveyard characters={graveyard} />
        </div>
      )}

      {/* Game rules */}
      <footer className="mt-12 pt-6 border-t border-gray-800 text-xs text-gray-600">
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <p className="text-gray-500 mb-1">HP Drain</p>
            <p>-0.2 HP/hour per active repo</p>
            <p>~5 HP/day per repo</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Rewards</p>
            <p>Commit: +3 HP, +10 XP</p>
            <p>Issue: +8 HP, +25 XP</p>
            <p>PR: +12 HP, +50 XP</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Commitments</p>
            <p>30-day cycles</p>
            <p>Early exit: -50 HP</p>
            <p>HP = 0? Permadeath.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
