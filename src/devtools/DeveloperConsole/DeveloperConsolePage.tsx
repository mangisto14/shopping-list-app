// src/devtools/DeveloperConsole/DeveloperConsolePage.tsx
// Dev/QA-only. Gated at three independent layers so a broken gate at
// any one of them still isn't reachable in production: App.jsx only
// registers the /dev-settings route when isDevToolsEnabled() passes,
// HeaderMenu2.tsx only shows the menu entry when it passes, and this
// component itself redirects away if it's ever reached another way.
import { Navigate } from 'react-router-dom';
import { isDevToolsEnabled } from '../shared/gate';
import ConsolePanel from './ConsolePanel';

export default function DeveloperConsolePage() {
  if (!isDevToolsEnabled()) {
    return <Navigate to="/" replace />;
  }
  return <ConsolePanel />;
}
