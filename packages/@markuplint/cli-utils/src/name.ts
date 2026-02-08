import { xterm } from './color.js';
import { PRIMARY_COLOR } from './const.js';

/** The styled markuplint product name with the "lint" portion colored in the brand color. */
export const name = `Markup${xterm(PRIMARY_COLOR)('lint')}`;
