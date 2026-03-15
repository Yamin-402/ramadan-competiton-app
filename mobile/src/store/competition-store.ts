import { create } from "zustand";
import { competitionApi } from "../api/endpoints/competition.api";
import { getApiErrorMessage } from "../api/client";
import { CompetitionState } from "../types/domain";

interface CompetitionStore {
  state: CompetitionState | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  clear: () => void;
}

export const useCompetitionStore = create<CompetitionStore>((set) => ({
  state: null,
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    try {
      const data = await competitionApi.getState();
      set({ state: data });
    } catch (err) {
      set({ error: getApiErrorMessage(err, "Could not load competition state") });
    } finally {
      set({ loading: false });
    }
  },
  clear: () => set({ state: null, error: null }),
}));
