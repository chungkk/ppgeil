const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
];

/**
 * Generate a default avatar SVG from user's name initials
 * @param {string} name - User's display name
 * @returns {string} Data URI of the SVG avatar
 */
export const getDefaultAvatar = (name) => {
  const initials = name
    ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  
  const colorIndex = name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0;
  const bgColor = AVATAR_COLORS[colorIndex];

  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="${bgColor}"/>
      <text x="50" y="50" font-family="Arial, sans-serif" font-size="40" fill="white" text-anchor="middle" dominant-baseline="central">${initials}</text>
    </svg>
  `)}`;
};

export default getDefaultAvatar;
