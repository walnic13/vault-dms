import React from 'react';
import { createRoot } from 'react-dom/client';
import DmsBrowser from './DmsBrowser';
import { createHarnessTokenProvider } from './lib/harnessAuth';

// Standalone dev harness. In Vault Origin (and Sigma) the shell mounts the federated
// `dmsApp/DmsBrowser` directly (this main.tsx is NOT used there) and injects its own `getAccessToken`
// + a navSlot. Here we supply a minimal MSAL token provider so dms-dev is testable standalone.
const getAccessToken = createHarnessTokenProvider();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DmsBrowser getAccessToken={getAccessToken} />
  </React.StrictMode>
);
