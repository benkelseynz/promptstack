const fs = require('fs');
const path = require('path');
const { getUserById } = require('./userStorage');
const { generateContentStream } = require('./gemini');

// Paths
const PROMPTS_DIR = path.join(__dirname, '../../data/prompts');
const GUIDANCE_DIR = path.join(__dirname, '../builder/prompting-guidance');

// Cache for loaded templates and guidance files
const templateCache = new Map();
const guidanceCache = new Map();

// Goal category definitions with their recommended techniques
const GOAL_TECHNIQUES = {
  communication: {
    name: 'Communication',
    technique: 'Role-Based + Instructions',
    guidance: 'For communication tasks, the prompt should establish a clear professional persona, define the audience, specify tone and formality level, and include formatting expectations (email structure, message length, etc.). Use role-based prompting: "You are a [role] writing to [audience]..."',
  },
  analysis: {
    name: 'Analysis',
    technique: 'Chain-of-Thought + Structured',
    guidance: 'For analysis tasks, the prompt should request step-by-step reasoning, define the analytical framework, specify what data or inputs to consider, and require structured output (sections, tables, numbered findings). Use chain-of-thought: "Analyse this step by step, considering..."',
  },
  ideation: {
    name: 'Ideation',
    technique: 'Tree of Thoughts',
    guidance: 'For ideation tasks, the prompt should encourage exploration of multiple perspectives, request diverse options, and avoid constraining the output too early. Use tree-of-thoughts: "Explore multiple approaches to this problem. For each approach, consider pros, cons, and feasibility..."',
  },
  documentation: {
    name: 'Documentation',
    technique: 'Few-Shot + Structured',
    guidance: 'For documentation tasks, the prompt should specify the document type, target audience, required sections, and formatting standards. Include examples of the desired structure. Use few-shot: provide a brief example of the expected output format.',
  },
  research: {
    name: 'Research',
    technique: 'ReAct/Chaining',
    guidance: 'For research tasks, the prompt should define the research question, specify the scope and depth required, request source evaluation, and structure findings logically. Use chaining: break the research into stages (gather, evaluate, synthesise, recommend).',
  },
  'quick-task': {
    name: 'Quick Task',
    technique: 'Zero-Shot',
    guidance: 'For quick tasks, the prompt should be direct and focused. State exactly what is needed, the desired format, and any constraints. Zero-shot works well here: a clear, single instruction with output specifications.',
  },
};

// Model ID to guidance filename mapping
const MODEL_GUIDANCE_MAP = {
  'gpt-5.2': 'openai-gpt5.2',
  'gpt-5.1': 'openai-gpt5.1',
  'gpt-4o': 'openai-4o',
  'claude-opus-4.5': 'claude-opus4.5',
  'claude-sonnet-4.5': 'claude-sonnet4.5',
  'claude-haiku-4.5': 'claude-haiku4.5',
  'grok-4': 'grok-4',
  'grok-4.1-fast': 'grok-4.1-fast',
  'gemini-3-pro': 'gemini-3-pro',
  'gemini-3-flash': 'gemini-3-flash',
  'gemini-2.5-pro': 'gemini-2.5-pro',
  'deepseek-v3': 'deepseek-v3',
  'mistral-large': 'mistral-large',
  'dont-know': 'generic',
};

// Model display names
const MODEL_NAMES = {
  'gpt-5.2': 'GPT-5.2 (OpenAI)',
  'gpt-5.1': 'GPT-5.1 (OpenAI)',
  'gpt-4o': 'GPT-4o (OpenAI)',
  'claude-opus-4.5': 'Claude Opus 4.5 (Anthropic)',
  'claude-sonnet-4.5': 'Claude Sonnet 4.5 (Anthropic)',
  'claude-haiku-4.5': 'Claude Haiku 4.5 (Anthropic)',
  'grok-4': 'Grok 4 (xAI)',
  'grok-4.1-fast': 'Grok 4.1 Fast (xAI)',
  'gemini-3-pro': 'Gemini 3 Pro (Google)',
  'gemini-3-flash': 'Gemini 3 Flash (Google)',
  'gemini-2.5-pro': 'Gemini 2.5 Pro (Google)',
  'deepseek-v3': 'DeepSeek V3',
  'mistral-large': 'Mistral Large',
  'dont-know': 'Generic / Unknown Model',
};

