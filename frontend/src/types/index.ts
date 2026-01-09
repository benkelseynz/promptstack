export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
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
  categoryId?: string | null;
  keywords: string[];
  placeholders?: string[];
  isLocked: boolean;
  contextTags?: string[];
}

export interface CustomPrompt {
  id: string;
  title: string;
  content: string;
  keywords: string[];
  industry: string;
  industryName?: string;
  role: string;
  categoryId?: string | null;
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

// Questions Library Types
export interface QuestionCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface Question {
  id: string;
  question: string;
  category: string;
  context: string;
  tags: string[];
  access: 'free' | 'premium';
  isLocked?: boolean;
  categoryId?: string | null;
}

export interface CustomQuestion {
  id: string;
  question: string;
  context: string;
  category: string;
  tags: string[];
  categoryId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Team Types
export type TeamRole = 'owner' | 'admin' | 'member';

export interface TeamMember {
  userId: string;
  name?: string;
  email: string;
  role: TeamRole;
  joinedAt: string;
  invitedBy?: string;
}

export interface TeamCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: string;
  createdBy: string;
}

export interface TeamPromptTag {
  userId: string;
  taggedBy: string;
  taggedAt: string;
  message?: string;
  seen: boolean;
}

export interface TeamPrompt {
  id: string;
  sourceType: 'library' | 'custom';
  sourceId?: string; // Library prompt ID if sourceType is 'library'
  title: string;
  content: string;
  preview?: string;
  categoryId?: string;
  addedBy: string;
  addedAt: string;
  updatedAt?: string;
  notes?: string;
  tags: TeamPromptTag[];
  keywords?: string[];
}

export interface TeamQuestion {
  id: string;
  sourceType: 'library' | 'custom';
  sourceId?: string;
  question: string;
  context?: string;
  categoryId?: string;
  addedBy: string;
  addedByName?: string;
  addedAt: string;
  updatedAt?: string;
  notes?: string;
  notesUpdatedBy?: string;
  notesUpdatedByName?: string;
  notesUpdatedAt?: string;
  tags?: string[]; // Question category tags
  memberTags?: TeamPromptTag[]; // Tags to teammates
}

export interface WorkflowStep {
  id: string;
  order: number;
  type: 'prompt' | 'instruction';
  // For prompt steps
  title?: string;
  content?: string;
  files?: string[]; // List of required file descriptions
  // For instruction steps
  instruction?: string;
}

export interface TeamWorkflow {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  steps: WorkflowStep[];
  sharedWith: 'team' | 'private';
}

export type ActivityType =
  | 'member_joined'
  | 'member_left'
  | 'member_invited'
  | 'member_role_changed'
  | 'prompt_added'
  | 'prompt_removed'
  | 'question_added'
  | 'question_removed'
  | 'workflow_created'
  | 'workflow_updated'
  | 'workflow_deleted'
  | 'prompt_tagged'
  | 'category_created'
  | 'category_deleted';

export interface TeamActivity {
  id: string;
  type: ActivityType;
  actorId: string;
  actorName?: string;
  targetId?: string;
  targetName?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  readBy?: string[];
}

export interface TeamAnalytics {
  overview: {
    totalMembers: number;
    totalPrompts: number;
    totalQuestions: number;
    totalWorkflows: number;
    totalCategories: number;
  };
  trends: {
    promptsAdded30d: number;
    questionsAdded30d: number;
    activitiesThisWeek: number;
    activitiesThisMonth: number;
  };
  activityByType: Record<string, number>;
  topContributors: Array<{
    userId: string;
    name: string;
    count: number;
  }>;
  categoryStats: Array<{
    id: string;
    name: string;
    color: string;
    count: number;
  }>;
  workflowStats: {
    shared: number;
    private: number;
    total: number;
  };
  generatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  code: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  members: TeamMember[];
  categories: TeamCategory[];
  prompts?: TeamPrompt[];
  questions?: TeamQuestion[];
  settings?: {
    allowMemberInvites: boolean;
    requireApproval: boolean;
    defaultRole: TeamRole;
  };
}

export interface TeamSummary {
  id: string;
  name: string;
  code: string;
  role: TeamRole;
  memberCount: number;
  joinedAt: string;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  teamName: string;
  email: string;
  invitedBy: string;
  invitedByName?: string;
  role: TeamRole;
  createdAt: string;
  expiresAt: string;
}

// Personal Workflow Types (for premium users)
export interface WorkflowCategory {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface PersonalWorkflow {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  steps: WorkflowStep[];
}
