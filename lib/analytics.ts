import posthog from "posthog-js";

export const analytics = {
  // Character events
  characterCreated: (props: { name: string; difficulty: string }) => {
    posthog.capture("character_created", props);
  },
  characterDied: (props: { level: number; daysLived: number; cause: string }) => {
    posthog.capture("character_died", props);
  },

  // Commitment events
  commitmentActivated: (props: { repo: string; isPrivate: boolean }) => {
    posthog.capture("commitment_activated", props);
  },
  commitmentDeactivated: (props: { repo: string; wasEarlyExit: boolean }) => {
    posthog.capture("commitment_deactivated", props);
  },
  commitmentRenewed: (props: { repo: string; renewalCount: number }) => {
    posthog.capture("commitment_renewed", props);
  },

  // Game events
  levelUp: (props: { newLevel: number }) => {
    posthog.capture("level_up", props);
  },
  difficultyUpgraded: (props: { from: string; to: string }) => {
    posthog.capture("difficulty_upgraded", props);
  },

  // Feature usage
  tokenSettingsOpened: () => {
    posthog.capture("token_settings_opened");
  },
  profileViewed: (props: { username: string; isOwnProfile: boolean }) => {
    posthog.capture("profile_viewed", props);
  },
};
