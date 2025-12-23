const fs = require('fs').promises;
const path = require('path');
const { INDUSTRIES_DIR, DATA_DIR, readJsonFile, listFiles } = require('./fileStorage');

// In-memory search index
let searchIndex = {
  prompts: [],
  industries: [],
  lastUpdated: null
};

// Extract placeholders from content
function extractPlaceholders(content) {
  const regex = /\[([^\]]+)\]/g;
  const placeholders = [];
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    if (!placeholders.includes(match[1])) {
      placeholders.push(match[1]);
    }
  }
  
  return placeholders;
}

// Generate preview from content
function generatePreview(content, maxLength = 150) {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength).trim() + '...';
}

// Load a single industry file
async function loadIndustryFile(filename) {
  const filePath = path.join(INDUSTRIES_DIR, filename);
  const data = await readJsonFile(filePath);
  
  if (!data) return null;
  
  const industryId = filename.replace('.json', '');
  
  return {
    id: industryId,
    name: data.name || industryId,
    description: data.description || '',
    icon: data.icon || 'briefcase',
    roles: data.roles || [],
    categories: data.categories || [],
    prompts: (data.prompts || []).map(prompt => ({
      ...prompt,
      industry: industryId,
      industryName: data.name || industryId,
      placeholders: prompt.placeholders || extractPlaceholders(prompt.content || ''),
      preview: prompt.preview || generatePreview(prompt.content || '')
    }))
  };
}

// Load general prompts
async function loadGeneralPrompts() {
  const filePath = path.join(DATA_DIR, 'general.json');
  const data = await readJsonFile(filePath);
  
  if (!data) return [];
  
  return (data.prompts || []).map(prompt => ({
    ...prompt,
    industry: 'general',
    industryName: 'General',
    placeholders: prompt.placeholders || extractPlaceholders(prompt.content || ''),
    preview: prompt.preview || generatePreview(prompt.content || '')
  }));
}

// Build the search index
async function buildSearchIndex() {
  const prompts = [];
  const industries = [];
  
  // Load general prompts
  const generalPrompts = await loadGeneralPrompts();
  prompts.push(...generalPrompts);
  
  industries.push({
    id: 'general',
    name: 'General',
    description: 'General purpose prompts for any industry',
    icon: 'globe',
    promptCount: generalPrompts.length
  });
  
  // Load industry files
  const industryFiles = await listFiles(INDUSTRIES_DIR, '.json');
  
  for (const filename of industryFiles) {
    const industry = await loadIndustryFile(filename);
    
    if (industry) {
      prompts.push(...industry.prompts);
      
      industries.push({
        id: industry.id,
        name: industry.name,
        description: industry.description,
        icon: industry.icon,
        roles: industry.roles,
        categories: industry.categories,
        promptCount: industry.prompts.length
      });
    }
  }
  
  return { prompts, industries };
}

// Initialise the search index
async function initSearchIndex() {
  console.log('Building search index...');
  const { prompts, industries } = await buildSearchIndex();
  
  searchIndex = {
    prompts,
    industries,
    lastUpdated: new Date().toISOString()
  };
  
  console.log(`Search index built: ${prompts.length} prompts, ${industries.length} industries`);
  return searchIndex;
}

// Watch for file changes in dev mode
function watchForChanges() {
  const chokidar = require('fs');
  
  const watchPaths = [INDUSTRIES_DIR, path.join(DATA_DIR, 'general.json')];
  
  // Simple polling approach for dev mode
  setInterval(async () => {
    try {
      await initSearchIndex();
    } catch (error) {
      console.error('Error refreshing search index:', error);
    }
  }, 30000); // Refresh every 30 seconds in dev
  
  console.log('Watching for prompt library changes (30s interval)');
}

// Search prompts
function searchPrompts(query = {}) {
  let results = [...searchIndex.prompts];
  
  // Text search
  if (query.q) {
    const searchTerms = query.q.toLowerCase().split(/\s+/);
    
    results = results.filter(prompt => {
      const searchableText = [
        prompt.title || '',
        prompt.role || '',
        prompt.industryName || '',
        ...(prompt.keywords || [])
      ].join(' ').toLowerCase();
      
      return searchTerms.every(term => searchableText.includes(term));
    });
  }
  
  // Industry filter
  if (query.industry && query.industry !== 'all') {
    results = results.filter(p => p.industry === query.industry);
  }
  
  // Category filter
  if (query.category) {
    results = results.filter(p => p.category === query.category);
  }
  
  // Role filter
  if (query.role) {
    results = results.filter(p => p.role === query.role);
  }
  
  // Access level filter
  if (query.access && query.access !== 'all') {
    results = results.filter(p => p.access === query.access);
  }
  
  // Pagination
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const startIndex = (page - 1) * limit;
  
  const paginatedResults = results.slice(startIndex, startIndex + limit);
  
  return {
    prompts: paginatedResults,
    total: results.length,
    page,
    limit,
    totalPages: Math.ceil(results.length / limit)
  };
}

// Get prompt by ID
function getPromptById(id) {
  return searchIndex.prompts.find(p => p.id === id);
}

// Get all industries
function getIndustries() {
  return searchIndex.industries;
}

// Get all unique roles across industries
function getAllRoles() {
  const roles = new Set();
  
  searchIndex.prompts.forEach(prompt => {
    if (prompt.role) {
      roles.add(prompt.role);
    }
  });
  
  return Array.from(roles).sort();
}

// Get all unique categories
function getAllCategories() {
  const categories = new Set();
  
  searchIndex.prompts.forEach(prompt => {
    if (prompt.category) {
      categories.add(prompt.category);
    }
  });
  
  return Array.from(categories).sort();
}

// Apply premium gating to prompt
function applyPremiumGating(prompt, userTier = 'free') {
  if (!prompt) return null;
  
  const isPremium = prompt.access === 'premium';
  const hasAccess = userTier !== 'free'; // In MVP, all paid tiers get access
  
  if (isPremium && !hasAccess) {
    // Return gated version
    return {
      id: prompt.id,
      title: prompt.title,
      preview: prompt.preview,
      access: prompt.access,
      industry: prompt.industry,
      industryName: prompt.industryName,
      role: prompt.role,
      category: prompt.category,
      keywords: prompt.keywords,
      isLocked: true
    };
  }
  
  // Return full prompt
  return {
    ...prompt,
    isLocked: false
  };
}

module.exports = {
  initSearchIndex,
  watchForChanges,
  searchPrompts,
  getPromptById,
  getIndustries,
  getAllRoles,
  getAllCategories,
  applyPremiumGating,
  extractPlaceholders,
  generatePreview
};
