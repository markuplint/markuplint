import color from 'ansi-colors';

import { log } from '../debug.js';

export const cmLog = log.extend('content-model');

/* eslint-disable import/no-named-as-default-member */
export const bgGreen = color.bgGreen;
export const green = color.green;
export const bgRed = color.bgRed;
export const bgBlue = color.bgBlue;
export const blue = color.blue;
export const bgMagenta = color.bgMagenta;
export const cyan = color.cyan;
/* eslint-enable import/no-named-as-default-member */
