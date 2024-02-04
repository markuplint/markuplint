import type { Log } from '../debug.js';

import { log } from '../debug.js';

export const cmLog: Log = log.extend('content-model');

const fn = () => {};
fn.bold = () => {};

export const bgGreen = fn;
export const green = fn;
export const bgRed = fn;
export const bgBlue = fn;
export const blue = fn;
export const bgMagenta = fn;
export const cyan = fn;
