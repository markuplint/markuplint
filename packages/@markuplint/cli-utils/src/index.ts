/**
 * @module @markuplint/cli-utils
 *
 * Shared CLI utility functions for the markuplint command-line interface.
 * Provides terminal color helpers, text formatting, interactive prompts,
 * module installation, and display utilities used across markuplint CLI commands.
 */

export { default as font } from 'picocolors';

export { xterm } from './color.js';
export { input, confirm, confirmSequence, select, multiSelect } from './prompt.js';
export { installModule } from './install-module.js';
export type { InstallModuleResult } from './install-module.js';
export { getWidth } from './get-width.js';
export { header } from './header.js';
export { invisibleSpace } from './invisible-space.js';
export { messageToString } from './message-to-string.js';
export { name } from './name.js';
export { pad } from './pad.js';
export { space } from './space.js';