// Output format labels
const OUTPUT_FORMAT_LABELS = {
  bullets: 'Bullet Points (concise, scannable list)',
  paragraph: 'Paragraph (flowing narrative text)',
  table: 'Table (structured data rows)',
  numbered: 'Numbered List (sequential steps or items)',
  email: 'Email Format (professional email structure)',
  report: 'Report Format (sections with headings)',
};

/**
 * Load a JSON template from data/prompts/
 */
function loadTemplate(templateName) {
  if (templateCache.has(templateName)) {
    return templateCache.get(templateName);
  }

  const filePath = path.join(PROMPTS_DIR, `${templateName}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Template not found: ${templateName}`);
  }

  const template = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  templateCache.set(templateName, template);
  return template;
}

/**
 * Load model-specific guidance from the .txt files
 */
function loadModelGuidance(modelId) {
  const guidanceFile = MODEL_GUIDANCE_MAP[modelId] || 'generic';

  if (guidanceCache.has(guidanceFile)) {
    return guidanceCache.get(guidanceFile);
  }

  const filePath = path.join(GUIDANCE_DIR, `${guidanceFile}.txt`);
  if (!fs.existsSync(filePath)) {
    // Fall back to generic
    const genericPath = path.join(GUIDANCE_DIR, 'generic.txt');
    if (fs.existsSync(genericPath)) {
      const content = fs.readFileSync(genericPath, 'utf8');
      guidanceCache.set(guidanceFile, content);
      return content;
    }
    return '';
  }

  const content = fs.readFileSync(filePath, 'utf8');
  guidanceCache.set(guidanceFile, content);
  return content;
}

/**
 * Build user profile context string from their stored profile (server-side equivalent of frontend's profileContext.ts)
 */
function buildUserProfileContext(profile) {
  if (!profile || !profile.completed) {
    return '';
  }

  const sections = [];

  // Role & company
  if (profile.role) {
    const { title, company, primaryResponsibilities, companyDescription } = profile.role;
    if (title && company) {
      sections.push(`My role: ${title} at ${company}`);
    } else if (title) {
      sections.push(`My role: ${title}`);
    }
    if (primaryResponsibilities) {
      sections.push(`My responsibilities: ${primaryResponsibilities}`);
    }
    if (companyDescription) {
      sections.push(`About my company: ${companyDescription}`);
    }
  }

  // Communication style
  if (profile.communication) {
    const { formalityLevel, tonePreference, phrasesToAvoid } = profile.communication;
    const formalityMap = {
      'casual': 'casual and conversational',
      'balanced': 'professional but approachable',
      'formal': 'formal and traditional',
      'very-formal': 'very formal with precision',
    };
    if (formalityLevel) {
      sections.push(`Preferred formality: ${formalityMap[formalityLevel] || formalityLevel}`);
    }
    if (tonePreference) {
      sections.push(`Tone preference: ${tonePreference}`);
    }
    if (phrasesToAvoid) {
      sections.push(`Phrases to avoid: ${phrasesToAvoid}`);
    }
  }

  // Writing style
  if (profile.writingStyle) {
    const { emailStyle, reportStyle, generalNotes } = profile.writingStyle;
    if (emailStyle) {
      sections.push(`My email style: ${emailStyle}`);
    }
    if (reportStyle) {
      sections.push(`My report style: ${reportStyle}`);
    }
    if (generalNotes) {
      sections.push(`Writing notes: ${generalNotes}`);
    }
  }

  // Formatting preferences
  if (profile.formatting) {
    const { structurePreference, specificRequirements } = profile.formatting;
    if (structurePreference) {
      sections.push(`Structure preference: ${structurePreference}`);
    }
    if (specificRequirements) {
      sections.push(`Formatting requirements: ${specificRequirements}`);
    }
  }

  if (sections.length === 0) {
    return '';
  }

  return `\n**User Profile Context** (incorporate these preferences into the generated prompt where relevant):\n${sections.join('\n')}`;
}

