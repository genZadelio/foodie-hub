// Shared JSDoc contract for Foodie Hub menu modules.
// The runtime intentionally has no build step or third-party dependencies.

/**
 * @typedef {Object} MenuItem
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {number} price
 * @property {string} category
 * @property {'Chinese'|'Japanese'|'Indian'|'South Indian'|'Italian'|'Korean'} cuisine
 * @property {number} rating
 * @property {string} prepTime
 * @property {string[]} tags
 * @property {string} image
 * @property {boolean} isVeg
 * @property {boolean} isChefSpecial
 * @property {0|1|2|3} spiceLevel
 */

export const CUISINES = Object.freeze([
  'Chinese',
  'Japanese',
  'Indian',
  'South Indian',
  'Italian',
  'Korean',
]);

export const GST_RATE = 0.05;
