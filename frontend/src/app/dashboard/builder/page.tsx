'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Wand2,
  Sparkles,
  Mail,
  BarChart2,
  Lightbulb,
  FileText,
  Search,
  Zap,
  ChevronDown,
  ChevronRight,
  Mic,
  MicOff,
  Copy,
  Check,
  RefreshCw,
  History,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Info,
  AlertCircle,
  Brain,
  ArrowRight,
  X,
  Loader2,
  SlidersHorizontal,
  FileUp,
  PenLine,
  HelpCircle,
  MoreHorizontal,
} from 'lucide-react';

// Types for the Prompt Builder
interface GoalCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  technique: string;
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
}

interface PromptVersion {
  id: string;
  content: string;
  timestamp: Date;
  qualityScore: number;
}

interface QualityScore {
  clarity: number;
  completeness: number;
  specificity: number;
  structure: number;
  overall: number;
}

// Goal categories based on research report
const goalCategories: GoalCategory[] = [
  {
    id: 'communication',
    name: 'Communication',
    description: 'Emails, messages, and professional correspondence',
    icon: <Mail className="w-6 h-6" />,
    technique: 'Role-Based + Instructions',
  },
  {
    id: 'analysis',
    name: 'Analysis',
    description: 'Data interpretation, reports, and insights',
    icon: <BarChart2 className="w-6 h-6" />,
    technique: 'Chain-of-Thought + Structured',
  },
  {
    id: 'ideation',
    name: 'Ideation',
    description: 'Brainstorming, planning, and creative thinking',
    icon: <Lightbulb className="w-6 h-6" />,
    technique: 'Tree of Thoughts',
  },
  {
    id: 'documentation',
    name: 'Documentation',
    description: 'Processes, guides, and standard procedures',
    icon: <FileText className="w-6 h-6" />,
    technique: 'Few-Shot + Structured',
  },
  {
    id: 'research',
    name: 'Research',
    description: 'Finding information and synthesising sources',
    icon: <Search className="w-6 h-6" />,
    technique: 'ReAct/Chaining',
  },
  {
    id: 'quick-task',
    name: 'Quick Task',
    description: 'Simple, direct requests with immediate results',
    icon: <Zap className="w-6 h-6" />,
    technique: 'Zero-Shot',
  },
];

// AI Models based on requirements
const aiModels: AIModel[] = [
  // OpenAI
  { id: 'gpt-5.2', name: 'GPT-5.2', provider: 'OpenAI', description: 'Latest flagship model' },
  { id: 'gpt-5.1', name: 'GPT-5.1', provider: 'OpenAI', description: 'Previous generation flagship' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Optimised for speed' },
  // Anthropic
  { id: 'claude-opus-4.5', name: 'Opus 4.5', provider: 'Claude', description: 'Most capable model' },
  { id: 'claude-sonnet-4.5', name: 'Sonnet 4.5', provider: 'Claude', description: 'Balanced performance' },
  { id: 'claude-haiku-4.5', name: 'Haiku 4.5', provider: 'Claude', description: 'Fast and efficient' },
  // xAI
  { id: 'grok-4', name: 'Grok 4', provider: 'Grok', description: 'Real-time knowledge' },
  { id: 'grok-4.1-fast', name: 'Grok 4.1 Fast', provider: 'Grok', description: 'Speed optimised' },
  // Google
  { id: 'gemini-3-pro', name: 'Gemini 3 Pro', provider: 'Gemini', description: 'Pro-tier capabilities' },
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash', provider: 'Gemini', description: 'Ultra-fast responses' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Gemini', description: 'Previous generation' },
  // Other
  { id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'Other', description: 'Advanced reasoning model' },
  { id: 'mistral-large', name: 'Mistral Large', provider: 'Other', description: 'Open-weight leader' },
  { id: 'dont-know', name: "Don't know", provider: 'Other', description: 'Generic prompting' },
];

