// Type declarations for Module Federation remote modules.
// `mini` exposes './app' as its default export (see mini/metro.config.js).
declare module 'mini/app' {
  import type React from 'react';
  const MiniApp: React.ComponentType;
  export default MiniApp;
}
