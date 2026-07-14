// Standalone dev-harness MSAL auth (dms-dev/prod only). Never used when the DMS browser is mounted
// in Vault Origin / Sigma — the host injects getAccessToken there. Hardened: the token provider is
// SILENT-ONLY (safe to call on load / in effects — no popup, no page redirect), attempting a
// best-effort SSO from the existing tenant session; interactive sign-in is a SEPARATE call wired to
// a user gesture (harnessSignIn) so browsers never block it and the page never auto-navigates.
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser';
import type { ShellTokenProvider } from './dmsClient';

const CLIENT_ID = import.meta.env.VITE_ENTRA_CLIENT_ID || '';
const TENANT_ID = import.meta.env.VITE_ENTRA_TENANT_ID || '';
const AUTHORITY = import.meta.env.VITE_ENTRA_AUTHORITY || (TENANT_ID ? `https://login.microsoftonline.com/${TENANT_ID}` : '');
const API_SCOPE = import.meta.env.VITE_ENTRA_API_SCOPE || 'api://4e1a1e31-5c20-4480-99e4-098901707d9e/access_as_user';

let pca: PublicClientApplication | null = null;
let ready: Promise<void> | null = null;

function client(): PublicClientApplication | null {
  if (!CLIENT_ID || !AUTHORITY) {
    console.warn('[harnessAuth] VITE_ENTRA_CLIENT_ID / authority not set — standalone auth disabled.');
    return null;
  }
  if (!pca) {
    pca = new PublicClientApplication({
      auth: { clientId: CLIENT_ID, authority: AUTHORITY, redirectUri: window.location.origin },
      cache: { cacheLocation: 'sessionStorage', storeAuthStateInCookie: false },
    });
    ready = pca.initialize().then(() => { pca!.handleRedirectPromise().catch(() => {}); });
  }
  return pca;
}

function account(p: PublicClientApplication): AccountInfo | null {
  const all = p.getAllAccounts();
  return all.length ? all[0] : null;
}

// SILENT-ONLY token provider — never opens a popup or redirects. Safe on load / in effects.
// Returns null when interactive sign-in is required (the harness UI then shows a Sign-in button).
export function createHarnessTokenProvider(): ShellTokenProvider {
  return async () => {
    const p = client();
    if (!p) return null;
    if (ready) { try { await ready; } catch { /* ignore */ } }
    let acct = account(p);
    if (!acct) {
      // Best-effort silent SSO from the existing tenant session (hidden iframe; no UI). May fail
      // (no session / interaction required) — then we return null and defer to harnessSignIn().
      try {
        const r = await p.ssoSilent({ scopes: [API_SCOPE] });
        acct = r.account ?? account(p);
      } catch {
        return null;
      }
    }
    if (!acct) return null;
    try {
      const r = await p.acquireTokenSilent({ scopes: [API_SCOPE], account: acct });
      return r.accessToken;
    } catch {
      return null;
    }
  };
}

// Interactive sign-in — MUST be called from a user gesture (button click). Popup keeps the SPA on
// the page (no full redirect). Returns true on success; the silent provider works afterwards.
export async function harnessSignIn(): Promise<boolean> {
  const p = client();
  if (!p) return false;
  if (ready) { try { await ready; } catch { /* ignore */ } }
  try {
    await p.acquireTokenPopup({ scopes: [API_SCOPE] });
    return true;
  } catch {
    console.warn('[harnessAuth] interactive sign-in failed or was cancelled');
    return false;
  }
}
