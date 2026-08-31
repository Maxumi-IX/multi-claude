// Ambient type declarations for the renderer, which is loaded via a plain
// `<script src="renderer.js">` tag (not a Node/CommonJS context - see
// src/shared/types.ts for the full explanation).
//
// This deliberately does NOT `import` from "../shared/types", and does NOT
// wrap the Window augmentation in `declare global { ... }`. Either one would
// give this file a top-level import/export statement, which flips
// TypeScript's module detection for the whole file even under
// `module: "none"`, turning `renderer.ts` back into a "module" and
// reintroducing the `exports` boilerplate that crashes at startup. Because
// this file has neither, it's plain global script scope, so a bare
// `interface X {}` here just merges into the global scope - no import
// needed, and none is possible.
//
// Keep this in sync with the Profile/ElectronAPI shapes in
// ../shared/types.ts (the source of truth for main/preload, which run in
// real Node.js and don't have this restriction).
interface Profile {
  id: string;
  name: string;
  avatar: string | null;
}

interface Window {
  electronAPI: {
    getProfiles: () => Promise<Profile[]>;
    createProfile: (name: string, avatar: string | null) => Promise<Profile[]>;
    editProfile: (
      id: string,
      newName: string,
      avatar: string | null,
    ) => Promise<Profile[]>;
    deleteProfile: (id: string) => Promise<Profile[]>;
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
}
