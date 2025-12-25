export interface User {
  id: string;
  email: string;
  name?: string;
  emailVerified: boolean;
  tier: 'free' | 'professional' | 'enterprise';
  createdAt: string;
}

export interface Prompt {
  id: string;
  title: string;
  content?: string;
  preview: string;
  access: 'free' | 'premium';
  industry: string;
  industryName: string;
  role?: string;
  category?: string;
  keywords: string[];
  placeholders?: string[];
  isLocked: boolean;
}

export interface CustomPrompt {
  id: string;
  title: string;
  content: string;
  keywords: string[];
  industry: string;
  industryName?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface Industry {
  id: string;
  name: string;
  description: string;
  icon: string;
  roles?: string[];
  categories?: string[];
  promptCount: number;
}

export interface PricingTier {
  id: string;
  name: string;
  monthlyPrice: number;
  originalPrice?: number;
  discount?: {
    percentage: number;
    validUntil?: string;
    label?: string;
  };
  features: string[];
  limitations?: string[];
  highlighted?: boolean;
  badge?: string;
}

export interface PricingConfig {
  currency: string;
  currencySymbol: string;
  tiers: PricingTier[];
  annualDiscount: number;
  trialDays: number;
  refundPolicy: string;
}

export interface FilterOptions {
  industries: { id: string; name: string }[];
  roles: string[];
  categories: string[];
  accessLevels: string[];
}

export interface SearchQuery {
  q?: string;
  industry?: string;
  category?: string;
  role?: string;
  access?: 'all' | 'free' | 'premium';
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  prompts: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  details?: { field: string; message: string }[];
}

// Profile Types
export interface ProfileRole {
  title: string;
  company: string;
  companyDescription: string;
  industry: string;
  customIndustry: string;
  primaryResponsibilities: string;
  timeAllocation: string;
  keyStakeholders: string;
}

export interface ProfileCommunication {
  phrasesToAvoid: string;
  formalityLevel: string;
  tonePreference: string;
  petPeeves: string;
}

export interface ProfileWritingStyle {
  emailStyle: string;
  reportStyle: string;
  generalNotes: string;
}

export interface ProfileWorkingStyle {
  informationPreference: string[];
  informationPreferenceNotes: string;
  analysisDepth: string;
  decisionMakingStyle: string;
}

export interface ProfileFormatting {
  structurePreference: string;
  structurePreferenceNotes: string;
  preferTables: string;
  preferBullets: string;
  preferCharts: string;
  specificRequirements: string;
}

export interface ProfilePersonal {
  background: string;
  frameworks: string;
  additionalContext: string;
  greatCollaboration: string;
}

export interface UserProfile {
  completed: boolean;
  completedAt: string | null;
  sectionsCompleted: string[];
  role: ProfileRole;
  communication: ProfileCommunication;
  writingStyle: ProfileWritingStyle;
  workingStyle: ProfileWorkingStyle;
  formatting: ProfileFormatting;
  personal: ProfilePersonal;
}

export interface ProfileSection {
  name: string;
  completed: boolean;
  isCore: boolean;
}

export interface ProfileStatus {
  completed: boolean;
  completedAt: string | null;
  sectionsCompleted: string[];
  sections: ProfileSection[];
  completionPercentage: number;
}
