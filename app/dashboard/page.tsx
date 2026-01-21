"use client";

import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CharacterCard } from "@/components/character-card";
import { CommitmentList } from "@/components/commitment-list";
import { RepoSelector } from "@/components/repo-selector";
import { CreateCharacter } from "@/components/create-character";
import { Graveyard } from "@/components/graveyard";
import { TokenSettings } from "@/components/token-settings";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useUser, UserButton } from "@clerk/nextjs";
import { Id } from "../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const [repos, setRepos] = useState<Array<{ owner: string; name: string; fullName: string; isPrivate: boolean }>>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [tokenSynced, setTokenSynced] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    commitmentId: string | null;
  }>({ isOpen: false, commitmentId: null });

  // Convex queries
  const user = useQuery(api.users.get);
  const character = useQuery(api.characters.get);
  const commitments = useQuery(api.commitments.getActive);
  const graveyard = useQuery(api.characters.getGraveyard);

  // Convex mutations
  const getOrCreateUser = useMutation(api.users.getOrCreate);
  const createCharacter = useMutation(api.characters.create);
  const activateCommitment = useMutation(api.commitments.activate);
  const deactivateCommitment = useMutation(api.commitments.deactivate);
  const renewCommitment = useMutation(api.commitments.renew);

  // Convex actions (server-side GitHub operations)
  const syncGitHubToken = useAction(api.githubActions.syncGitHubToken);
  const getUserRepos = useAction(api.githubActions.getUserRepos);

  // Redirect if not signed in
  useEffect(() => {
    if (isClerkLoaded && !clerkUser) {
      router.push("/");
    }
  }, [isClerkLoaded, clerkUser, router]);

  // Create user in Convex DB when signed in
  useEffect(() => {
    if (clerkUser && user === null) {
      getOrCreateUser();
    }
  }, [clerkUser, user, getOrCreateUser]);

  // Sync GitHub token to Convex (token is passed once, then stored server-side)
  useEffect(() => {
    async function syncToken() {
      if (!clerkUser || !user || tokenSynced) return;

      try {
        // Fetch GitHub token from Clerk via our API route
        const response = await fetch("/api/github-token");
        if (response.ok) {
          const data = await response.json();
          if (data.token) {
            // Pass token to Convex action - it will be stored server-side
            // Token is NOT stored in React state
            await syncGitHubToken({ token: data.token });
            setTokenSynced(true);
          }
        }
      } catch {
        console.error("Failed to sync GitHub token");
      }
    }

    syncToken();
  }, [clerkUser, user, tokenSynced, syncGitHubToken]);

  // Fetch repos via Convex action (server-side, no token exposure)
  const loadRepos = useCallback(async () => {
    if (!tokenSynced) return;

    setIsLoadingRepos(true);
    try {
      const repoList = await getUserRepos();
      setRepos(repoList);
    } catch {
      console.error("Failed to fetch repos");
    } finally {
      setIsLoadingRepos(false);
    }
  }, [tokenSynced, getUserRepos]);

  useEffect(() => {
    loadRepos();
  }, [loadRepos]);

  // Loading state
  if (!isClerkLoaded || !clerkUser || user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--pixel-green)]">Loading...</p>
      </div>
    );
  }

  const handleCreateCharacter = async (name: string) => {
    await createCharacter({ name });
  };

  const handleActivate = async (owner: string, repo: string, isPrivate: boolean) => {
    await activateCommitment({ owner, repo, isPrivate });
  };

  const handleDeactivate = async (id: string) => {
    const now = Date.now();
    const commitment = commitments?.find((c: { _id: string; commitmentEndsAt: number }) => c._id === id);
    const isEarlyExit = commitment && now < commitment.commitmentEndsAt;

    if (isEarlyExit) {
      setConfirmDialog({ isOpen: true, commitmentId: id });
      return;
    }
    await deactivateCommitment({ commitmentId: id as Id<"commitments"> });
  };

  const handleConfirmDeactivate = async () => {
    if (confirmDialog.commitmentId) {
      await deactivateCommitment({
        commitmentId: confirmDialog.commitmentId as Id<"commitments">,
      });
    }
    setConfirmDialog({ isOpen: false, commitmentId: null });
  };

  const handleCancelDeactivate = () => {
    setConfirmDialog({ isOpen: false, commitmentId: null });
  };

  const handleRenew = async (id: string) => {
    await renewCommitment({ commitmentId: id as Id<"commitments"> });
  };

  const activeRepoNames = (commitments || []).map(
    (c: { owner: string; repo: string }) => `${c.owner}/${c.repo}`
  );

  const githubUsername = user?.githubUsername || clerkUser.username || "user";
  const avatarUrl = user?.avatarUrl || clerkUser.imageUrl;

  // Transform repos for RepoSelector component
  const reposForSelector = repos.map((r) => ({
    owner: { login: r.owner },
    name: r.name,
    full_name: r.fullName,
    isPrivate: r.isPrivate,
  }));

  return (
    <main id="main" className="min-h-screen p-4 max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-gray-700">
        <h1 className="text-xl text-[var(--pixel-gold)]">ARMORY</h1>
        <div className="flex items-center gap-4">
          <a
            href={`/u/${githubUsername}`}
            className="text-sm text-[var(--pixel-green)] hover:underline"
            title="View public profile"
          >
            @{githubUsername}
          </a>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* No character - show creation form */}
      {!character ? (
        <CreateCharacter
          githubUsername={githubUsername}
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
              avatarUrl={avatarUrl}
            />

            <RepoSelector
              repos={reposForSelector}
              activeRepoNames={activeRepoNames}
              onActivate={handleActivate}
              isLoading={isLoadingRepos}
            />

            <TokenSettings />
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

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Early Exit Warning"
        message="Are you sure? Early exit costs 50 HP!"
        confirmText="Exit (-50 HP)"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmDeactivate}
        onCancel={handleCancelDeactivate}
      />
    </main>
  );
}
