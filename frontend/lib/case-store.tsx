"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  CaseData,
  DeceasedGender,
  HeirEntry,
  HeirRole,
  EstateAssetItem,
  Madhhab,
  ReferenceMode,
} from "./case-schema";
import { defaultCaseData } from "./case-schema";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export type CalculationResultStore = {
  is_valid?: boolean;
  validation_issues?: Array<{
    code?: string;
    message?: string;
    field?: string | null;
    heir_id?: string | null;
  }>;
  estate?: {
    gross_estate?: number;
    funeral?: number;
    debts?: number;
    requested_will?: number;
    allowed_will?: number;
    net_estate?: number;
    notes?: string[];
  } | null;
  shares?: Array<{
    heir_id?: string;
    name?: string;
    role?: string;
    share_type?: string;
    fraction?: string;
    amount?: number;
    percentage?: number;
    reason?: string;
  }>;
  blocked?: Array<{
    heir_id?: string;
    name?: string;
    role?: string;
    reason?: string;
  }>;
  notes?: string[];
  references?: Array<{
    source_type?: string;
    title?: string;
    citation?: string;
    note?: string;
    url?: string;
  }>;
  adjustment?: {
    type?: string;
    applied?: boolean;
    shares_total_before?: number;
    shares_total_after?: number;
    net_estate?: number;
    remaining_before?: number;
    remaining_after?: number;
    ratio?: number;
    explanation?: string;
  } | null;
} | null;

type CaseStore = {
  data: CaseData;
  calculationResult: CalculationResultStore;

  reset: () => void;

  setDeceasedGender: (g: DeceasedGender) => void;
  setReferenceMode: (mode: ReferenceMode) => void;
  setMadhhab: (madhhab: Madhhab) => void;

  setEstateField: (field: keyof CaseData["estate"], value: number) => void;

  addAsset: () => void;
  updateAsset: (id: string, patch: Partial<Omit<EstateAssetItem, "id">>) => void;
  removeAsset: (id: string) => void;
  syncTotalFromAssets: () => void;

  addHeir: (role: HeirRole) => void;
  updateHeir: (id: string, patch: Partial<Pick<HeirEntry, "name" | "dob">>) => void;
  removeHeir: (id: string) => void;

  setCalculationResult: (result: CalculationResultStore) => void;
  clearCalculationResult: () => void;
};

export const useCaseStore = create<CaseStore>()(
  persist(
    (set, get) => ({
      data: defaultCaseData,
      calculationResult: null,

      reset: () =>
        set({
          data: defaultCaseData,
          calculationResult: null,
        }),

      setDeceasedGender: (g) =>
        set((state) => ({
          data: {
            ...state.data,
            deceasedGender: g,
            heirs: state.data.heirs.filter((h) => {
              if (g === "male" && h.role === "husband") return false;
              if (g === "female" && h.role === "wife") return false;
              return true;
            }),
          },
          calculationResult: null,
        })),

      setReferenceMode: (mode) =>
        set((state) => {
          const nextMadhhab =
            mode === "uae_law" ? "general" : state.data.madhhab;

          return {
            data: {
              ...state.data,
              referenceMode: mode,
              madhhab: nextMadhhab,
            },
            calculationResult: null,
          };
        }),

      setMadhhab: (madhhab) =>
        set((state) => ({
          data: {
            ...state.data,
            madhhab:
              state.data.referenceMode === "uae_law" ? "general" : madhhab,
          },
          calculationResult: null,
        })),

      setEstateField: (field, value) =>
        set((state) => ({
          data: {
            ...state.data,
            estate: {
              ...state.data.estate,
              [field]: Number.isFinite(value) ? value : 0,
            },
          },
          calculationResult: null,
        })),

      addAsset: () =>
        set((state) => ({
          data: {
            ...state.data,
            estate: {
              ...state.data.estate,
              assets: [
                ...state.data.estate.assets,
                {
                  id: uid(),
                  type: "financial_amounts",
                  customType: "",
                  description: "",
                  value: 0,
                },
              ],
            },
          },
          calculationResult: null,
        })),

      updateAsset: (id, patch) =>
        set((state) => ({
          data: {
            ...state.data,
            estate: {
              ...state.data.estate,
              assets: state.data.estate.assets.map((a) =>
                a.id === id ? { ...a, ...patch } : a
              ),
            },
          },
          calculationResult: null,
        })),

      removeAsset: (id) =>
        set((state) => ({
          data: {
            ...state.data,
            estate: {
              ...state.data.estate,
              assets: state.data.estate.assets.filter((a) => a.id !== id),
            },
          },
          calculationResult: null,
        })),

      syncTotalFromAssets: () => {
        const assets = get().data.estate.assets;
        const total = assets.reduce(
          (sum, item) => sum + (Number(item.value) || 0),
          0
        );

        set((state) => ({
          data: {
            ...state.data,
            estate: {
              ...state.data.estate,
              total,
            },
          },
          calculationResult: null,
        }));
      },

      addHeir: (role) =>
        set((state) => {
          const existing = state.data.heirs.filter((h) => h.role === role);

          const singleRoles: HeirRole[] = [
            "husband",
            "father",
            "mother",
            "grandfather_paternal",
            "grandmother_paternal",
            "grandmother_maternal",
          ];

          if (singleRoles.includes(role) && existing.length > 0) {
            return state;
          }

          if (role === "wife" && existing.length >= 4) {
            return state;
          }

          return {
            data: {
              ...state.data,
              heirs: [
                ...state.data.heirs,
                {
                  id: uid(),
                  role,
                  name: "",
                  dob: "",
                },
              ],
            },
            calculationResult: null,
          };
        }),

      updateHeir: (id, patch) =>
        set((state) => ({
          data: {
            ...state.data,
            heirs: state.data.heirs.map((h) =>
              h.id === id ? { ...h, ...patch } : h
            ),
          },
          calculationResult: null,
        })),

      removeHeir: (id) =>
        set((state) => ({
          data: {
            ...state.data,
            heirs: state.data.heirs.filter((h) => h.id !== id),
          },
          calculationResult: null,
        })),

      setCalculationResult: (result) =>
        set({
          calculationResult: result,
        }),

      clearCalculationResult: () =>
        set({
          calculationResult: null,
        }),
    }),
    {
      name: "mirathi-case-store",
      version: 7,
      migrate: (persistedState: any) => {
        const state = persistedState ?? {};

        return {
          ...state,
          data: {
            ...defaultCaseData,
            ...(state.data ?? {}),
            referenceMode:
              state?.data?.referenceMode ?? defaultCaseData.referenceMode,
            madhhab: state?.data?.madhhab ?? defaultCaseData.madhhab,
            estate: {
              ...defaultCaseData.estate,
              ...(state?.data?.estate ?? {}),
              assets:
                state?.data?.estate?.assets ?? defaultCaseData.estate.assets,
            },
            heirs: state?.data?.heirs ?? defaultCaseData.heirs,
          },
          calculationResult: state?.calculationResult ?? null,
        };
      },
    }
  )
);