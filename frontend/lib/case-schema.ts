export type DeceasedGender = "male" | "female";

export type ReferenceMode = "uae_law" | "fiqh";

export type Madhhab = "general" | "hanafi" | "maliki" | "shafii" | "hanbali";

export type HeirRole =
  | "husband"
  | "wife"
  | "father"
  | "mother"
  | "grandfather_paternal"
  | "grandmother_paternal"
  | "grandmother_maternal"
  | "son"
  | "daughter"
  | "sons_son"
  | "sons_daughter"
  | "full_brother"
  | "full_sister"
  | "paternal_brother"
  | "paternal_sister"
  | "maternal_brother"
  | "maternal_sister"
  | "paternal_uncle_full"
  | "paternal_uncle_paternal";

export type AgeStatus = "adult" | "minor";

export interface HeirOption {
  key: HeirRole;
  label: string;
  category: "spouses" | "ascendants" | "descendants" | "siblings" | "uncles";
  multiple: boolean;
  allowedFor?: DeceasedGender | "both";
}

export const HEIR_OPTIONS: HeirOption[] = [
  { key: "husband", label: "الزَّوج", category: "spouses", multiple: false, allowedFor: "female" },
  { key: "wife", label: "الزَّوجة", category: "spouses", multiple: true, allowedFor: "male" },

  { key: "father", label: "الأب", category: "ascendants", multiple: false, allowedFor: "both" },
  { key: "mother", label: "الأم", category: "ascendants", multiple: false, allowedFor: "both" },
  { key: "grandfather_paternal", label: "الجَدّ الصَّحيح", category: "ascendants", multiple: false, allowedFor: "both" },
  { key: "grandmother_paternal", label: "الجَدَّة من جهة الأب", category: "ascendants", multiple: false, allowedFor: "both" },
  { key: "grandmother_maternal", label: "الجَدَّة من جهة الأم", category: "ascendants", multiple: false, allowedFor: "both" },

  { key: "son", label: "الابن", category: "descendants", multiple: true, allowedFor: "both" },
  { key: "daughter", label: "البنت", category: "descendants", multiple: true, allowedFor: "both" },
  { key: "sons_son", label: "ابن الابن", category: "descendants", multiple: true, allowedFor: "both" },
  { key: "sons_daughter", label: "بنت الابن", category: "descendants", multiple: true, allowedFor: "both" },

  { key: "full_brother", label: "الأخ الشقيق", category: "siblings", multiple: true, allowedFor: "both" },
  { key: "full_sister", label: "الأخت الشقيقة", category: "siblings", multiple: true, allowedFor: "both" },
  { key: "paternal_brother", label: "الأخ لأب", category: "siblings", multiple: true, allowedFor: "both" },
  { key: "paternal_sister", label: "الأخت لأب", category: "siblings", multiple: true, allowedFor: "both" },
  { key: "maternal_brother", label: "الأخ لأم", category: "siblings", multiple: true, allowedFor: "both" },
  { key: "maternal_sister", label: "الأخت لأم", category: "siblings", multiple: true, allowedFor: "both" },

  { key: "paternal_uncle_full", label: "العَمّ الشقيق", category: "uncles", multiple: true, allowedFor: "both" },
  { key: "paternal_uncle_paternal", label: "العَمّ لأب", category: "uncles", multiple: true, allowedFor: "both" },
];

export const HEIR_CATEGORY_LABELS: Record<HeirOption["category"], string> = {
  spouses: "الزَّوجيَّة",
  ascendants: "الأصول",
  descendants: "الفروع",
  siblings: "الإخوة والأخوات",
  uncles: "الأعمام",
};

export type EstateAssetType =
  | "financial_amounts"
  | "real_estate"
  | "land"
  | "gold_jewelry"
  | "vehicles"
  | "stocks_investments"
  | "other";

export interface EstateAssetItem {
  id: string;
  type: EstateAssetType;
  customType: string;
  description: string;
  value: number;
}

export interface EstateInput {
  total: number;
  debts: number;
  will: number;
  funeral: number;
  assets: EstateAssetItem[];
}

export interface HeirEntry {
  id: string;
  role: HeirRole;
  name: string;
  dob: string;
}

export interface CaseData {
  deceasedGender: DeceasedGender;
  referenceMode: ReferenceMode;
  madhhab: Madhhab;
  estate: EstateInput;
  heirs: HeirEntry[];
}

export const defaultCaseData: CaseData = {
  deceasedGender: "male",
  referenceMode: "uae_law",
  madhhab: "general",
  estate: {
    total: 0,
    debts: 0,
    will: 0,
    funeral: 0,
    assets: [],
  },
  heirs: [],
};

export interface CalculationValidationIssue {
  code: string;
  message: string;
  field?: string | null;
  heir_id?: string | null;
}

export interface CalculationEstate {
  gross_estate: number;
  funeral: number;
  debts: number;
  requested_will: number;
  allowed_will: number;
  net_estate: number;
  notes: string[];
}

export type CalculationShareType =
  | "fard"
  | "taasib"
  | "fard_and_taasib"
  | "blocked";

export interface CalculationShare {
  heir_id: string;
  name: string;
  role: HeirRole;
  share_type: CalculationShareType;
  fraction: string;
  amount: number;
  percentage: number;
  reason: string;
}

export interface CalculationBlockedHeir {
  heir_id: string;
  name: string;
  role: HeirRole;
  reason: string;
}

export interface CalculationReference {
  source_type: string;
  title: string;
  citation: string;
  note: string;
  url: string;
}

export type CalculationAdjustmentType = "none" | "awl" | "radd";

export interface CalculationAdjustment {
  type: CalculationAdjustmentType;
  applied: boolean;
  shares_total_before: number;
  shares_total_after: number;
  net_estate: number;
  remaining_before: number;
  remaining_after: number;
  ratio: number;
  explanation: string;
}

export const defaultCalculationAdjustment: CalculationAdjustment = {
  type: "none",
  applied: false,
  shares_total_before: 0,
  shares_total_after: 0,
  net_estate: 0,
  remaining_before: 0,
  remaining_after: 0,
  ratio: 1,
  explanation: "",
};

export interface CalculationResponse {
  is_valid: boolean;
  validation_issues: CalculationValidationIssue[];
  estate?: CalculationEstate | null;
  shares: CalculationShare[];
  blocked: CalculationBlockedHeir[];
  notes: string[];
  references: CalculationReference[];
  adjustment: CalculationAdjustment;
}

export interface SavedCaseMeta {
  case_id: string;
  created_at: string;
  share_url: string;
}

export interface SavedCaseInput {
  deceased_gender: DeceasedGender;
  estate: {
    total: number;
    debts: number;
    will: number;
    funeral: number;
    assets: Array<{
      type: EstateAssetType;
      value: number;
      description: string;
      custom_type: string;
    }>;
  };
  heirs: Array<{
    id: string;
    role: HeirRole;
    name: string;
    dob: string;
  }>;
}

export interface SavedCaseResponse {
  meta: SavedCaseMeta;
  input: SavedCaseInput;
  result: CalculationResponse;
}