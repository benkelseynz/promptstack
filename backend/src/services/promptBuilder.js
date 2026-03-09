const fs = require('fs');
const path = require('path');
const { getUserById } = require('./userStorage');
const { generateContentStream, generateContent } = require('./gemini');

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
    guidance: `For COMMUNICATION tasks, generate a prompt that produces polished, audience-appropriate professional communication.

## Required Prompt Structure for Communication
The generated prompt MUST include these elements:

1. COMMUNICATOR ROLE: Define a specific professional persona relevant to the communication type. Include their seniority level, domain, and relationship to the audience. Example: "You are a Senior Product Manager at a B2B SaaS company, writing to your enterprise client base."

2. AUDIENCE DEFINITION: Explicitly state who will receive this communication. Include:
   - Their role/level (e.g., C-suite, team members, external clients, general public)
   - Their familiarity with the topic (expert, informed, or unfamiliar)
   - Their likely concerns or priorities
   - The relationship dynamic (peer, superior, subordinate, external)

3. COMMUNICATION PARAMETERS: Specify:
   - Channel/format (email, Slack message, letter, presentation script, announcement)
   - Tone and register (formal, professional-casual, empathetic, authoritative, persuasive)
   - Length expectations (word count or paragraph count)
   - The desired outcome (inform, persuade, request action, build relationship, deliver news)

4. CONTENT STRUCTURE: Define the structure appropriate to the format:
   - For emails: subject line, greeting, body sections, call-to-action, sign-off
   - For messages: key point first, supporting detail, next steps
   - For announcements: headline, context, details, impact, action items
   - For presentations: opening hook, agenda, key messages, closing

5. CONSTRAINTS: Include:
   - Topics or phrases to avoid
   - Sensitivity considerations
   - Brand voice or style guide requirements
   - Any required inclusions (disclaimers, links, dates)

## Example Skeleton
---
You are a [specific role] at [type of organisation], writing a [format] to [audience].

Context: [situation requiring this communication]

Draft a [format] that:
- Opens with [specific opening approach]
- Covers these key points: [numbered list]
- Closes with [specific call-to-action or sign-off]

Tone: [specific tone]. Length: [specific length].
Audience context: [what they know/care about]

Constraints:
- [specific constraint]
- [specific constraint]
---`,
  },
  analysis: {
    name: 'Analysis',
    technique: 'Chain-of-Thought + Structured Output',
    guidance: `For ANALYSIS tasks, generate a prompt that enforces structured, step-by-step reasoning with evidence-based conclusions.

## Required Prompt Structure for Analysis
The generated prompt MUST include these elements:

1. ANALYST ROLE: Define a specific analytical persona with domain expertise relevant to the task. Include years of experience and specialisation. Example: "You are a senior data analyst with 12 years of experience in e-commerce conversion optimisation, specialising in cohort analysis and A/B test interpretation."

2. ANALYTICAL FRAMEWORK: Specify the methodology to use. Select the most appropriate from:
   - SWOT analysis (strengths, weaknesses, opportunities, threats)
   - Root cause analysis (5 Whys, fishbone diagram structure)
   - Comparative analysis (define dimensions, scoring criteria)
   - Trend analysis (time periods, metrics, patterns to identify)
   - Cost-benefit analysis (quantify factors, define thresholds)
   - Risk assessment (likelihood, impact, mitigation strategies)
   - Gap analysis (current state vs desired state)
   If the user did not specify a framework, select the most appropriate one based on the task description and state it explicitly in the prompt.

3. CHAIN-OF-THOUGHT INSTRUCTION: Explicitly instruct the model to:
   - State assumptions before beginning analysis
   - Work through the analysis step by step
   - Show reasoning for each conclusion
   - Distinguish between facts, inferences, and recommendations
   - Quantify findings where possible; avoid vague qualifiers like "significant" without numbers

4. INPUT SPECIFICATION: Clearly delimit what data, documents, or information should be analysed. Use clear markers or sections for input data.

5. OUTPUT STRUCTURE: Require a structured output with:
   - Executive summary (2-3 sentences maximum)
   - Detailed findings (numbered, with supporting evidence or reasoning)
   - Confidence levels where appropriate (high/medium/low with justification)
   - Actionable recommendations ranked by priority or impact
   - Limitations or caveats

6. QUALITY GATES: Include instructions like:
   - "If data is insufficient for a conclusion, state what additional information would be needed rather than guessing"
   - "Support each finding with specific evidence or reasoning, not general statements"
   - "Distinguish between correlation and causation"

## Example Skeleton
---
You are a [specific analyst role] with expertise in [domain].

Analyse the following [data/situation/document]:
[input area or description]

Use [specific framework] methodology. Work through your analysis step by step:
1. State your key assumptions
2. [First analytical step]
3. [Second analytical step]
4. Synthesise findings and identify patterns

Present your findings in this structure:
## Executive Summary
[3 sentences maximum]
## Key Findings
[Numbered, with confidence level for each]
## Risks or Concerns
## Recommendations
[Prioritised by impact]
## Limitations
[What this analysis cannot tell us]

Constraints: [specific constraints]
---`,
  },
  ideation: {
    name: 'Ideation',
    technique: 'Tree of Thoughts',
    guidance: `For IDEATION tasks, generate a prompt that produces diverse, well-explored creative options with structured evaluation.

## Required Prompt Structure for Ideation
The generated prompt MUST include these elements:

1. CREATIVE EXPERT ROLE: Define a persona suited to the ideation domain. Include breadth of experience and creative methodology expertise. Example: "You are a senior innovation consultant who has facilitated design thinking workshops for Fortune 500 companies, with expertise in lateral thinking and systematic creativity methods."

2. PROBLEM FRAMING: Clearly state the challenge or opportunity being explored. Include:
   - The core problem or question to solve
   - Why existing approaches are insufficient (if applicable)
   - The broader goal the ideas should serve

3. TREE-OF-THOUGHTS INSTRUCTION: Structure the creative exploration:
   - "Explore at least [N] fundamentally different approaches to this challenge"
   - "For each approach, develop the idea enough to evaluate its feasibility"
   - "Consider unconventional or contrarian approaches, not just obvious solutions"
   - "Cross-pollinate: after generating initial ideas, look for ways to combine the strongest elements"

4. EVALUATION CRITERIA: Define how ideas should be assessed. Include at least 3 criteria such as:
   - Feasibility (can it be implemented with available resources?)
   - Impact (how much does it move the needle on the core problem?)
   - Novelty (does it offer something genuinely different from existing approaches?)
   - Speed to implement (can it be done quickly, or is it a long-term play?)
   - Risk (what could go wrong, and how severe would it be?)

5. CONSTRAINTS ON THE SOLUTION SPACE: Specify boundaries:
   - Budget, timeline, or resource constraints
   - Technical or platform limitations
   - Brand, regulatory, or audience constraints
   - What is explicitly NOT in scope

6. OUTPUT FORMAT: Require structured ideation output:
   - Each idea as a distinct section with a descriptive title
   - Brief description (2-3 sentences)
   - How it works (key steps or mechanics)
   - Pros and cons
   - Evaluation against the stated criteria
   - A final "Top Recommendation" section with rationale

## Example Skeleton
---
You are a [creative expert role] with expertise in [domain].

Challenge: [clear problem statement]
Context: [why this matters, what has been tried]

Generate [N] distinct approaches to this challenge. For each approach:
1. Give it a descriptive title
2. Describe the core idea (2-3 sentences)
3. Explain how it would work in practice
4. List pros and cons
5. Rate it on: feasibility, impact, novelty (high/medium/low)

Constraints:
- [budget/timeline/resource constraints]
- [technical constraints]

After presenting all options, recommend the strongest approach with a clear rationale for why it best balances the evaluation criteria.
---`,
  },
  documentation: {
    name: 'Documentation',
    technique: 'Few-Shot + Structured',
    guidance: `For DOCUMENTATION tasks, generate a prompt that produces clear, well-organised, audience-appropriate documentation.

## Required Prompt Structure for Documentation
The generated prompt MUST include these elements:

1. DOCUMENTATION SPECIALIST ROLE: Define an expert in the relevant documentation type. Example: "You are a senior technical writer with 10 years of experience creating API documentation, user guides, and SOPs for enterprise software platforms."

2. DOCUMENT TYPE AND PURPOSE: Specify exactly what kind of document is needed:
   - Standard Operating Procedure (SOP)
   - User guide or manual
   - API documentation
   - Process documentation
   - Policy document
   - Meeting notes or minutes
   - Training material
   - Knowledge base article

3. TARGET READER: Define who will use this document:
   - Technical level (expert, intermediate, beginner)
   - Role (developer, end user, manager, auditor)
   - What they need from the document (learn, reference, comply, troubleshoot)

4. REQUIRED SECTIONS: List the sections the document must contain. Be specific:
   - For SOPs: purpose, scope, responsibilities, prerequisites, step-by-step procedure, exceptions, revision history
   - For user guides: overview, getting started, features, troubleshooting, FAQ
   - For API docs: endpoint, method, parameters, request/response examples, error codes
   - For policies: purpose, scope, definitions, policy statements, compliance, exceptions

5. FEW-SHOT EXAMPLE: Include a brief example of the expected format and style. This calibrates the output quality and consistency. The example should show:
   - The heading style and hierarchy
   - The level of detail expected
   - The tone and voice
   - How steps, warnings, or notes should be formatted

6. FORMATTING STANDARDS: Specify:
   - Heading hierarchy and numbering style
   - How to handle warnings, notes, and tips
   - Code or technical content formatting
   - Length or section count expectations
   - Whether to include a table of contents

## Example Skeleton
---
You are a [documentation specialist role] with expertise in [domain].

Create a [document type] for [subject].

Target reader: [who, their technical level, what they need]

Required sections:
1. [Section name] - [what it should contain]
2. [Section name] - [what it should contain]
3. [Section name] - [what it should contain]

Style and format:
- Use [heading style]
- Level of detail: [specific enough that a reader could follow without asking questions]
- Tone: [clear, professional, instructional]
- Format warnings and important notes as: [format specification]

Example of the expected style:
[brief example showing format, tone, and detail level]

Constraints:
- [length, compliance, branding constraints]
---`,
  },
  research: {
    name: 'Research',
    technique: 'ReAct/Chaining',
    guidance: `For RESEARCH tasks, generate a prompt that produces structured, thorough research with clear methodology and well-organised findings.

## Required Prompt Structure for Research
The generated prompt MUST include these elements:

1. RESEARCHER ROLE: Define a research specialist with relevant domain expertise. Example: "You are a senior market research analyst with expertise in competitive intelligence for the SaaS industry, experienced in synthesising qualitative and quantitative sources."

2. RESEARCH QUESTION: State the core research question clearly and precisely. A good research question is:
   - Specific enough to be answerable
   - Broad enough to produce useful insights
   - Clearly scoped (time period, geography, industry, etc.)

3. CHAINED RESEARCH STAGES: Break the research into sequential stages. Each stage should build on the previous one:
   - Stage 1: GATHER - Define what information to collect and from what types of sources
   - Stage 2: EVALUATE - Assess the reliability and relevance of findings
   - Stage 3: SYNTHESISE - Identify patterns, themes, and connections across sources
   - Stage 4: CONCLUDE - Draw evidence-based conclusions and recommendations

4. SCOPE AND BOUNDARIES: Define:
   - What is in scope vs out of scope
   - Time period to cover
   - Geographic or industry focus
   - Depth vs breadth preference
   - Types of sources to prioritise or avoid

5. SOURCE HANDLING: Specify how sources should be treated:
   - Whether to cite sources
   - How to handle conflicting information
   - How to indicate confidence levels
   - Whether to distinguish between primary and secondary sources

6. OUTPUT STRUCTURE: Require a structured research deliverable:
   - Research question (restated)
   - Methodology or approach taken
   - Key findings (numbered, with source attribution if applicable)
   - Analysis and synthesis
   - Conclusions and recommendations
   - Gaps or areas for further research

## Example Skeleton
---
You are a [researcher role] with expertise in [domain].

Research question: [clear, specific question]

Conduct this research in stages:

Stage 1 - Gather: Identify and collect relevant information about [specific aspects]. Focus on [types of sources or data].

Stage 2 - Evaluate: Assess the reliability and relevance of each finding. Note any conflicting information.

Stage 3 - Synthesise: Identify patterns, themes, and connections across your findings. Look for [specific patterns or insights].

Stage 4 - Conclude: Draw evidence-based conclusions and provide actionable recommendations.

Scope: [time period, geography, industry]
Depth: [overview vs deep dive]

Present findings in this structure:
## Research Question
## Methodology
## Key Findings
[Numbered, with confidence level]
## Analysis
## Conclusions and Recommendations
## Gaps and Further Research

Constraints: [specific constraints]
---`,
  },
  'quick-task': {
    name: 'Quick Task',
    technique: 'Zero-Shot',
    guidance: `For QUICK TASKS, generate a concise, focused prompt that gets straight to the point without unnecessary scaffolding.

## Required Prompt Structure for Quick Tasks
Quick task prompts should be lean and direct, but still well-crafted:

1. BRIEF ROLE (if relevant): A one-line role assignment only if it meaningfully affects the output quality. Skip if unnecessary.

2. DIRECT INSTRUCTION: State exactly what is needed in 1-3 clear sentences. Use action verbs. Be precise about the deliverable.

3. OUTPUT SPECIFICATION: In 1-2 lines, specify the format and any length constraints. Quick tasks benefit from tight format definitions.

4. SINGLE CONSTRAINT LINE: Any critical constraint on a single line.

## Key Principle
Quick task prompts should be proportionally simple. Do NOT over-engineer them with elaborate frameworks, multi-section structures, or lengthy context. A 10-word task should produce a concise, focused prompt, not a 500-word prompt document.

However, "concise" does not mean "vague". Every word should be precise and intentional. The prompt should be short AND specific.

## Example Skeleton
---
[Optional one-line role]

[Direct, specific instruction in 1-3 sentences]

Format: [specific output format]
[Optional: single constraint line]
---`,
  },
};

