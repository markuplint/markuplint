import type { AccessibilityProperties } from '@markuplint/ml-core';
import type { ARIAVersion } from '@markuplint/ml-spec';
import type { FromCodeOptions, MLEngineEventMap, MLResultInfo } from 'markuplint';

import { Emitter } from 'strict-event-emitter';

export type FromCodeFunction = (
	sourceCode: string,
	options?: FromCodeOptions & Readonly<{ moduleName?: string }>,
) => Promise<MLEngine>;

export class MLEngine extends Emitter<MLEngineEventMap> {
	static fromCode: FromCodeFunction;

	constructor();
	dispose(): Promise<void>;
	exec(): Promise<MLResultInfo | null>;
	getAccessibilityByLocation(
		line: number,
		col: number,
		ariaVersion?: ARIAVersion,
	): Promise<{
		node: string;
		aria: AccessibilityProperties;
	} | null>;

	getVersion(): Promise<string>;
	setCode(sourceCode: string, baseDir?: string): Promise<void>;
	setModule(moduleName: string): Promise<void>;
}

export function getVersion(): Promise<string>;
