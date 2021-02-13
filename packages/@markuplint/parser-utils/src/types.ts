export type Code = {
	type: string;
	index: number;
	startTag: string;
	taggedCode: string;
	endTag: string | null;
};

export type IgnoreTag = {
	type: string;
	start: RegExp;
	end: RegExp;
};

export type IgnoreBlock = {
	source: string;
	replaced: string;
	stack: Code[];
};
