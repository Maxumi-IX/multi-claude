// Shared types between the main process and the preload bridge - both are
// genuine CommonJS modules that run in real Node.js, so plain `import type`
// works fine here.
//
// The renderer does NOT import this file. It's loaded via a plain
// `<script src="renderer.js">` tag in a browser context with no `exports`
// object, so renderer.ts (and anything it depends on) must have zero
// top-level `import`/`export` statements, or TypeScript's `module: node16`
// emit (needed here so main/preload compile to real CommonJS) adds an
// `Object.defineProperty(exports, ...)` header that crashes at startup.
// Renderer-side equivalents of Profile/ElectronAPI are declared separately,
// as plain globals with no import, in src/renderer/global.d.ts.
export interface Profile {
  id: string;
  name: string;
  avatar: string | null;
}

export interface ElectronAPI {
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
}

// Makes `window.electronAPI` (set up by preload.ts via contextBridge) known
// to TypeScript wherever this file is part of the compilation.
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
