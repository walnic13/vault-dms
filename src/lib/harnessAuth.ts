// Standalone dev-harness MSAL token provider (mirrors sigma/src/lib/harnessAuth.ts and vault-origin
// entraAuth). ONLY used when the DMS browser runs standalone on dms-dev/prod. When mounted inside
// Vault Origin (or Sigma), the host injects its own getAccessToken and this module is never imported
// by the mount path.
import { PublicClientApplication, InteractionRequiredAuthError, AccountInfo } from '@azure/msal-browser';
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

export function createHarnessTokenProvider(): ShellTokenProvider {
  return async () => {
    const p = client();
    if (!p) return null;
    if (ready) { try { await ready; } catch { /* ignore */ } }
    const acct = account(p);
    try {
      if (acct) {
        const r = await p.acquireTokenSilent({ scopes: [API_SCOPE], account: acct });
        return r.accessToken;
      }
      const r = await p.acquireTokenPopup({ scopes: [API_SCOPE] });
      return r.accessToken;
    } catch (e) {
      if (e instanceof InteractionRequiredAuthError) {
        try { const r = await p.acquireTokenPopup({ scopes: [API_SCOPE] }); return r.accessToken; } catch { return null; }
      }
      console.warn('[harnessAuth] token acquisition failed');
      return null;
    }
  };
}
