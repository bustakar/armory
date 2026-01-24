"use client";

import posthog from "posthog-js";
import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect } from "react";

// Identify user with PostHog when they sign in
export function PostHogIdentify() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (isSignedIn && user) {
      posthog.identify(user.id, {
        username: user.username,
        email: user.primaryEmailAddress?.emailAddress,
      });
    } else if (!isSignedIn) {
      posthog.reset();
    }
  }, [isSignedIn, user]);

  return null;
}