// Role options for the builder
const roleOptions = [
  'Business Analyst',
  'Project Manager',
  'Marketing Specialist',
  'HR Professional',
  'Finance Manager',
  'Legal Advisor',
  'Sales Representative',
  'Operations Manager',
  'Executive Assistant',
  'Communications Specialist',
  'Data Analyst',
  'Product Manager',
  'Customer Success Manager',
  'Strategy Consultant',
  'Custom Role...',
];

// Output format options
const outputFormats = [
  { id: 'bullets', name: 'Bullet Points', description: 'Concise, scannable list' },
  { id: 'paragraph', name: 'Paragraph', description: 'Flowing narrative text' },
  { id: 'table', name: 'Table', description: 'Structured data rows' },
  { id: 'numbered', name: 'Numbered List', description: 'Sequential steps or items' },
  { id: 'email', name: 'Email Format', description: 'Professional email structure' },
  { id: 'report', name: 'Report Format', description: 'Sections with headings' },
  { id: 'custom', name: 'Custom...', description: 'Specify your own format' },
];

export default function PromptBuilderPage() {
  const { user } = useAuth();

  // Refs
  const existingPromptRef = useRef<HTMLDivElement>(null);
  const promptOutputRef = useRef<HTMLDivElement>(null);

  // State management
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [buildMethod, setBuildMethod] = useState<'form' | 'audio' | null>(null);
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [showExistingPrompt, setShowExistingPrompt] = useState(false);
  const [existingPrompt, setExistingPrompt] = useState('');
  const [isImprovingExisting, setIsImprovingExisting] = useState(false);

  // Builder form state
  const [builderForm, setBuilderForm] = useState({
    role: '',
    customRole: '',
    task: '',
    context: '',
    outputFormat: '',
    customFormat: '',
    // Advanced mode fields
    examples: '',
    constraints: '',
    thinkingMode: false,
    creativity: 50,
  });

  // Quality score state (placeholder)
  const [qualityScore, setQualityScore] = useState<QualityScore | null>(null);

  // Version history (placeholder)
  const [versions, setVersions] = useState<PromptVersion[]>([]);

  // Handle scroll to existing prompt section
  const scrollToExistingPrompt = () => {
    setShowExistingPrompt(true);
    setTimeout(() => {
      existingPromptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Handle scroll to prompt output section (subtle, delayed scroll)
  const scrollToOutput = () => {
    setTimeout(() => {
      promptOutputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 200);
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    if (generatedPrompt) {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Check if ready to generate
  const canGenerate = selectedModel && (
    (buildMethod === 'form' && builderForm.task) ||
    (buildMethod === 'audio')
  );

  // Check if ready to improve existing
  const canImprove = selectedModel && existingPrompt.trim().length > 0;

  // Handle generate prompt (placeholder for Phase 3)
  const handleGenerate = async () => {
    if (!selectedModel) return;

    setIsGenerating(true);
    setIsImprovingExisting(false);

    // Placeholder: In Phase 3, this will call the API
    setTimeout(() => {
      const samplePrompt = `You are an expert ${builderForm.role || 'business professional'} with deep expertise in ${selectedGoal || 'professional tasks'}.

## Context
${builderForm.context || 'The user requires assistance with a professional task.'}

## Task
${builderForm.task || 'Please provide guidance based on the context above.'}

## Output Requirements
- Respond in NZ/UK English
- Avoid using em-dashes
- Format the response as ${builderForm.outputFormat || 'clear, professional text'}
${builderForm.constraints ? `\n## Constraints\n${builderForm.constraints}` : ''}
${builderForm.thinkingMode ? '\n## Thinking Process\nPlease show your reasoning step by step before providing the final answer.' : ''}`;

      setGeneratedPrompt(samplePrompt);
      setQualityScore({
        clarity: 85,
        completeness: 80,
        specificity: 78,
        structure: 90,
        overall: 83,
      });

      // Add to version history
      setVersions(prev => [{
        id: Date.now().toString(),
        content: samplePrompt,
        timestamp: new Date(),
        qualityScore: 83,
      }, ...prev]);

      setIsGenerating(false);
      scrollToOutput();
    }, 1500);
  };

  // Handle improve existing prompt
  const handleImproveExisting = async () => {
    if (!selectedModel || !existingPrompt.trim()) return;

    setIsGenerating(true);
    setIsImprovingExisting(true);

    // Placeholder: In Phase 3, this will call the API
    setTimeout(() => {
      const improvedPrompt = `# Improved Prompt

${existingPrompt}

## Enhancements Applied
- Added clear structure with sections
- Specified output format requirements
- Included NZ/UK English language preference
- Added constraints to avoid common issues

## Output Requirements
- Respond in NZ/UK English
- Avoid using em-dashes
- Provide structured, actionable response`;

      setGeneratedPrompt(improvedPrompt);
      setQualityScore({
        clarity: 92,
        completeness: 88,
        specificity: 85,
        structure: 95,
        overall: 90,
      });

      // Add to version history
      setVersions(prev => [{
        id: Date.now().toString(),
        content: improvedPrompt,
        timestamp: new Date(),
        qualityScore: 90,
      }, ...prev]);

      setIsGenerating(false);
      scrollToOutput();
    }, 1500);
  };

  // Step indicator component
  const StepIndicator = ({ number, title, isActive, isComplete }: {
    number: number;
    title: string;
    isActive: boolean;
    isComplete: boolean;
  }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
        isComplete
          ? 'bg-green-600 text-white'
          : isActive
            ? 'bg-primary-600 text-white'
            : 'bg-gray-200 text-gray-500'
      }`}>
        {isComplete ? <Check className="w-4 h-4" /> : number}
      </div>
      <h2 className={`text-lg font-semibold ${isActive || isComplete ? 'text-gray-900' : 'text-gray-400'}`}>
        {title}
      </h2>
    </div>
  );

  // Render Step 1: Goal Selection
  const renderGoalSelection = () => (
    <section className="mb-10">
      <StepIndicator
        number={1}
        title="What would you like AI to help you with?"
        isActive={true}
        isComplete={!!selectedGoal}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {goalCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedGoal(category.id)}
            className={`card text-left transition-all hover:shadow-md hover:border-primary-300 flex flex-col ${
              selectedGoal === category.id
                ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500'
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                selectedGoal === category.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-primary-100 text-primary-600'
              }`}>
                {category.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 mb-1">{category.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                <span className="text-xs text-primary-600 bg-primary-50 px-2 py-1 rounded-full inline-block">
                  {category.technique}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-500 mt-4 text-center">
        Already have a prompt?{' '}
        <button
          onClick={scrollToExistingPrompt}
          className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1"
        >
          Paste it here to improve
          <ChevronDown className="w-4 h-4" />
        </button>
      </p>
    </section>
  );

  // Render Step 2: Model Selection
  const renderModelSelection = () => {
    const groupedModels = aiModels.reduce((acc, model) => {
      if (!acc[model.provider]) acc[model.provider] = [];
      acc[model.provider].push(model);
      return acc;
    }, {} as Record<string, AIModel[]>);

    // Define provider order to ensure "Other" is last
    const providerOrder = ['OpenAI', 'Claude', 'Grok', 'Gemini', 'Other'];

    return (
      <section className="mb-10">
        <StepIndicator
          number={2}
          title="Which AI model will you use?"
          isActive={!!selectedGoal}
          isComplete={!!selectedModel}
        />

        <div className={`transition-opacity ${selectedGoal ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          <p className="text-sm text-gray-600 mb-4">
            Your prompt will be optimised specifically for the selected model.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {providerOrder.map((provider) => {
              const models = groupedModels[provider] || [];
              if (models.length === 0) return null;

              return (
                <div key={provider} className="space-y-2">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center gap-1">
                    {provider === 'Other' && <MoreHorizontal className="w-3 h-3" />}
                    {provider}
                  </h4>
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => setSelectedModel(model.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all text-sm ${
                        selectedModel === model.id
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                      } ${model.id === 'dont-know' ? 'border-dashed' : ''}`}
                    >
                      <div className="font-medium flex items-center gap-1">
                        {model.id === 'dont-know' && <HelpCircle className="w-3 h-3" />}
                        {model.name}
                      </div>
                      <div className="text-xs text-gray-500">{model.description}</div>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>

          {selectedModel === 'dont-know' && (
            <p className="text-sm text-amber-600 mt-3 flex items-center gap-2">
              <Info className="w-4 h-4" />
              We will generate a generic prompt that works well across most AI systems.
            </p>
          )}
        </div>
      </section>
    );
  };

  // Render Step 3: Build Method Selection and Forms
  const renderBuildMethod = () => (
    <section className="mb-10">
      <StepIndicator
        number={3}
        title="How would you like to build your prompt?"
        isActive={!!selectedModel}
        isComplete={!!buildMethod && (builderForm.task || isRecording)}
      />

      <div className={`transition-opacity ${selectedModel ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
        {/* Method Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setBuildMethod('form')}
            className={`card text-left transition-all hover:shadow-md ${
              buildMethod === 'form'
                ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500'
                : 'hover:border-primary-300'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                buildMethod === 'form' ? 'bg-primary-600 text-white' : 'bg-primary-100 text-primary-600'
              }`}>
                <PenLine className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Fill out the template</h3>
                <p className="text-sm text-gray-600">
                  Use our structured builder to craft your prompt step by step. Ideal for detailed, specific requests.
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setBuildMethod('audio')}
            className={`card text-left transition-all hover:shadow-md ${
              buildMethod === 'audio'
                ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-500'
                : 'hover:border-primary-300'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                buildMethod === 'audio' ? 'bg-primary-600 text-white' : 'bg-primary-100 text-primary-600'
              }`}>
                <Mic className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">Speak your request</h3>
                  <span className="text-xs bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full">New</span>
                </div>
                <p className="text-sm text-gray-600">
                  Just tell us what you need, and we will transform it into a structured prompt.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Form Builder */}
        {buildMethod === 'form' && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900">Prompt Details</h3>
              <button
                onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                <SlidersHorizontal className="w-4 h-4" />
                {isAdvancedMode ? 'Simple Mode' : 'Advanced Mode'}
              </button>
            </div>

            <div className="space-y-5">
              {/* Row 1: Role and Output Format */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Role Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    AI should act as...
                  </label>
                  <select
                    value={builderForm.role}
                    onChange={(e) => setBuilderForm(prev => ({ ...prev, role: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">Select a role...</option>
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                  {builderForm.role === 'Custom Role...' && (
                    <input
                      type="text"
                      value={builderForm.customRole}
                      onChange={(e) => setBuilderForm(prev => ({ ...prev, customRole: e.target.value }))}
                      placeholder="Enter your custom role..."
                      className="input-field mt-2"
                    />
                  )}
                </div>

                {/* Output Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Output format
                  </label>
                  <select
                    value={builderForm.outputFormat}
                    onChange={(e) => setBuilderForm(prev => ({ ...prev, outputFormat: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">Select a format...</option>
                    {outputFormats.map((format) => (
                      <option key={format.id} value={format.id}>{format.name} - {format.description}</option>
                    ))}
                  </select>
                  {builderForm.outputFormat === 'custom' && (
                    <input
                      type="text"
                      value={builderForm.customFormat}
                      onChange={(e) => setBuilderForm(prev => ({ ...prev, customFormat: e.target.value }))}
                      placeholder="Describe your desired format..."
                      className="input-field mt-2"
                    />
                  )}
                </div>
              </div>

              {/* Row 2: Task Input - Full Width */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What do you need? <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={builderForm.task}
                  onChange={(e) => setBuilderForm(prev => ({ ...prev, task: e.target.value }))}
                  placeholder="Describe what you want the AI to help you with..."
                  rows={4}
                  className="input-field resize-none"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500">Be specific about your desired outcome</span>
                  <span className="text-xs text-gray-400">{builderForm.task.length} characters</span>
                </div>
              </div>

              {/* Row 3: Context - Full Width */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background context <span className="text-gray-400 font-normal">(recommended)</span>
                </label>
                <textarea
                  value={builderForm.context}
                  onChange={(e) => setBuilderForm(prev => ({ ...prev, context: e.target.value }))}
                  placeholder="Add relevant background information, audience details, or specific requirements..."
                  rows={3}
                  className="input-field resize-none"
                />
              </div>

              {/* Advanced Mode Fields - Collapsible */}
              {isAdvancedMode && (
                <div className="border-t border-gray-200 pt-5 space-y-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <SlidersHorizontal className="w-4 h-4 text-primary-600" />
                    Advanced Options
                  </div>

                  {/* Row 4: Examples and Constraints */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Examples */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Examples of good output
                      </label>
                      <textarea
                        value={builderForm.examples}
                        onChange={(e) => setBuilderForm(prev => ({ ...prev, examples: e.target.value }))}
                        placeholder="Paste 1-3 examples of the kind of output you want..."
                        rows={4}
                        className="input-field resize-none font-mono text-sm"
                      />
                    </div>

                    {/* Constraints */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Constraints and requirements
                      </label>
                      <textarea
                        value={builderForm.constraints}
                        onChange={(e) => setBuilderForm(prev => ({ ...prev, constraints: e.target.value }))}
                        placeholder="Any limitations, things to avoid, or specific requirements..."
                        rows={4}
                        className="input-field resize-none"
                      />
                    </div>
                  </div>

                  {/* Row 5: Thinking Mode and Creativity */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Thinking Mode Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-primary-600" />
                          <span className="font-medium text-gray-900">Show reasoning</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Enable chain-of-thought for complex analysis
                        </p>
                      </div>
                      <button
                        onClick={() => setBuilderForm(prev => ({ ...prev, thinkingMode: !prev.thinkingMode }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          builderForm.thinkingMode ? 'bg-primary-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            builderForm.thinkingMode ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Creativity Slider */}
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Creativity level: <span className="text-primary-600">{builderForm.creativity}%</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={builderForm.creativity}
                        onChange={(e) => setBuilderForm(prev => ({ ...prev, creativity: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>Precise & Factual</span>
                        <span>Creative & Exploratory</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audio Recording */}
        {buildMethod === 'audio' && (
          <div className="card bg-gradient-to-r from-primary-50 to-white">
            <div className="text-center py-8">
              <button
                onClick={() => setIsRecording(!isRecording)}
                className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-all ${
                  isRecording
                    ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
              >
                {isRecording ? (
                  <MicOff className="w-10 h-10" />
                ) : (
                  <Mic className="w-10 h-10" />
                )}
              </button>

              <p className="mt-4 font-medium text-gray-900">
                {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
              </p>

              {isRecording && (
                <div className="flex justify-center gap-1 mt-4">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div
                      key={i}
                      className="w-1 bg-red-500 rounded-full animate-pulse"
                      style={{
                        height: `${Math.random() * 30 + 10}px`,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              )}

              <p className="text-sm text-gray-500 mt-4 flex items-center justify-center gap-1">
                <Info className="w-4 h-4" />
                Audio is processed using OpenAI Whisper. Your recordings are not stored.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );

  // Render Generate Button
  const renderGenerateButton = () => (
    <div className="flex justify-center mb-10">
      <button
        onClick={handleGenerate}
        disabled={!canGenerate || isGenerating}
        className="btn-primary flex items-center gap-3 px-10 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGenerating && !isImprovingExisting ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-6 h-6" />
            Generate Optimised Prompt
            <ArrowRight className="w-6 h-6" />
          </>
        )}
      </button>
    </div>
  );

  // Render generated prompt output
  const renderPromptOutput = () => {
    if (!generatedPrompt && !isGenerating) return null;

    return (
      <section ref={promptOutputRef} className="card mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-600" />
            <h2 className="font-semibold text-gray-900">
              {isImprovingExisting ? 'Your Improved Prompt' : 'Your Optimised Prompt'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={() => {/* Save to library - Phase 6 */}}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Bookmark className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>

        {isGenerating ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            <span className="ml-3 text-gray-600">
              {isImprovingExisting ? 'Improving your prompt...' : 'Generating your optimised prompt...'}
            </span>
          </div>
        ) : (
          <>
            <div className="bg-gray-50 rounded-lg p-6 mb-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                {generatedPrompt}
              </pre>
            </div>

            {/* Quality Scores */}
            {qualityScore && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Quality Analysis</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: 'Clarity', value: qualityScore.clarity },
                    { label: 'Completeness', value: qualityScore.completeness },
                    { label: 'Specificity', value: qualityScore.specificity },
                    { label: 'Structure', value: qualityScore.structure },
                    { label: 'Overall', value: qualityScore.overall, highlight: true },
                  ].map((score) => (
                    <div
                      key={score.label}
                      className={`p-3 rounded-lg text-center ${
                        score.highlight ? 'bg-primary-100' : 'bg-gray-50'
                      }`}
                    >
                      <div className={`text-2xl font-bold ${
                        score.value >= 80 ? 'text-green-600' :
                        score.value >= 60 ? 'text-amber-600' :
                        'text-gray-400'
                      }`}>
                        {score.value}
                      </div>
                      <div className="text-xs text-gray-600">{score.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback and Actions */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Was this helpful?</span>
                <button className="p-2 hover:bg-green-50 rounded-lg transition-colors">
                  <ThumbsUp className="w-4 h-4 text-gray-400 hover:text-green-600" />
                </button>
                <button className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                  <ThumbsDown className="w-4 h-4 text-gray-400 hover:text-red-600" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                {versions.length > 1 && (
                  <button
                    onClick={() => setShowVersionHistory(true)}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <History className="w-4 h-4" />
                    {versions.length} versions
                  </button>
                )}
                <button
                  onClick={isImprovingExisting ? handleImproveExisting : handleGenerate}
                  className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    );
  };

  // Render refinement zone
  const renderRefinementZone = () => {
    if (!generatedPrompt) return null;

    return (
      <section className="card mb-10">
        <div className="flex items-center gap-2 mb-4">
          <RefreshCw className="w-5 h-5 text-primary-600" />
          <h2 className="font-semibold text-gray-900">Refine Your Prompt</h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button className="p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-gray-50 transition-all text-left">
            <div className="text-sm font-medium text-gray-900">Make it shorter</div>
            <div className="text-xs text-gray-500">More concise version</div>
          </button>
          <button className="p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-gray-50 transition-all text-left">
            <div className="text-sm font-medium text-gray-900">More detailed</div>
            <div className="text-xs text-gray-500">Add specificity</div>
          </button>
          <button className="p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-gray-50 transition-all text-left">
            <div className="text-sm font-medium text-gray-900">Change tone</div>
            <div className="text-xs text-gray-500">Adjust formality</div>
          </button>
          <button className="p-4 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-gray-50 transition-all text-left">
            <div className="text-sm font-medium text-gray-900">Add examples</div>
            <div className="text-xs text-gray-500">Include few-shot</div>
          </button>
        </div>
      </section>
    );
  };

  // Render Existing Prompt Section - Always at bottom
  const renderExistingPromptSection = () => (
    <section ref={existingPromptRef} className="mb-10">
      <button
        onClick={() => setShowExistingPrompt(!showExistingPrompt)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FileUp className="w-5 h-5 text-primary-600" />
          <span className="font-medium text-gray-900">Have an existing prompt to improve?</span>
        </div>
        <ChevronRight className={`w-5 h-5 text-gray-500 transition-transform ${showExistingPrompt ? 'rotate-90' : ''}`} />
      </button>

      {showExistingPrompt && (
        <div className="card mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paste your existing prompt
          </label>
          <textarea
            value={existingPrompt}
            onChange={(e) => setExistingPrompt(e.target.value)}
            placeholder="Paste your current prompt here, and we'll help you improve it..."
            rows={6}
            className="input-field resize-none font-mono text-sm"
          />
          <p className="text-sm text-gray-500 mt-2 mb-4">
            We will analyse your prompt and suggest improvements based on best practices for your selected AI model.
          </p>

          {/* Warning message when prerequisites are missing */}
          {(!selectedGoal || !selectedModel) && existingPrompt.trim().length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700">
                <span>Before improving your prompt, please </span>
                {!selectedGoal && !selectedModel && (
                  <span>
                    <strong>select a category</strong> and <strong>select an AI model</strong>
                  </span>
                )}
                {!selectedGoal && selectedModel && (
                  <span><strong>select a category</strong></span>
                )}
                {selectedGoal && !selectedModel && (
                  <span><strong>select an AI model</strong></span>
                )}
                <span> above.</span>
              </div>
            </div>
          )}

          <button
            onClick={handleImproveExisting}
            disabled={!canImprove || !selectedGoal || isGenerating}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating && isImprovingExisting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Improving...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Improve Prompt
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );

  // Render version history sidebar
  const renderVersionHistory = () => {
    if (versions.length === 0) return null;

    return (
      <div className={`fixed right-0 top-0 h-full w-80 bg-white shadow-xl border-l border-gray-200 transform transition-transform z-40 ${
        showVersionHistory ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary-600" />
              <h3 className="font-semibold text-gray-900">Version History</h3>
            </div>
            <button
              onClick={() => setShowVersionHistory(false)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-60px)]">
          {versions.map((version, index) => (
            <button
              key={version.id}
              onClick={() => {
                setGeneratedPrompt(version.content);
                setShowVersionHistory(false);
              }}
              className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-gray-50 transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900">
                  Version {versions.length - index}
                </span>
                <span className={`text-sm font-bold ${
                  version.qualityScore >= 80 ? 'text-green-600' : 'text-amber-600'
                }`}>
                  {version.qualityScore}%
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {version.timestamp.toLocaleTimeString()}
              </div>
              <div className="text-sm text-gray-600 mt-2 line-clamp-2">
                {version.content.substring(0, 100)}...
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center">
          <Wand2 className="w-7 h-7 text-primary-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Prompt Builder</h1>
          <p className="text-gray-600">Create optimised prompts tailored to your chosen AI model</p>
        </div>
      </div>

      {/* Step 1: Goal Selection */}
      {renderGoalSelection()}

      {/* Step 2: Model Selection */}
      {renderModelSelection()}

      {/* Step 3: Build Method */}
      {renderBuildMethod()}

      {/* Generate Button - Above existing prompt section */}
      {renderGenerateButton()}

      {/* Generated Prompt Output - Only show here if NOT improving existing */}
      {!isImprovingExisting && renderPromptOutput()}

      {/* Refinement Zone - Only show here if NOT improving existing */}
      {!isImprovingExisting && renderRefinementZone()}

      {/* Existing Prompt Section - Always at bottom */}
      {renderExistingPromptSection()}

      {/* Improved Prompt Output - Only show here if improving existing */}
      {isImprovingExisting && renderPromptOutput()}

      {/* Refinement Zone - Only show here if improving existing */}
      {isImprovingExisting && renderRefinementZone()}

      {/* Version History Sidebar */}
      {renderVersionHistory()}

      {/* Version History Toggle Button */}
      {versions.length > 0 && !showVersionHistory && (
        <button
          onClick={() => setShowVersionHistory(true)}
          className="fixed right-4 bottom-4 bg-white shadow-lg rounded-full p-3 border border-gray-200 hover:shadow-xl transition-shadow"
        >
          <History className="w-5 h-5 text-primary-600" />
        </button>
      )}
    </div>
  );
}
