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
