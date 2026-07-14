import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import DmsBrowser from './DmsBrowser';
import { createHarnessTokenProvider, harnessSignIn } from './lib/harnessAuth';

// Standalone dev harness. In Vault Origin (and Sigma) the shell mounts the federated
// `dmsApp/DmsBrowser` directly (this file is NOT used there) and injects its own getAccessToken +
// navSlot. Here: a silent-first auth gate (no auto-popup / no redirect) — signed-in users pass
// through via SSO; otherwise a click-to-sign-in button (user gesture, never blocked).
function HarnessRoot() {
  const getAccessToken = useMemo(() => createHarnessTokenProvider(), []);
  const [state, setState] = useState<'checking' | 'signedout' | 'ready'>('checking');
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    let live = true;
    getAccessToken().then((t) => { if (live) setState(t ? 'ready' : 'signedout'); });
    return () => { live = false; };
  }, [getAccessToken]);

  if (state === 'ready') return <DmsBrowser getAccessToken={getAccessToken} />;

  return (
    <div className="h-screen w-full flex items-center justify-center bg-theo-bg font-sans text-theo-ink2">
      {state === 'checking' ? (
        <span className="text-sm text-theo-ink3">Connecting to Vault DMS…</span>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <span className="text-sm text-theo-ink3">Sign in to browse your Vault DMS files.</span>
          <button
            type="button"
            disabled={signingIn}
            onClick={async () => {
              setSigningIn(true);
              const ok = await harnessSignIn();
              setSigningIn(false);
              if (ok) setState('ready');
            }}
            className="px-4 py-2 rounded-lg bg-theo-coral text-white text-sm font-semibold hover:bg-theo-coralDk disabled:opacity-60"
          >
            {signingIn ? 'Signing in…' : 'Sign in'}
          </button>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HarnessRoot />
  </React.StrictMode>
);
