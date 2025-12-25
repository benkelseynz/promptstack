'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type {
  UserProfile,
  ProfileRole,
  ProfileCommunication,
  ProfileWritingStyle,
  ProfileWorkingStyle,
  ProfileFormatting,
  ProfilePersonal,
} from '@/types';

type SectionName = 'role' | 'communication' | 'writingStyle' | 'workingStyle' | 'formatting' | 'personal';

interface SectionConfig {
  id: SectionName;
  title: string;
  subtitle: string;
  isCore: boolean;
}

const SECTIONS: SectionConfig[] = [
  { id: 'role', title: 'Your Role & Responsibilities', subtitle: 'Help us understand your professional context', isCore: true },
  { id: 'communication', title: 'Communication Style', subtitle: 'How you prefer to communicate', isCore: true },
  { id: 'writingStyle', title: 'Writing Style', subtitle: 'Your writing preferences and patterns', isCore: true },
  { id: 'workingStyle', title: 'Working Style & Workflow', subtitle: 'How you process information and make decisions', isCore: false },
  { id: 'formatting', title: 'Output Formatting', subtitle: 'How you want information presented', isCore: false },
  { id: 'personal', title: 'Personal Context', subtitle: 'Background that shapes your perspective', isCore: false },
];

const INDUSTRIES = [
  'Technology',
  'Finance & Banking',
  'Healthcare',
  'Education',
  'Legal',
  'Marketing & Advertising',
  'Consulting',
  'Manufacturing',
  'Retail & E-commerce',
  'Real Estate',
  'Government',
  'Non-profit',
  'Media & Entertainment',
  'Other',
];

const FORMALITY_LEVELS = [
  { value: 'casual', label: 'Casual', description: 'Friendly, conversational tone' },
  { value: 'balanced', label: 'Balanced', description: 'Professional but approachable' },
  { value: 'formal', label: 'Formal', description: 'Traditional business language' },
  { value: 'very-formal', label: 'Very Formal', description: 'Legal/academic precision' },
];

const ANALYSIS_DEPTHS = [
  { value: 'quick', label: 'Quick & Concise', description: 'Give me the key points fast' },
  { value: 'balanced', label: 'Balanced', description: 'Good detail without overload' },
  { value: 'thorough', label: 'Thorough', description: 'I want comprehensive analysis' },
  { value: 'exhaustive', label: 'Exhaustive', description: 'Leave no stone unturned' },
];

const STRUCTURE_PREFERENCES = [
  { value: 'bullets', label: 'Bullet Points', description: 'Scannable lists' },
  { value: 'paragraphs', label: 'Flowing Paragraphs', description: 'Narrative style' },
  { value: 'mixed', label: 'Mixed', description: 'Paragraphs with bullet summaries' },
  { value: 'structured', label: 'Highly Structured', description: 'Headers, sections, numbered lists' },
];

const INFO_PREFERENCES = [
  'Bottom line first (BLUF)',
  'Context before conclusion',
  'Data-driven with numbers',
  'Narrative storytelling',
  'Pros/cons format',
  'Action-oriented',
];

interface ProfileQuestionnaireProps {
  isModal?: boolean;
  onComplete?: () => void;
  onClose?: () => void;
  initialSection?: number;
}

