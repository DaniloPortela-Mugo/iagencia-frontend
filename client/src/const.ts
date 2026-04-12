// client/src/const.ts
export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// helpers
function env(name: string) {
  return (import.meta as any).env?.[name] as string | undefined;
}

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = env("VITE_OAUTH_PORTAL_URL") || window.location.origin;
  const appId = env("VITE_APP_ID") || "dev";

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  // garante URL válida mesmo se vier sem http/https
  const base =
    oauthPortalUrl.startsWith("http://") || oauthPortalUrl.startsWith("https://")
      ? oauthPortalUrl
      : `https://${oauthPortalUrl}`;

  const url = new URL("/app-auth", base);

  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
