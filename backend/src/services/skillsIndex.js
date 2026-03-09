const path = require('path');
const { DATA_DIR, readJsonFile } = require('./fileStorage');

// In-memory skills index
let skillsIndex = {
  skills: [],
  lastUpdated: null
};

// Generate preview from content
function generatePreview(content, maxLength = 150) {
  // Strip markdown headers and formatting for preview
  const cleaned = content
    .replace(/^#+\s+.*$/gm, '')  // Remove headers
    .replace(/```[\s\S]*?```/g, '')  // Remove code blocks
    .replace(/\|.*\|/g, '')  // Remove table rows
    .replace(/[-*]\s+/g, '')  // Remove list markers
    .replace(/\n{2,}/g, ' ')  // Collapse newlines
    .replace(/\n/g, ' ')
    .trim();

  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength).trim() + '...';
}

// Load skills library
async function loadSkillsLibrary() {
  const filePath = path.join(DATA_DIR, 'skills', 'general.json');
  const data = await readJsonFile(filePath);

  if (!data) return [];

  return (data.skills || []).map(skill => ({
    ...skill,
    preview: skill.preview || generatePreview(skill.content || '')
  }));
}

// Build the skills index
async function buildSkillsIndex() {
  const skills = await loadSkillsLibrary();
  return { skills };
}

// Initialise the skills index
async function initSkillsIndex(silent = false) {
  if (!silent) {
    console.log('Building skills index...');
  }
  const { skills } = await buildSkillsIndex();

  skillsIndex = {
    skills,
    lastUpdated: new Date().toISOString()
  };

  if (!silent) {
    console.log(`Skills index built: ${skills.length} skills`);
  }
  return skillsIndex;
}

// Search skills
function searchSkills(query = {}) {
  let results = [...skillsIndex.skills];

  // Text search
  if (query.q) {
    const searchTerms = query.q.toLowerCase().split(/\s+/);

    results = results.filter(skill => {
      const searchableText = [
        skill.title || '',
        skill.category || '',
        ...(skill.tags || []),
        ...(skill.keywords || [])
      ].join(' ').toLowerCase();

      return searchTerms.every(term => searchableText.includes(term));
    });
  }

  // Category filter
  if (query.category && query.category !== 'all') {
    results = results.filter(s => s.category === query.category);
  }

  // Access level filter
  if (query.access && query.access !== 'all') {
    results = results.filter(s => s.access === query.access);
  }

  // Pagination
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const startIndex = (page - 1) * limit;

  const paginatedResults = results.slice(startIndex, startIndex + limit);

  return {
    skills: paginatedResults,
    total: results.length,
    page,
    limit,
    totalPages: Math.ceil(results.length / limit)
  };
}

// Get skill by ID
function getSkillById(id) {
  return skillsIndex.skills.find(s => s.id === id);
}

// Get all unique skill categories
function getSkillCategories() {
  const categories = new Set();
  skillsIndex.skills.forEach(skill => {
    if (skill.category) {
      categories.add(skill.category);
    }
  });
  return Array.from(categories).sort();
}

// Apply premium gating to skill
function applySkillPremiumGating(skill, userTier = 'free') {
  if (!skill) return null;

  const isPremium = skill.access === 'premium';
  const hasAccess = userTier !== 'free';

  if (isPremium && !hasAccess) {
    return {
      id: skill.id,
      title: skill.title,
      preview: skill.preview,
      access: skill.access,
      category: skill.category,
      tags: skill.tags,
      keywords: skill.keywords,
      isLocked: true
    };
  }

  return {
    ...skill,
    isLocked: false
  };
}

module.exports = {
  initSkillsIndex,
  searchSkills,
  getSkillById,
  getSkillCategories,
  applySkillPremiumGating,
  generatePreview
};