/**
 * Replace template variables with actual values
 */
function assembleMessage(template, variables) {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value || '');
  }

  // Clean up any remaining empty placeholders
  result = result.replace(/\{\{[A-Z_]+\}\}/g, '');

  // Clean up multiple blank lines
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}

/**
 * Build the complete system instruction from a template
 */
function buildSystemInstruction(template, modelId, goalCategory) {
  const modelGuidance = loadModelGuidance(modelId);
  const goalInfo = GOAL_TECHNIQUES[goalCategory] || GOAL_TECHNIQUES['quick-task'];

  const modelGuidanceSection = modelGuidance
    ? `\n## Model-Specific Guidance for ${MODEL_NAMES[modelId] || modelId}\n${modelGuidance}`
    : '';

  const goalSection = `\n## Goal Category: ${goalInfo.name}\n**Recommended Technique:** ${goalInfo.technique}\n${goalInfo.guidance}`;

  return assembleMessage(template.systemInstruction, {
    MODEL_GUIDANCE: modelGuidanceSection,
    GOAL_TECHNIQUE: goalSection,
  });
}

/**
 * Build the user message for form-based generation
 */
function buildFormUserMessage(template, inputs, modelId, goalCategory, userProfile) {
  const goalInfo = GOAL_TECHNIQUES[goalCategory] || GOAL_TECHNIQUES['quick-task'];

  // Build advanced options section
  let advancedOptions = '';
  if (inputs.examples || inputs.constraints || inputs.thinkingMode || inputs.creativity !== undefined) {
    const parts = [];
    if (inputs.examples) {
      parts.push(`**Examples of desired output:**\n${inputs.examples}`);
    }
    if (inputs.constraints) {
      parts.push(`**Constraints/Requirements:**\n${inputs.constraints}`);
    }
    if (inputs.thinkingMode) {
      parts.push('**Thinking Mode:** Enabled - include step-by-step reasoning in the generated prompt');
    }
    if (inputs.creativity !== undefined && inputs.creativity !== 50) {
      const creativityLevel = inputs.creativity < 30 ? 'Low (precise, deterministic)'
        : inputs.creativity < 70 ? 'Medium (balanced)'
        : 'High (creative, exploratory)';
      parts.push(`**Creativity Level:** ${creativityLevel} (${inputs.creativity}/100)`);
    }
    advancedOptions = parts.join('\n\n');
  }

  // Resolve role
  const role = inputs.role === 'Custom Role...' ? (inputs.customRole || 'Professional') : (inputs.role || 'Not specified');

  // Resolve output format
  const outputFormat = inputs.outputFormat === 'custom'
    ? (inputs.customFormat || 'Not specified')
    : (OUTPUT_FORMAT_LABELS[inputs.outputFormat] || inputs.outputFormat || 'Not specified');

  const profileContext = buildUserProfileContext(userProfile);

  return assembleMessage(template.userMessageTemplate, {
    MODEL_NAME: MODEL_NAMES[modelId] || modelId,
    GOAL_CATEGORY: goalInfo.name,
    TECHNIQUE: goalInfo.technique,
    ROLE: role,
    TASK: inputs.task || 'Not specified',
    CONTEXT: inputs.context || 'No additional context provided',
    OUTPUT_FORMAT: outputFormat,
    ADVANCED_OPTIONS: advancedOptions ? `**Advanced Options:**\n${advancedOptions}` : '',
    USER_PROFILE: profileContext,
  });
}

/**
 * Build the user message for freeform/audio generation
 */
