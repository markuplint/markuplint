import { xterm } from './color.js';
import { PRIMARY_COLOR } from './const.js';

/** The markuplint logo rendered as a styled checkmark for terminal display. */
export const logo = `/${xterm(PRIMARY_COLOR)('✔')}\\`;
