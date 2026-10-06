import type { Module } from './get-module.js';
import type { Log, Status } from '../types.js';

import { IMPORT_ASSERTION_COMPAT_WARNING, NO_INSTALL_WARNING } from '../const.js';
import { t } from '../i18n.js';

/**
 * Client-facing channels the notices are delivered through.
 */
export type ModuleNoticeChannels = {
	/** Primary output channel */
	readonly log: Log;
	/** Warning popup */
	readonly popup: (message: string) => void;
	/** Status bar update */
	readonly sendStatus: (status: Status) => void;
};

/**
 * Creates the user-facing notices about which markuplint module a document is linted with.
 *
 * `reportStatus` runs on every document open, so the status bar follows the most recently
 * opened document. `onFirstResolve` runs once per working directory; without
 * `workingDirectories` that is once per opened file's directory, so the import assertion
 * popup is additionally capped to once per session while its log line stays per directory.
 *
 * @param channels - Where to deliver the notices
 * @returns Handlers for `createModuleResolver` and `createEventHandlers`
 */
export function createModuleNotices(channels: ModuleNoticeChannels) {
	let compatPopupShown = false;

	const noInstallMessage = (mod: Module) => (mod.isLocalModule ? null : t(NO_INSTALL_WARNING, mod.version) + t('. '));

	return {
		onFirstResolve(mod: Module) {
			channels.log(
				`Found version: ${mod.version} (isLocalModule: ${mod.isLocalModule}) for ${mod.workspace}`,
				'info',
			);

			const message = noInstallMessage(mod);
			if (message) {
				channels.log(message, 'warn');
			}

			if (mod.fallbackReason === 'import-assertion-compat') {
				const compatMessage = t(IMPORT_ASSERTION_COMPAT_WARNING, mod.version);
				channels.log(compatMessage, 'warn');
				if (!compatPopupShown) {
					compatPopupShown = true;
					channels.popup(compatMessage);
				}
			}
		},

		reportStatus(mod: Module) {
			channels.sendStatus({
				version: mod.version,
				isLocalModule: mod.isLocalModule,
				message: noInstallMessage(mod),
			});
		},
	};
}
