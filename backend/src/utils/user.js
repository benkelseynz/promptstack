function getUserDisplayName(user) {
  if (!user) return '';

  const firstName = typeof user.firstName === 'string' ? user.firstName.trim() : '';
  const lastName = typeof user.lastName === 'string' ? user.lastName.trim() : '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ');

  return fullName || user.name || user.email || '';
}

module.exports = {
  getUserDisplayName,
};
