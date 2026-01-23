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
import { useToast } from "@/components/toast";
import { useUser, UserButton } from "@clerk/nextjs";
import { Id } from "../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";

type Difficulty = "easy" | "medium" | "hard";

export default function Dashboard() {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const [repos, setRepos] = useState<Array<{ owner: string; name: string; fullName: string; isPrivate: boolean }>>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [tokenSynced, setTokenSynced] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    commitmentId: string | null;
  }>({ isOpen: false, commitmentId: null });
  const [killCharacterDialog, setKillCharacterDialog] = useState(false);
  const [upgradeDialog, setUpgradeDialog] = useState<{
    isOpen: boolean;
    newDifficulty: "medium" | "hard" | null;
  }>({ isOpen: false, newDifficulty: null });

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
  const upgradeDifficulty = useMutation(api.characters.upgradeDifficulty);

  // Convex actions (server-side GitHub operations)
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
      getOrCreateUser().catch((error) => {
        console.error("Failed to create user:", error);
        showError("Failed to initialize account. Please refresh.");
      });
    }
  }, [clerkUser, user, getOrCreateUser, showError]);

  // Sync GitHub token to Convex (fully server-side - token never reaches client)
  useEffect(() => {
    async function syncToken() {
      if (!clerkUser || !user || tokenSynced) return;

      try {
        // Server-side endpoint handles: Clerk token fetch -> encrypt -> store in Convex
        // Token NEVER touches the client
        const response = await fetch("/api/sync-github", { method: "POST" });
        if (response.ok) {
          setTokenSynced(true);
        } else {
          // Handle specific error cases
          const data = await response.json().catch(() => ({}));
          if (response.status === 404 && data.category === "github") {
            // No GitHub token - user may need to reconnect GitHub
            console.warn("No GitHub token found - user may need to reconnect");
          } else if (response.status !== 401) {
            // Don't show error for auth issues on initial load
            console.error("Token sync failed:", data.error || response.statusText);
          }
        }
      } catch (error) {
        console.error("Failed to sync GitHub token:", error);
      }
    }

    syncToken();
  }, [clerkUser, user, tokenSynced]);

  // Fetch repos via Convex action (server-side, no token exposure)
  const loadRepos = useCallback(async () => {
    if (!tokenSynced) return;

    setIsLoadingRepos(true);
    setRepoError(null);

    try {
      const result = await getUserRepos();
      if (result.success && result.data) {
        setRepos(result.data);
      } else if (result.error) {
        setRepoError(result.error.message);
        if (result.error.category === "RATE_LIMIT") {
          showError("GitHub rate limit exceeded. Please try again later.");
        } else if (result.error.category !== "AUTH") {
          // Don't show auth errors as toasts - they're expected for new users
          showError(result.error.message);
        }
      }
    } catch (error) {
      console.error("Failed to fetch repos:", error);
      setRepoError("Failed to load repositories");
      showError("Failed to load repositories. Please try again.");
    } finally {
      setIsLoadingRepos(false);
    }
  }, [tokenSynced, getUserRepos, showError]);

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
    try {
      await createCharacter({ name, difficulty });
      showSuccess("Character created!");
    } catch (error) {
      console.error("Failed to create character:", error);
      const message = error instanceof Error ? error.message : "Failed to create character";
      showError(message);
    }
  };

  const handleActivate = async (owner: string, repo: string, isPrivate: boolean) => {
    try {
      await activateCommitment({ owner, repo, isPrivate });
      showSuccess(`Committed to ${owner}/${repo}`);
    } catch (error) {
      console.error("Failed to activate commitment:", error);
      const message = error instanceof Error ? error.message : "Failed to activate commitment";
      showError(message);
    }
  };

  const handleDeactivate = async (id: string) => {
    const now = Date.now();
    const commitment = commitments?.find((c: { _id: string; commitmentEndsAt: number }) => c._id === id);
    const isEarlyExit = commitment && now < commitment.commitmentEndsAt;

    if (isEarlyExit) {
      setConfirmDialog({ isOpen: true, commitmentId: id });
      return;
    }

    try {
      await deactivateCommitment({ commitmentId: id as Id<"commitments"> });
      showSuccess("Commitment ended");
    } catch (error) {
      console.error("Failed to deactivate commitment:", error);
      const message = error instanceof Error ? error.message : "Failed to end commitment";
      showError(message);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (confirmDialog.commitmentId) {
      try {
        await deactivateCommitment({
          commitmentId: confirmDialog.commitmentId as Id<"commitments">,
        });
        showSuccess("Commitment ended (early exit penalty applied)");
      } catch (error) {
        console.error("Failed to deactivate commitment:", error);
        const message = error instanceof Error ? error.message : "Failed to end commitment";
        showError(message);
      }
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
    try {
      await voluntaryDeath();
      showSuccess("Character laid to rest");
    } catch (error) {
      console.error("Failed to end character:", error);
      const message = error instanceof Error ? error.message : "Failed to end character";
      showError(message);
    }
    setKillCharacterDialog(false);
  };

  const handleCancelKillCharacter = () => {
    setKillCharacterDialog(false);
  };

  const handleUpgradeDifficulty = (newDifficulty: "medium" | "hard") => {
    setUpgradeDialog({ isOpen: true, newDifficulty });
  };

  const handleConfirmUpgrade = async () => {
    if (upgradeDialog.newDifficulty) {
      try {
        await upgradeDifficulty({ newDifficulty: upgradeDialog.newDifficulty });
        showSuccess(`Difficulty upgraded to ${upgradeDialog.newDifficulty}!`);
      } catch (error) {
        console.error("Failed to upgrade difficulty:", error);
        const message = error instanceof Error ? error.message : "Failed to upgrade difficulty";
        showError(message);
      }
    }
    setUpgradeDialog({ isOpen: false, newDifficulty: null });
  };

  const handleCancelUpgrade = () => {
    setUpgradeDialog({ isOpen: false, newDifficulty: null });
  };

  const handleRenew = async (id: string) => {
    try {
      await renewCommitment({ commitmentId: id as Id<"commitments"> });
      showSuccess("Commitment renewed!");
    } catch (error) {
      console.error("Failed to renew commitment:", error);
      const message = error instanceof Error ? error.message : "Failed to renew commitment";
      showError(message);
    }
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
                  onUpgradeDifficulty={handleUpgradeDifficulty}
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
                    error={repoError}
                    onRetry={loadRepos}
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

      {/* Confirmation Dialog for upgrading difficulty */}
      <ConfirmDialog
        isOpen={upgradeDialog.isOpen}
        title="Upgrade Difficulty"
        message={`This change is permanent and cannot be undone.\n\n${
          upgradeDialog.newDifficulty === "medium"
            ? "Medium difficulty:\n• HP drain: 0.5 per repo/hour (was 0.2)\n• XP multiplier: 2x (was 1x)"
            : "Hard difficulty:\n• HP drain: 1.0 per repo/hour (was 0.2-0.5)\n• XP multiplier: 3x (was 1-2x)"
        }`}
        confirmText={`Upgrade to ${upgradeDialog.newDifficulty?.toUpperCase()}`}
        cancelText="Cancel"
        variant="warning"
        onConfirm={handleConfirmUpgrade}
        onCancel={handleCancelUpgrade}
      />
    </AppShell>
  );
}
