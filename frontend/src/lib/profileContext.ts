import type { UserProfile } from '@/types';

/**
 * Context tag types that can be used in prompts
 */
export type ContextTag =
  | 'role'
  | 'company'
  | 'email_style'
  | 'report_style'
  | 'tone'
  | 'full_style';

/**
 * Builds a context string from user profile based on requested tags.
 * Returns an empty string if no relevant profile data exists.
 */
export function buildContextString(
  profile: UserProfile | null | undefined,
  tags: string[]
): string {
  if (!profile || !tags || tags.length === 0) {
    return '';
  }

  const sections: string[] = [];

  // Process each tag
  for (const tag of tags) {
    const section = buildSection(profile, tag);
    if (section) {
      sections.push(section);
    }
  }

  // If no sections have content, return empty string
  if (sections.length === 0) {
    return '';
  }

  // Build the final context block
  const contextContent = sections.join('\n\n');

  return `

---

CONTEXT ABOUT ME (use this to personalise your response):

${contextContent}

---`;
}

/**
 * Builds a single section based on a tag
 */
function buildSection(profile: UserProfile, tag: string): string | null {
  switch (tag) {
    case 'role':
      return buildRoleSection(profile);
    case 'company':
      return buildCompanySection(profile);
    case 'email_style':
      return buildEmailStyleSection(profile);
    case 'report_style':
      return buildReportStyleSection(profile);
    case 'tone':
      return buildToneSection(profile);
    case 'full_style':
      return buildFullStyleSection(profile);
    default:
      return null;
  }
}

/**
 * Build role section: title, company, responsibilities
 */
function buildRoleSection(profile: UserProfile): string | null {
  const parts: string[] = [];

  const { title, company, primaryResponsibilities } = profile.role;

  if (title && company) {
    parts.push(`My role: ${title} at ${company}`);
  } else if (title) {
    parts.push(`My role: ${title}`);
  } else if (company) {
    parts.push(`My company: ${company}`);
  }

  if (primaryResponsibilities) {
    parts.push(`My responsibilities: ${primaryResponsibilities}`);
  }

  return parts.length > 0 ? parts.join('\n') : null;
}

/**
 * Build company section: company description
 */
function buildCompanySection(profile: UserProfile): string | null {
  const { companyDescription, company } = profile.role;

  if (companyDescription) {
    if (company) {
      return `About ${company}: ${companyDescription}`;
    }
    return `About my company: ${companyDescription}`;
  }

  return null;
}

/**
 * Build email style section
 */
function buildEmailStyleSection(profile: UserProfile): string | null {
  const { emailStyle } = profile.writingStyle;

  if (emailStyle) {
    return `My email writing style: ${emailStyle}`;
  }

  return null;
}

/**
 * Build report style section
 */
function buildReportStyleSection(profile: UserProfile): string | null {
  const { reportStyle } = profile.writingStyle;

  if (reportStyle) {
    return `My report/document style: ${reportStyle}`;
  }

  return null;
}

/**
 * Build tone section from communication preferences
 */
function buildToneSection(profile: UserProfile): string | null {
  const { tonePreference, formalityLevel } = profile.communication;

  const parts: string[] = [];

  if (formalityLevel) {
    const formalityMap: Record<string, string> = {
      'casual': 'casual and conversational',
      'balanced': 'professional but approachable',
      'formal': 'formal and traditional',
      'very-formal': 'very formal with precision',
    };
    const formalityDesc = formalityMap[formalityLevel] || formalityLevel;
    parts.push(`Preferred formality: ${formalityDesc}`);
  }

  if (tonePreference) {
    parts.push(`Tone preference: ${tonePreference}`);
  }

  return parts.length > 0 ? parts.join('\n') : null;
}

/**
 * Build full writing style section (all writingStyle fields)
 */
function buildFullStyleSection(profile: UserProfile): string | null {
  const { emailStyle, reportStyle, generalNotes } = profile.writingStyle;

  const parts: string[] = [];

  if (emailStyle) {
    parts.push(`My email style: ${emailStyle}`);
  }

  if (reportStyle) {
    parts.push(`My report style: ${reportStyle}`);
  }

  if (generalNotes) {
    parts.push(`Additional notes: ${generalNotes}`);
  }

  return parts.length > 0 ? parts.join('\n') : null;
}

/**
 * Checks if a prompt has context tags that can be applied
 */
export function hasApplicableContext(
  contextTags: string[] | undefined,
  profile: UserProfile | null | undefined
): boolean {
  if (!contextTags || contextTags.length === 0 || !profile) {
    return false;
  }

  // Check if at least one tag has corresponding profile data
  for (const tag of contextTags) {
    if (hasDataForTag(profile, tag)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if profile has data for a specific tag
 */
function hasDataForTag(profile: UserProfile, tag: string): boolean {
  switch (tag) {
    case 'role':
      return !!(
        profile.role.title ||
        profile.role.company ||
        profile.role.primaryResponsibilities
      );
    case 'company':
      return !!profile.role.companyDescription;
    case 'email_style':
      return !!profile.writingStyle.emailStyle;
    case 'report_style':
      return !!profile.writingStyle.reportStyle;
    case 'tone':
      return !!(
        profile.communication.tonePreference ||
        profile.communication.formalityLevel
      );
    case 'full_style':
      return !!(
        profile.writingStyle.emailStyle ||
        profile.writingStyle.reportStyle ||
        profile.writingStyle.generalNotes
      );
    default:
      return false;
  }
}

/**
 * Check if user's profile is complete enough for personalisation
 */
export function isProfileReadyForPersonalisation(
  profile: UserProfile | null | undefined
): boolean {
  if (!profile) return false;

  // Profile is ready if it's marked as completed (core sections filled)
  return profile.completed;
}