// Goal-specific analysis criteria for the refining questions feature
const GOAL_ANALYSIS_CRITERIA = {
  communication: `For COMMUNICATION tasks, check for:
- Is the audience clearly defined? (internal team, external client, executive, public?) If vague, ask.
- Is the tone/formality specified or clearly inferable from context? If ambiguous, ask.
- Is the communication channel clear? (email, Slack, presentation, letter?) If not stated and it matters, ask.
- Are there ambiguous terms that could mean different things to different audiences?
- Is the desired outcome of the communication stated? (inform, persuade, request action, deliver news?)`,

  analysis: `For ANALYSIS tasks, check for:
- Is the analytical framework or methodology specified or inferable? (SWOT, cost-benefit, trend analysis, etc.) If the task could use multiple frameworks with very different results, ask.
- Is the data source or input material identified? If the user says "analyse X" but X is not well-defined, ask.
- Are the evaluation criteria or dimensions defined? If not, and they would change the output significantly, ask.
- Is the expected depth clear? (high-level overview vs deep dive?) If ambiguous, ask.
- Should the analysis include recommendations, or just findings?`,

  ideation: `For IDEATION tasks, check for:
- Are there constraints on the solution space that the user may have forgotten to mention? (budget, timeline, technology, audience?) Only ask if their absence would lead to impractical ideas.
- Is the evaluation criteria for ideas specified? (feasibility, novelty, cost, speed?) If not stated, suggest criteria.
- Is the quantity of ideas desired stated? If not, suggest a number.
- Should ideas be explored in depth or listed at breadth?`,

  documentation: `For DOCUMENTATION tasks, check for:
- Is the document type specified? (SOP, user guide, API docs, policy, meeting notes?) If vague, ask.
- Is the target reader's technical level identified? This significantly changes the output.
- Are required sections or a template mentioned? If the document type typically follows a standard structure, suggest it.
- Is the level of detail clear? (overview vs step-by-step instructions?)`,

  research: `For RESEARCH tasks, check for:
- Is the research question well-defined and specifically scoped? If it is too broad, suggest narrowing.
- Is the required breadth vs depth clear?
- Should sources be cited or evaluated for reliability?
- What is the deliverable? (summary, literature review, comparison table, recommendation?) If unclear, ask.`,

  'quick-task': `For QUICK TASKS:
- Quick tasks should rarely need questions. Only ask if there is a genuine, significant ambiguity in the task description.
- If the task description is clear enough to act on, return needsQuestions: false.
- Consider whether the task is actually too complex for quick-task and might benefit from a different category.`,
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
 * Get model-family-level structural directives for the generated prompt
 */
function getModelStructureNote(modelId) {
  if (modelId.startsWith('claude-')) {
    return 'STRUCTURAL FORMAT: Use XML tags (<role>, <context>, <task>, <constraints>, <format>, <examples>) as the primary structural device in the generated prompt. Claude models reliably parse and follow XML-structured prompts with high fidelity. Use XML tags for major sections rather than markdown headers.';
  }
  if (modelId.startsWith('gpt-') || modelId === 'gpt-4o') {
    return 'STRUCTURAL FORMAT: Use a system-message-style pattern with markdown formatting in the generated prompt. Use ## headers for major sections, numbered lists for sequential steps, and bold text for key terms. Place role definition and constraints prominently at the start.';
  }
  if (modelId.startsWith('gemini-')) {
    return 'STRUCTURAL FORMAT: Use numbered sections with bold labels in the generated prompt. Place context before instructions. Use markdown formatting (headers, numbered lists, bold text). Structure the prompt as a clear sequence of labelled sections.';
  }
  if (modelId.startsWith('grok-')) {
    return 'STRUCTURAL FORMAT: Use clear markdown structure with explicit, labelled sections in the generated prompt. Keep instructions direct and concise. Use headers and bullet points for organisation.';
  }
  // Generic / don't-know / other models
  return 'STRUCTURAL FORMAT: Use a clear, universal structure with labelled sections (Role:, Context:, Task:, Format:, Constraints:) in the generated prompt. Use markdown formatting for readability. This ensures compatibility across different AI models.';
}

/**
 * Parse a JSON response from Gemini, handling common issues:
 * - Markdown code fences around JSON
 * - Newlines inside JSON string values
 * - Truncated output
 */
function parseJSONResponse(response) {
  let jsonText = response.trim();

  // Strip markdown code fences
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```\s*$/, '');
  }

  // First attempt: direct parse
  try {
    return JSON.parse(jsonText);
  } catch (firstError) {
    // Second attempt: fix newlines inside JSON string values
    // Replace actual newlines inside strings with escaped \n
    const fixed = jsonText.replace(/"([^"\\]|\\.)*"/g, (match) => {
      return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
    });

    try {
      return JSON.parse(fixed);
    } catch (secondError) {
      // Third attempt: try to close truncated JSON
      let truncated = fixed.trim();
      // Count open braces/brackets and close them
      const openBraces = (truncated.match(/\{/g) || []).length;
      const closeBraces = (truncated.match(/\}/g) || []).length;
      const openBrackets = (truncated.match(/\[/g) || []).length;
      const closeBrackets = (truncated.match(/\]/g) || []).length;

      // Try to close any unterminated strings
      const quoteCount = (truncated.match(/(?<!\\)"/g) || []).length;
      if (quoteCount % 2 !== 0) {
        truncated += '"';
      }

      // Close arrays and objects
      for (let i = 0; i < openBrackets - closeBrackets; i++) {
        truncated += ']';
      }
      for (let i = 0; i < openBraces - closeBraces; i++) {
        truncated += '}';
      }

      try {
        return JSON.parse(truncated);
      } catch (thirdError) {
        // All attempts failed; throw original error with context
        throw new Error(`JSON parse failed: ${firstError.message}. Raw response (first 200 chars): ${jsonText.substring(0, 200)}`);
      }
    }
  }
}

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
  const modelStructureNote = getModelStructureNote(modelId);

  const modelGuidanceSection = modelGuidance
    ? `\n## CRITICAL: Model-Specific Requirements for ${MODEL_NAMES[modelId] || modelId}\nYou MUST use the structural patterns and formatting conventions described below when constructing the prompt. The generated prompt's structure must match this model's documented best practices.\n\n${modelStructureNote}\n\n${modelGuidance}`
    : `\n## Model Structure\n${modelStructureNote}`;

  const goalSection = `\n## Goal Category: ${goalInfo.name}\n**Required Technique:** ${goalInfo.technique}\n\nYou MUST follow the structural guidance below for this goal category. The generated prompt must use the technique and structure described here.\n\n${goalInfo.guidance}`;

  return assembleMessage(template.systemInstruction, {
    MODEL_GUIDANCE: modelGuidanceSection,
    GOAL_TECHNIQUE: goalSection,
  });
}

/**
 * Build the user message for form-based generation
 */
function buildFormUserMessage(template, inputs, modelId, goalCategory, userProfile, refinementAnswers) {
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

  // Build refinement answers section if provided
  let answersSection = '';
  if (refinementAnswers && refinementAnswers.length > 0) {
    const answerLines = refinementAnswers
      .map(a => `- Q: "${a.question}" A: "${a.answer}"`)
      .join('\n');
    answersSection = `\n\n**Clarifications from the user (incorporate these into the generated prompt):**\n${answerLines}`;
  }

  return assembleMessage(template.userMessageTemplate, {
    MODEL_NAME: MODEL_NAMES[modelId] || modelId,
    GOAL_CATEGORY: goalInfo.name,
    TECHNIQUE: goalInfo.technique,
    ROLE: role,
    TASK: inputs.task || 'Not specified',
    CONTEXT: inputs.context || 'No additional context provided',
    OUTPUT_FORMAT: outputFormat,
    ADVANCED_OPTIONS: advancedOptions ? `**Advanced Options:**\n${advancedOptions}` : '',
    USER_PROFILE: profileContext + answersSection,
  });
}

/**
 * Build the user message for freeform/audio generation
 */
function buildFreeformUserMessage(template, freeformInput, modelId, goalCategory, userProfile, refinementAnswers) {
  const goalInfo = GOAL_TECHNIQUES[goalCategory] || GOAL_TECHNIQUES['quick-task'];
  const profileContext = buildUserProfileContext(userProfile);

  // Build refinement answers section if provided
  let answersSection = '';
  if (refinementAnswers && refinementAnswers.length > 0) {
    const answerLines = refinementAnswers
      .map(a => `- Q: "${a.question}" A: "${a.answer}"`)
      .join('\n');
    answersSection = `\n\n**Clarifications from the user (incorporate these into the generated prompt):**\n${answerLines}`;
  }

  return assembleMessage(template.userMessageTemplate, {
    MODEL_NAME: MODEL_NAMES[modelId] || modelId,
    GOAL_CATEGORY: goalInfo.name,
    TECHNIQUE: goalInfo.technique,
    FREEFORM_INPUT: freeformInput,
    USER_PROFILE: profileContext + answersSection,
  });
}

/**
 * Build the user message for improving an existing prompt
 */
function buildImproveUserMessage(template, existingPrompt, modelId, goalCategory, userProfile, diagnosisContext) {
  const goalInfo = GOAL_TECHNIQUES[goalCategory] || GOAL_TECHNIQUES['quick-task'];
  const profileContext = buildUserProfileContext(userProfile);

  // Build diagnosis context section if provided
  let diagnosisSection = '';
  if (diagnosisContext) {
    const parts = [];
    if (diagnosisContext.diagnosis && diagnosisContext.diagnosis.length > 0) {
      const diagLines = diagnosisContext.diagnosis
        .map(d => `- [${d.dimension}] ${d.issue}: ${d.suggestion}`)
        .join('\n');
      parts.push(`**Identified weaknesses to address:**\n${diagLines}`);
    }
    if (diagnosisContext.answers && diagnosisContext.answers.length > 0) {
      const answerLines = diagnosisContext.answers
        .map(a => `- Q: "${a.question}" A: "${a.answer}"`)
        .join('\n');
      parts.push(`**Clarifications from the user:**\n${answerLines}`);
    }
    if (parts.length > 0) {
      diagnosisSection = parts.join('\n\n');
    }
  }

  return assembleMessage(template.userMessageTemplate, {
    MODEL_NAME: MODEL_NAMES[modelId] || modelId,
    GOAL_CATEGORY: goalInfo.name,
    EXISTING_PROMPT: existingPrompt,
    USER_PROFILE: profileContext,
    DIAGNOSIS_CONTEXT: diagnosisSection,
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
async function generatePromptStream({ type, inputs, modelId, goalCategory, userId, refinementAnswers }) {
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
    userMessage = buildFormUserMessage(template, inputs, modelId, goalCategory, userProfile, refinementAnswers);
  } else if (type === 'freeform') {
    template = loadTemplate('generate-from-freeform');
    systemInstruction = buildSystemInstruction(template, modelId, goalCategory);
    userMessage = buildFreeformUserMessage(template, inputs.freeformInput, modelId, goalCategory, userProfile, refinementAnswers);
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
async function improvePromptStream({ existingPrompt, modelId, goalCategory, userId, diagnosisContext }) {
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
  const userMessage = buildImproveUserMessage(template, existingPrompt, modelId, goalCategory, userProfile, diagnosisContext);

  return generateContentStream({
    prompt: userMessage,
    systemInstruction,
    config: template.generationConfig,
  });
}

/**
 * Refine a generated prompt via streaming
 */
async function refinePromptStream({ currentPrompt, refinementType, customInstruction, modelId }) {
  const template = loadTemplate('refine-prompt');

  let userMessage;
  if (customInstruction) {
    // Use custom instruction text directly
    userMessage = assembleMessage(template.userMessageTemplate, {
      REFINEMENT_INSTRUCTION: customInstruction,
      CURRENT_PROMPT: currentPrompt,
    });
  } else {
    userMessage = buildRefineUserMessage(template, currentPrompt, refinementType);
  }

  return generateContentStream({
    prompt: userMessage,
    systemInstruction: template.systemInstruction,
    config: template.generationConfig,
  });
}

/**
 * Analyse user inputs and return targeted follow-up questions if needed.
 * Uses non-streaming generateContent since response is structured JSON.
 */
async function analyseInputs({ type, inputs, modelId, goalCategory, userId }) {
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

  const template = loadTemplate('analyse-inputs');
  const goalInfo = GOAL_TECHNIQUES[goalCategory] || GOAL_TECHNIQUES['quick-task'];
  const analysisGuidance = GOAL_ANALYSIS_CRITERIA[goalCategory] || GOAL_ANALYSIS_CRITERIA['quick-task'];
  const profileContext = buildUserProfileContext(userProfile);

  // Build system instruction with goal analysis criteria
  const systemInstruction = assembleMessage(template.systemInstruction, {
    GOAL_ANALYSIS_CRITERIA: `\n## Goal-Category-Specific Analysis: ${goalInfo.name}\n${analysisGuidance}`,
  });

  // Build user inputs summary based on type
  let userInputsSummary;
  if (type === 'form') {
    const role = inputs.role === 'Custom Role...' ? (inputs.customRole || 'Not specified') : (inputs.role || 'Not specified');
    const outputFormat = inputs.outputFormat === 'custom'
      ? (inputs.customFormat || 'Not specified')
      : (OUTPUT_FORMAT_LABELS[inputs.outputFormat] || inputs.outputFormat || 'Not specified');

    const parts = [];
    parts.push(`Role/Persona: ${role}`);
    parts.push(`Task: ${inputs.task || 'Not specified'}`);
    parts.push(`Context: ${inputs.context || 'Not provided'}`);
    parts.push(`Output Format: ${outputFormat}`);
    if (inputs.examples) parts.push(`Examples: ${inputs.examples}`);
    if (inputs.constraints) parts.push(`Constraints: ${inputs.constraints}`);
    if (inputs.thinkingMode) parts.push('Thinking Mode: Enabled');
    if (inputs.creativity !== undefined && inputs.creativity !== 50) {
      parts.push(`Creativity Level: ${inputs.creativity}/100`);
    }
    userInputsSummary = parts.join('\n');
  } else {
    userInputsSummary = `Freeform description: ${inputs.freeformInput || 'Not provided'}`;
  }

  const userMessage = assembleMessage(template.userMessageTemplate, {
    MODEL_NAME: MODEL_NAMES[modelId] || modelId,
    GOAL_CATEGORY: goalInfo.name,
    TECHNIQUE: goalInfo.technique,
    USER_INPUTS: userInputsSummary,
    USER_PROFILE: profileContext,
  });

  try {
    const response = await generateContent({
      prompt: userMessage,
      systemInstruction,
      config: {
        ...template.generationConfig,
        responseMimeType: 'application/json',
      },
    });

    const result = parseJSONResponse(response);

    // Validate and sanitise the response shape
    return {
      needsQuestions: Boolean(result.needsQuestions),
      questions: Array.isArray(result.questions) ? result.questions.slice(0, 4).map((q, i) => ({
        id: q.id || `q${i + 1}`,
        question: String(q.question || ''),
        reason: String(q.reason || ''),
        type: q.type === 'choice' ? 'choice' : 'text',
        choices: Array.isArray(q.choices) ? q.choices.map(String) : null,
        priority: q.priority === 'medium' ? 'medium' : 'high',
      })) : [],
      inputSummary: String(result.inputSummary || ''),
    };
  } catch (error) {
    console.error('Analysis failed:', error.message);
    // On failure, proceed without questions rather than blocking the user
    return {
      needsQuestions: false,
      questions: [],
      inputSummary: '',
    };
  }
}

/**
 * Analyse an existing prompt and return diagnosis + optional questions.
 * Uses non-streaming generateContent since response is structured JSON.
 */
async function analyseExistingPrompt({ existingPrompt, modelId, goalCategory, userId }) {
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

  const template = loadTemplate('analyse-existing');
  const goalInfo = GOAL_TECHNIQUES[goalCategory] || GOAL_TECHNIQUES['quick-task'];
  const analysisGuidance = GOAL_ANALYSIS_CRITERIA[goalCategory] || GOAL_ANALYSIS_CRITERIA['quick-task'];
  const profileContext = buildUserProfileContext(userProfile);

  // Build system instruction with goal analysis criteria
  const systemInstruction = assembleMessage(template.systemInstruction, {
    GOAL_ANALYSIS_CRITERIA: `\n## Goal-Category-Specific Analysis: ${goalInfo.name}\n${analysisGuidance}`,
  });

  const userMessage = assembleMessage(template.userMessageTemplate, {
    MODEL_NAME: MODEL_NAMES[modelId] || modelId,
    GOAL_CATEGORY: goalInfo.name,
    EXISTING_PROMPT: existingPrompt,
    USER_PROFILE: profileContext,
  });

  try {
    const response = await generateContent({
      prompt: userMessage,
      systemInstruction,
      config: {
        ...template.generationConfig,
        responseMimeType: 'application/json',
      },
    });

    const result = parseJSONResponse(response);

    return {
      needsQuestions: Boolean(result.needsQuestions),
      diagnosis: Array.isArray(result.diagnosis) ? result.diagnosis.map(d => ({
        dimension: String(d.dimension || ''),
        issue: String(d.issue || ''),
        suggestion: String(d.suggestion || ''),
      })) : [],
      questions: Array.isArray(result.questions) ? result.questions.slice(0, 4).map((q, i) => ({
        id: q.id || `q${i + 1}`,
        question: String(q.question || ''),
        reason: String(q.reason || ''),
        type: q.type === 'choice' ? 'choice' : 'text',
        choices: Array.isArray(q.choices) ? q.choices.map(String) : null,
        priority: q.priority === 'medium' ? 'medium' : 'high',
      })) : [],
    };
  } catch (error) {
    console.error('Existing prompt analysis failed:', error.message);
    return {
      needsQuestions: false,
      diagnosis: [],
      questions: [],
    };
  }
}

/**
 * Score a prompt using Gemini-based rubric evaluation.
 * Returns structured scores and actionable suggestions.
 */
async function scorePromptWithAI({ promptText, modelId, goalCategory }) {
  const template = loadTemplate('score-prompt');
  const goalInfo = GOAL_TECHNIQUES[goalCategory] || GOAL_TECHNIQUES['quick-task'];

  const userMessage = assembleMessage(template.userMessageTemplate, {
    MODEL_NAME: MODEL_NAMES[modelId] || modelId,
    GOAL_CATEGORY: goalInfo.name,
    PROMPT_TEXT: promptText,
  });

  try {
    const response = await generateContent({
      prompt: userMessage,
      systemInstruction: template.systemInstruction,
      config: {
        ...template.generationConfig,
        responseMimeType: 'application/json',
      },
    });

    const result = parseJSONResponse(response);

    // Validate and sanitise scores
    const sanitiseScore = (val) => {
      const n = Number(val);
      return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 50;
    };

    const scores = {
      clarity: sanitiseScore(result.scores?.clarity),
      completeness: sanitiseScore(result.scores?.completeness),
      specificity: sanitiseScore(result.scores?.specificity),
      structure: sanitiseScore(result.scores?.structure),
      overall: 0,
    };
    // Calculate weighted overall
    scores.overall = Math.round(
      scores.clarity * 0.25 +
      scores.completeness * 0.30 +
      scores.specificity * 0.25 +
      scores.structure * 0.20
    );

    const suggestions = Array.isArray(result.suggestions)
      ? result.suggestions.slice(0, 5).map(s => ({
          dimension: String(s.dimension || ''),
          suggestion: String(s.suggestion || ''),
          impact: s.impact === 'medium' ? 'medium' : 'high',
        }))
      : [];

    return { scores, suggestions };
  } catch (error) {
    console.error('AI scoring failed:', error.message);
    // Fall back to heuristic scoring with no suggestions
    return {
      scores: scorePromptQuality(promptText),
      suggestions: [],
    };
  }
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
  analyseInputs,
  analyseExistingPrompt,
  scorePromptQuality,
  scorePromptWithAI,
  clearCache,
};
