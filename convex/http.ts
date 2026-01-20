import { httpRouter } from "convex/server";
import { handleGitHubCallback } from "./auth";

const http = httpRouter();

// GitHub OAuth callback
http.route({
  path: "/auth/github/callback",
  method: "GET",
  handler: handleGitHubCallback,
});

export default http;
