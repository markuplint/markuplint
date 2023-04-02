import type { LangConfigs } from './types';

import { NotificationType, RequestType } from 'vscode-languageserver';

import { ID } from './const';

export const ready = new RequestType<{ version: string }, void, void>(`${ID}/ready`);
export const configs = new RequestType<LangConfigs, void, void>(`${ID}/configs`);
export const logToPrimaryChannel = new NotificationType<string>(`${ID}/log-primary-channel`);
export const errorToPopup = new NotificationType<string>(`${ID}/error-popup`);
export const warningToPopup = new NotificationType<string>(`${ID}/warning-popup`);
export const infoToPopup = new NotificationType<string>(`${ID}/info-popup`);
