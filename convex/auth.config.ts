const authConfig = {
  providers: [
    {
      // Clerk JWT issuer domain - configured on Convex Dashboard
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};

export default authConfig;