export default function ProfileQuestionnaire({
  isModal = false,
  onComplete,
  onClose,
  initialSection = 0,
}: ProfileQuestionnaireProps) {
  const { refreshProfileStatus } = useAuth();
  const [currentSection, setCurrentSection] = useState(initialSection);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for each section
  const [roleData, setRoleData] = useState<ProfileRole>({
    title: '',
    company: '',
    companyDescription: '',
    industry: '',
    customIndustry: '',
    primaryResponsibilities: '',
    timeAllocation: '',
    keyStakeholders: '',
  });

  const [communicationData, setCommunicationData] = useState<ProfileCommunication>({
    phrasesToAvoid: '',
    formalityLevel: '',
    tonePreference: '',
    petPeeves: '',
  });

  const [writingStyleData, setWritingStyleData] = useState<ProfileWritingStyle>({
    emailStyle: '',
    reportStyle: '',
    generalNotes: '',
  });

  const [workingStyleData, setWorkingStyleData] = useState<ProfileWorkingStyle>({
    informationPreference: [],
    informationPreferenceNotes: '',
    analysisDepth: '',
    decisionMakingStyle: '',
  });

  const [formattingData, setFormattingData] = useState<ProfileFormatting>({
    structurePreference: '',
    structurePreferenceNotes: '',
    preferTables: '',
    preferBullets: '',
    preferCharts: '',
    specificRequirements: '',
  });

  const [personalData, setPersonalData] = useState<ProfilePersonal>({
    background: '',
    frameworks: '',
    additionalContext: '',
    greatCollaboration: '',
  });

  // Load existing profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { profile } = await api.getProfile();
        if (profile) {
          setRoleData(profile.role);
          setCommunicationData(profile.communication);
          setWritingStyleData(profile.writingStyle);
          setWorkingStyleData(profile.workingStyle);
          setFormattingData(profile.formatting);
          setPersonalData(profile.personal);
        }
      } catch {
        // New user, start with defaults
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const saveCurrentSection = async () => {
    setSaving(true);
    setError(null);

    try {
      const section = SECTIONS[currentSection].id;
      let data: Record<string, unknown>;

      switch (section) {
        case 'role':
          data = roleData;
          break;
        case 'communication':
          data = communicationData;
          break;
        case 'writingStyle':
          data = writingStyleData;
          break;
        case 'workingStyle':
          data = workingStyleData;
          break;
        case 'formatting':
          data = formattingData;
          break;
        case 'personal':
          data = personalData;
          break;
        default:
          throw new Error('Invalid section');
      }

      await api.updateProfileSection(section, data);
      await refreshProfileStatus();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    const saved = await saveCurrentSection();
    if (saved) {
      if (currentSection < SECTIONS.length - 1) {
        setCurrentSection(currentSection + 1);
      } else {
        onComplete?.();
      }
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const handleSkip = () => {
    if (currentSection < SECTIONS.length - 1) {
      setCurrentSection(currentSection + 1);
    } else {
      onComplete?.();
    }
  };

  const handleInfoPreferenceToggle = (pref: string) => {
    setWorkingStyleData(prev => ({
      ...prev,
      informationPreference: prev.informationPreference.includes(pref)
        ? prev.informationPreference.filter(p => p !== pref)
        : [...prev.informationPreference, pref],
    }));
  };

  const section = SECTIONS[currentSection];
  const progress = ((currentSection + 1) / SECTIONS.length) * 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const containerClass = isModal
    ? 'bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col'
    : 'bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden';

  return (
    <div className={containerClass}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{section.title}</h2>
            <p className="text-sm text-gray-500">{section.subtitle}</p>
          </div>
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {currentSection + 1} of {SECTIONS.length}
          </span>
        </div>

        {/* Section indicators */}
        <div className="flex gap-1 mt-3">
          {SECTIONS.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentSection(idx)}
              className={`flex-1 h-1 rounded-full transition-colors ${
                idx === currentSection
                  ? 'bg-primary-600'
                  : idx < currentSection
                  ? 'bg-primary-300'
                  : 'bg-gray-200'
              }`}
              title={s.title}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Section 1: Role */}
        {section.id === 'role' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={roleData.title}
                  onChange={(e) => setRoleData({ ...roleData, title: e.target.value })}
                  placeholder="e.g., Senior Product Manager"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={roleData.company}
                  onChange={(e) => setRoleData({ ...roleData, company: e.target.value })}
                  placeholder="e.g., Acme Corp"
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Industry <span className="text-red-500">*</span>
              </label>
              <select
                value={roleData.industry}
                onChange={(e) => setRoleData({ ...roleData, industry: e.target.value })}
                className="input-field"
              >
                <option value="">Select an industry</option>
                {INDUSTRIES.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
              {roleData.industry === 'Other' && (
                <input
                  type="text"
                  value={roleData.customIndustry}
                  onChange={(e) => setRoleData({ ...roleData, customIndustry: e.target.value })}
                  placeholder="Specify your industry"
                  className="input-field mt-2"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What does your company do?
              </label>
              <textarea
                value={roleData.companyDescription}
                onChange={(e) => setRoleData({ ...roleData, companyDescription: e.target.value })}
                placeholder="Brief description of your company's products/services..."
                className="input-field min-h-[80px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Responsibilities <span className="text-red-500">*</span>
              </label>
              <textarea
                value={roleData.primaryResponsibilities}
                onChange={(e) => setRoleData({ ...roleData, primaryResponsibilities: e.target.value })}
                placeholder="What are your main duties? What outcomes are you responsible for?"
                className="input-field min-h-[100px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                How do you typically spend your time?
              </label>
              <textarea
                value={roleData.timeAllocation}
                onChange={(e) => setRoleData({ ...roleData, timeAllocation: e.target.value })}
                placeholder="e.g., 40% meetings, 30% strategy work, 20% team management, 10% admin..."
                className="input-field min-h-[80px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Key Stakeholders
              </label>
              <textarea
                value={roleData.keyStakeholders}
                onChange={(e) => setRoleData({ ...roleData, keyStakeholders: e.target.value })}
                placeholder="Who do you work with most? (executives, clients, engineers, etc.)"
                className="input-field min-h-[80px]"
              />
            </div>
          </>
        )}

        {/* Section 2: Communication */}
        {section.id === 'communication' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Formality Level <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {FORMALITY_LEVELS.map(level => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setCommunicationData({ ...communicationData, formalityLevel: level.value })}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      communicationData.formalityLevel === level.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{level.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{level.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tone Preferences
              </label>
              <textarea
                value={communicationData.tonePreference}
                onChange={(e) => setCommunicationData({ ...communicationData, tonePreference: e.target.value })}
                placeholder="How would you describe your ideal communication tone? (e.g., direct but warm, data-focused, encouraging...)"
                className="input-field min-h-[80px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Words or Phrases to Avoid
              </label>
              <textarea
                value={communicationData.phrasesToAvoid}
                onChange={(e) => setCommunicationData({ ...communicationData, phrasesToAvoid: e.target.value })}
                placeholder="Any specific jargon, buzzwords, or phrases you dislike? (e.g., 'synergy', 'circle back', 'low-hanging fruit'...)"
                className="input-field min-h-[80px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Communication Pet Peeves
              </label>
              <textarea
                value={communicationData.petPeeves}
                onChange={(e) => setCommunicationData({ ...communicationData, petPeeves: e.target.value })}
                placeholder="What communication habits frustrate you? (e.g., too much small talk, excessive qualifiers, buried leads...)"
                className="input-field min-h-[80px]"
              />
            </div>
          </>
        )}

        {/* Section 3: Writing Style */}
        {section.id === 'writingStyle' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Writing Style <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Describe how you typically write emails. Length, greeting style, sign-off preferences, etc.
              </p>
              <textarea
                value={writingStyleData.emailStyle}
                onChange={(e) => setWritingStyleData({ ...writingStyleData, emailStyle: e.target.value })}
                placeholder="e.g., I keep emails brief with bullet points. I use 'Hi [Name],' as greeting and 'Best,' as sign-off. I front-load the ask or key info..."
                className="input-field min-h-[120px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report/Document Style
              </label>
              <p className="text-xs text-gray-500 mb-2">
                How do you structure longer documents, reports, or presentations?
              </p>
              <textarea
                value={writingStyleData.reportStyle}
                onChange={(e) => setWritingStyleData({ ...writingStyleData, reportStyle: e.target.value })}
                placeholder="e.g., Executive summary first, then supporting details. Heavy use of headings and numbered lists. Data visualizations where possible..."
                className="input-field min-h-[120px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                General Notes
              </label>
              <textarea
                value={writingStyleData.generalNotes}
                onChange={(e) => setWritingStyleData({ ...writingStyleData, generalNotes: e.target.value })}
                placeholder="Any other writing preferences or quirks we should know about?"
                className="input-field min-h-[80px]"
              />
            </div>
          </>
        )}

        {/* Section 4: Working Style */}
        {section.id === 'workingStyle' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How do you prefer information presented?
              </label>
              <p className="text-xs text-gray-500 mb-3">Select all that apply</p>
              <div className="flex flex-wrap gap-2">
                {INFO_PREFERENCES.map(pref => (
                  <button
                    key={pref}
                    type="button"
                    onClick={() => handleInfoPreferenceToggle(pref)}
                    className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                      workingStyleData.informationPreference.includes(pref)
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {pref}
                  </button>
                ))}
              </div>
              <textarea
                value={workingStyleData.informationPreferenceNotes}
                onChange={(e) => setWorkingStyleData({ ...workingStyleData, informationPreferenceNotes: e.target.value })}
                placeholder="Any additional notes on information presentation..."
                className="input-field min-h-[60px] mt-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Analysis Depth
              </label>
              <div className="grid grid-cols-2 gap-3">
                {ANALYSIS_DEPTHS.map(depth => (
                  <button
                    key={depth.value}
                    type="button"
                    onClick={() => setWorkingStyleData({ ...workingStyleData, analysisDepth: depth.value })}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      workingStyleData.analysisDepth === depth.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{depth.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{depth.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Decision-Making Style
              </label>
              <textarea
                value={workingStyleData.decisionMakingStyle}
                onChange={(e) => setWorkingStyleData({ ...workingStyleData, decisionMakingStyle: e.target.value })}
                placeholder="How do you typically approach decisions? What information do you need? Do you prefer options with recommendations, or open-ended exploration?"
                className="input-field min-h-[100px]"
              />
            </div>
          </>
        )}

        {/* Section 5: Formatting */}
        {section.id === 'formatting' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Structure Preference
              </label>
              <div className="grid grid-cols-2 gap-3">
                {STRUCTURE_PREFERENCES.map(pref => (
                  <button
                    key={pref.value}
                    type="button"
                    onClick={() => setFormattingData({ ...formattingData, structurePreference: pref.value })}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      formattingData.structurePreference === pref.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{pref.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{pref.description}</div>
                  </button>
                ))}
              </div>
              <textarea
                value={formattingData.structurePreferenceNotes}
                onChange={(e) => setFormattingData({ ...formattingData, structurePreferenceNotes: e.target.value })}
                placeholder="Any additional formatting notes..."
                className="input-field min-h-[60px] mt-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visual Elements
              </label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tables for data comparison</span>
                  <div className="flex gap-2">
                    {['rarely', 'sometimes', 'often'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFormattingData({ ...formattingData, preferTables: opt })}
                        className={`px-3 py-1 rounded text-sm border transition-colors ${
                          formattingData.preferTables === opt
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Bullet point lists</span>
                  <div className="flex gap-2">
                    {['rarely', 'sometimes', 'often'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFormattingData({ ...formattingData, preferBullets: opt })}
                        className={`px-3 py-1 rounded text-sm border transition-colors ${
                          formattingData.preferBullets === opt
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Diagrams/charts</span>
                  <div className="flex gap-2">
                    {['rarely', 'sometimes', 'often'].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFormattingData({ ...formattingData, preferCharts: opt })}
                        className={`px-3 py-1 rounded text-sm border transition-colors ${
                          formattingData.preferCharts === opt
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specific Requirements
              </label>
              <textarea
                value={formattingData.specificRequirements}
                onChange={(e) => setFormattingData({ ...formattingData, specificRequirements: e.target.value })}
                placeholder="Any specific formatting requirements? (e.g., company templates, accessibility needs, character limits...)"
                className="input-field min-h-[80px]"
              />
            </div>
          </>
        )}

        {/* Section 6: Personal */}
        {section.id === 'personal' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Professional Background
              </label>
              <textarea
                value={personalData.background}
                onChange={(e) => setPersonalData({ ...personalData, background: e.target.value })}
                placeholder="Brief professional history, education, or experiences that shape how you think about problems..."
                className="input-field min-h-[100px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frameworks & Methodologies
              </label>
              <textarea
                value={personalData.frameworks}
                onChange={(e) => setPersonalData({ ...personalData, frameworks: e.target.value })}
                placeholder="What frameworks do you use? (e.g., OKRs, Agile/Scrum, Design Thinking, Six Sigma, specific industry methodologies...)"
                className="input-field min-h-[100px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Context
              </label>
              <textarea
                value={personalData.additionalContext}
                onChange={(e) => setPersonalData({ ...personalData, additionalContext: e.target.value })}
                placeholder="Anything else that would help us understand your context? (Current projects, team size, challenges you're facing...)"
                className="input-field min-h-[100px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What Makes Great Collaboration?
              </label>
              <textarea
                value={personalData.greatCollaboration}
                onChange={(e) => setPersonalData({ ...personalData, greatCollaboration: e.target.value })}
                placeholder="Describe a time when working with an assistant or collaborator was really effective. What made it work?"
                className="input-field min-h-[100px]"
              />
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
        <div>
          {currentSection > 0 && (
            <button
              onClick={handlePrevious}
              className="text-gray-600 hover:text-gray-900 font-medium text-sm"
            >
              Back
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!section.isCore && (
            <button
              onClick={handleSkip}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Skip
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            {currentSection === SECTIONS.length - 1 ? 'Complete' : 'Save & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
