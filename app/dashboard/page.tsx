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
import { AppShell } from "@/components/app-shell";
import { useUser, UserButton } from "@clerk/nextjs";
import { Id } from "../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";

type Difficulty = "easy" | "medium" | "hard";

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
  const [killCharacterDialog, setKillCharacterDialog] = useState(false);

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
  const voluntaryDeath = useMutation(api.scannerMutations.voluntaryDeath);

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

  const handleCreateCharacter = async (name: string, difficulty: Difficulty) => {
    await createCharacter({ name, difficulty });
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

  const handleKillCharacter = () => {
    setKillCharacterDialog(true);
  };

  const handleConfirmKillCharacter = async () => {
    await voluntaryDeath();
    setKillCharacterDialog(false);
  };

  const handleCancelKillCharacter = () => {
    setKillCharacterDialog(false);
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

  const userNav = (
    <>
      <a
        href={`/u/${githubUsername}`}
        className="text-sm text-[var(--pixel-green)] hover:underline"
        title="View public profile"
      >
        @{githubUsername}
      </a>
      <UserButton afterSignOutUrl="/" />
    </>
  );

  return (
    <AppShell rightNav={userNav} centered={false}>
      <div className="w-full max-w-4xl">
        {/* No character - show creation form */}
        {!character ? (
          <CreateCharacter
            githubUsername={githubUsername}
            onSubmit={handleCreateCharacter}
            isLoading={false}
          />
        ) : (
          <div className="grid md:grid-cols-2 gap-8 pt-8">
            {/* Left column */}
            <div className="space-y-12">
              {/* CHARACTER section */}
              <section>
                <h2 className="text-sm text-gray-400 mb-4">CHARACTER</h2>
                <CharacterCard
                  character={character}
                  activeRepoCount={commitments?.length || 0}
                  avatarUrl={avatarUrl}
                  onKillCharacter={handleKillCharacter}
                />
              </section>

              {/* SETTINGS section */}
              <section>
                <h2 className="text-sm text-gray-400 mb-4">SETTINGS</h2>
                <div className="space-y-4">
                  <RepoSelector
                    repos={reposForSelector}
                    activeRepoNames={activeRepoNames}
                    onActivate={handleActivate}
                    isLoading={isLoadingRepos}
                  />
                  <TokenSettings />
                </div>
              </section>
            </div>

            {/* Right column */}
            <div>
              {/* ACTIVE COMMITMENTS section */}
              <section>
                <h2 className="text-sm text-gray-400 mb-4">
                  ACTIVE COMMITMENTS ({commitments?.length || 0})
                </h2>
                <CommitmentList
                  commitments={commitments || []}
                  onDeactivate={handleDeactivate}
                  onRenew={handleRenew}
                />
              </section>
            </div>
          </div>
        )}

        {/* Graveyard */}
        {graveyard && graveyard.length > 0 && (
          <div className="mt-10">
            <Graveyard characters={graveyard} />
          </div>
        )}
      </div>

      {/* Confirmation Dialog for commitment deactivation */}
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

      {/* Confirmation Dialog for killing character */}
      <ConfirmDialog
        isOpen={killCharacterDialog}
        title="End Character"
        message="Are you sure you want to end this character? This cannot be undone. Your character will be moved to the graveyard."
        confirmText="End Character"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmKillCharacter}
        onCancel={handleCancelKillCharacter}
      />
    </AppShell>
  );
}