function buildFreeformUserMessage(template, freeformInput, modelId, goalCategory, userProfile) {
  const goalInfo = GOAL_TECHNIQUES[goalCategory] || GOAL_TECHNIQUES['quick-task'];
  const profileContext = buildUserProfileContext(userProfile);

  return assembleMessage(template.userMessageTemplate, {
    MODEL_NAME: MODEL_NAMES[modelId] || modelId,
    GOAL_CATEGORY: goalInfo.name,
    TECHNIQUE: goalInfo.technique,
    FREEFORM_INPUT: freeformInput,
    USER_PROFILE: profileContext,
  });
}

/**
 * Build the user message for improving an existing prompt
 */
function buildImproveUserMessage(template, existingPrompt, modelId, goalCategory, userProfile) {
  const goalInfo = GOAL_TECHNIQUES[goalCategory] || GOAL_TECHNIQUES['quick-task'];
  const profileContext = buildUserProfileContext(userProfile);

  return assembleMessage(template.userMessageTemplate, {
    MODEL_NAME: MODEL_NAMES[modelId] || modelId,
    GOAL_CATEGORY: goalInfo.name,
    EXISTING_PROMPT: existingPrompt,
    USER_PROFILE: profileContext,
  });
}

/**
 * Build the user message for refining a prompt
 */
function buildRefineUserMessage(template, currentPrompt, refinementType) {
  const refinementInstruction = template.refinementInstructions[refinementType]
    || `Apply the following refinement: ${refinementType}`;

  return assembleMessage(template.userMessageTemplate, {
    REFINEMENT_INSTRUCTION: refinementInstruction,
    CURRENT_PROMPT: currentPrompt,
  });
}

/**
 * Score prompt quality using heuristic analysis
 */
