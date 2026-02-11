import { create } from 'zustand';
import type { Vault, DecryptedSecret, DecryptedFolder, Tag } from '../types';

interface VaultState {
  vaults: Vault[];
  currentVault: Vault | null;
  secrets: DecryptedSecret[];
  folders: DecryptedFolder[];
  currentFolder: string | null;
  selectedSecret: DecryptedSecret | null;
  searchQuery: string;
  isLoading: boolean;
  // Phase 1 additions
  tags: Tag[];
  archivedSecrets: DecryptedSecret[];
  deletedSecrets: DecryptedSecret[];
  activeTags: string[];

  setVaults: (vaults: Vault[]) => void;
  setCurrentVault: (vault: Vault | null) => void;
  setSecrets: (secrets: DecryptedSecret[]) => void;
  setFolders: (folders: DecryptedFolder[]) => void;
  setCurrentFolder: (folderId: string | null) => void;
  setSelectedSecret: (secret: DecryptedSecret | null) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
  addSecret: (secret: DecryptedSecret) => void;
  updateSecret: (id: string, updates: Partial<DecryptedSecret>) => void;
  removeSecret: (id: string) => void;
  clearVault: () => void;
  // Phase 1 setters
  setTags: (tags: Tag[]) => void;
  setArchivedSecrets: (secrets: DecryptedSecret[]) => void;
  setDeletedSecrets: (secrets: DecryptedSecret[]) => void;
  setActiveTags: (tagIds: string[]) => void;
  toggleActiveTag: (tagId: string) => void;
}

export const useVaultStore = create<VaultState>((set) => ({
  vaults: [],
  currentVault: null,
  secrets: [],
  folders: [],
  currentFolder: null,
  selectedSecret: null,
  searchQuery: '',
  isLoading: false,
  tags: [],
  archivedSecrets: [],
  deletedSecrets: [],
  activeTags: [],

  setVaults: (vaults) => set({ vaults }),
  setCurrentVault: (currentVault) => set({ currentVault }),
  setSecrets: (secrets) => set({ secrets }),
  setFolders: (folders) => set({ folders }),
  setCurrentFolder: (currentFolder) => set({ currentFolder }),
  setSelectedSecret: (selectedSecret) => set({ selectedSecret }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setLoading: (isLoading) => set({ isLoading }),

  addSecret: (secret) =>
    set((state) => ({ secrets: [secret, ...state.secrets] })),

  updateSecret: (id, updates) =>
    set((state) => ({
      secrets: state.secrets.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
      selectedSecret:
        state.selectedSecret?.id === id
          ? { ...state.selectedSecret, ...updates }
          : state.selectedSecret,
    })),

  removeSecret: (id) =>
    set((state) => ({
      secrets: state.secrets.filter((s) => s.id !== id),
      selectedSecret:
        state.selectedSecret?.id === id ? null : state.selectedSecret,
    })),

  clearVault: () =>
    set({
      currentVault: null,
      secrets: [],
      folders: [],
      currentFolder: null,
      selectedSecret: null,
    }),

  setTags: (tags) => set({ tags }),
  setArchivedSecrets: (archivedSecrets) => set({ archivedSecrets }),
  setDeletedSecrets: (deletedSecrets) => set({ deletedSecrets }),
  setActiveTags: (activeTags) => set({ activeTags }),
  toggleActiveTag: (tagId) =>
    set((state) => ({
      activeTags: state.activeTags.includes(tagId)
        ? state.activeTags.filter((id) => id !== tagId)
        : [...state.activeTags, tagId],
    })),
}));
