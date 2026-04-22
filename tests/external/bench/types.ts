export type FilenameHint = 'novalid' | 'isvalid' | 'haswarn' | 'hasinfo' | 'other';

export type NuMessageType = 'error' | 'warning' | 'info' | 'non-document-error';

export type NuMessage = {
	readonly id: string;
	readonly type: NuMessageType;
	readonly subType: string | null;
	readonly message: string;
	readonly firstLine: number | null;
	readonly lastLine: number | null;
	readonly firstColumn: number | null;
	readonly lastColumn: number | null;
	readonly extract: string | null;
	readonly hiliteStart: number | null;
	readonly hiliteLength: number | null;
};

export type NuValidatorSnapshot = {
	readonly source: {
		readonly path: string;
		readonly sha256: string;
		readonly filenameHint: FilenameHint;
	};
	readonly nuValidator: {
		readonly imageDigest: string;
		readonly messages: readonly NuMessage[];
		readonly error?: string;
	};
};

export type MlViolation = {
	readonly ruleId: string;
	readonly severity: 'error' | 'warning' | 'info';
	readonly message: string;
	readonly line: number;
	readonly col: number;
	readonly raw: string;
};

export type MarkuplintSnapshot = {
	readonly source: {
		readonly path: string;
		readonly sha256: string;
	};
	readonly markuplint: {
		readonly version: string;
		readonly configId: string;
		readonly violations: readonly MlViolation[];
		readonly parseError: boolean;
	};
};

export type ExcludedIdEntry = {
	readonly id: string;
	readonly path: string;
	readonly nuMessage: string;
	readonly reason: string;
	readonly addedAt: string;
	readonly addedBy: string;
};

export type ExcludedIds = {
	readonly $schema?: string;
	readonly entries: readonly ExcludedIdEntry[];
};

export type Verdict = 'match-error' | 'match-clean' | 'ml-over' | 'nu-over';

export type CoverageEntry = {
	readonly path: string;
	readonly category: string;
	readonly nu: 'error' | 'clean';
	readonly ml: 'error' | 'clean';
	readonly verdict: Verdict;
	readonly excludedIds: readonly string[];
};

export type Coverage = {
	readonly entries: readonly CoverageEntry[];
};

export type OverDetectionEntry = {
	readonly path: string;
	readonly category: string;
	readonly ruleIds?: readonly string[];
	readonly nuMessageIds?: readonly string[];
};

export type Meta = {
	readonly generatedAt: string;
	readonly submoduleSha: string;
	readonly nuValidatorImage: string;
	readonly markuplintVersion: string;
	readonly nodeVersion: string;
	readonly totalFiles: number;
	readonly totalNuMessages: number;
	readonly totalMlViolations: number;
};