function scorePromptQuality(promptText) {
  if (!promptText || promptText.length < 20) {
    return { clarity: 30, completeness: 20, specificity: 20, structure: 20, overall: 23 };
  }

  const text = promptText.toLowerCase();
  const lines = promptText.split('\n').filter(l => l.trim());

  // Clarity (0-100): clear language, no ambiguity markers
  let clarity = 60;
  if (promptText.length > 100) clarity += 5;
  if (promptText.length > 300) clarity += 5;
  if (!text.includes('maybe') && !text.includes('perhaps') && !text.includes('might want to')) clarity += 10;
  if (text.includes('you are') || text.includes('act as') || text.includes('your role')) clarity += 10;
  if (lines.length > 3) clarity += 5;
  if (/\b(must|should|ensure|always|never)\b/.test(text)) clarity += 5;
  clarity = Math.min(100, clarity);

  // Completeness (0-100): has role, task, context, constraints, output format
  let completeness = 40;
  if (text.includes('you are') || text.includes('act as') || text.includes('role')) completeness += 12;
  if (text.includes('task') || text.includes('goal') || text.includes('objective')) completeness += 10;
  if (text.includes('context') || text.includes('background')) completeness += 10;
  if (text.includes('constraint') || text.includes('avoid') || text.includes('do not') || text.includes("don't")) completeness += 10;
  if (text.includes('format') || text.includes('output') || text.includes('respond') || text.includes('structure')) completeness += 10;
  if (text.includes('example')) completeness += 8;
  completeness = Math.min(100, completeness);

  // Specificity (0-100): precise language, specific numbers/details
  let specificity = 40;
  if (/\d+/.test(text)) specificity += 10; // Contains numbers
  if (text.includes('specifically') || text.includes('exactly') || text.includes('precise')) specificity += 8;
  if (promptText.length > 200) specificity += 5;
  if (promptText.length > 500) specificity += 5;
  if (text.includes('bullet') || text.includes('section') || text.includes('heading') || text.includes('table')) specificity += 8;
  if (/\b(step \d|first|second|third)\b/.test(text)) specificity += 8;
  if (text.includes('audience') || text.includes('reader') || text.includes('stakeholder')) specificity += 6;
  specificity = Math.min(100, specificity);

  // Structure (0-100): headings, sections, clear organisation
  let structure = 40;
  if (/^#+\s/m.test(promptText)) structure += 15; // Markdown headings
  if (/^\d+\./m.test(promptText)) structure += 10; // Numbered lists
  if (/^[-*]\s/m.test(promptText)) structure += 8; // Bullet lists
  if (lines.length > 5) structure += 5;
  if (lines.length > 10) structure += 5;
  if (promptText.includes('\n\n')) structure += 5; // Paragraph breaks
  if (/\*\*[^*]+\*\*/.test(promptText)) structure += 7; // Bold text
  structure = Math.min(100, structure);

  // Overall weighted average
  const overall = Math.round(
    clarity * 0.25 +
    completeness * 0.30 +
    specificity * 0.25 +
    structure * 0.20
  );

  return {
    clarity: Math.round(clarity),
    completeness: Math.round(completeness),
    specificity: Math.round(specificity),
    structure: Math.round(structure),
    overall,
  };
}

/**
 * Main entry: generate a prompt via streaming
 * Returns an async iterable of text chunks
 */
async function generatePromptStream({ type, inputs, modelId, goalCategory, userId }) {
  // Load user profile for personalisation
  let userProfile = null;
  if (userId) {
    try {
      const user = await getUserById(userId);
      userProfile = user?.profile || null;
    } catch (e) {
      // Continue without profile
    }
  }

  let template, systemInstruction, userMessage;

  if (type === 'form') {
    template = loadTemplate('generate-from-form');
    systemInstruction = buildSystemInstruction(template, modelId, goalCategory);
    userMessage = buildFormUserMessage(template, inputs, modelId, goalCategory, userProfile);
  } else if (type === 'freeform') {
    template = loadTemplate('generate-from-freeform');
    systemInstruction = buildSystemInstruction(template, modelId, goalCategory);
    userMessage = buildFreeformUserMessage(template, inputs.freeformInput, modelId, goalCategory, userProfile);
  } else {
    throw new Error(`Unknown generation type: ${type}`);
  }

  const config = {
    ...template.generationConfig,
    // Adjust temperature based on creativity slider for form inputs
    ...(type === 'form' && inputs.creativity !== undefined ? {
      temperature: 0.3 + (inputs.creativity / 100) * 0.7, // Range: 0.3 to 1.0
    } : {}),
  };

  return generateContentStream({
    prompt: userMessage,
    systemInstruction,
    config,
  });
}

/**
 * Improve an existing prompt via streaming
 */
async function improvePromptStream({ existingPrompt, modelId, goalCategory, userId }) {
  let userProfile = null;
  if (userId) {
    try {
      const user = await getUserById(userId);
      userProfile = user?.profile || null;
    } catch (e) {
      // Continue without profile
    }
  }

  const template = loadTemplate('improve-existing');
  const systemInstruction = buildSystemInstruction(template, modelId, goalCategory);
  const userMessage = buildImproveUserMessage(template, existingPrompt, modelId, goalCategory, userProfile);

  return generateContentStream({
    prompt: userMessage,
    systemInstruction,
    config: template.generationConfig,
  });
}

/**
 * Refine a generated prompt via streaming
 */
async function refinePromptStream({ currentPrompt, refinementType, modelId }) {
  const template = loadTemplate('refine-prompt');
  const userMessage = buildRefineUserMessage(template, currentPrompt, refinementType);

  return generateContentStream({
    prompt: userMessage,
    systemInstruction: template.systemInstruction,
    config: template.generationConfig,
  });
}

/**
 * Clear cached templates and guidance (for development/hot-reload)
 */
function clearCache() {
  templateCache.clear();
  guidanceCache.clear();
}

module.exports = {
  generatePromptStream,
  improvePromptStream,
  refinePromptStream,
  scorePromptQuality,
  clearCache,
};
