export type ElementSpec = {
	name: string;
	categories: string[];
	contentModel: {
		exists: 'required' | 'any';
		models: string[];
	}[];
	omittion: ElementSpecOmittion;
	attributes: AttributeSpec[];
};

export type _ElementSpecOmittion<A extends boolean> = {
	isAllow: A;
};

export type ElementSpecOmittion<A extends boolean = boolean> = A extends true
	? _ElementSpecOmittion<true> & {
			condition: ElementSpecOmittionCondition;
	  }
	: _ElementSpecOmittion<false>;

export type ElementSpecOmittionCondition = {
	__WIP__: 'WORK_IN_PROGRESS';
};

export type Attribute = {
	name: string;
	type: 'global' | 'xml' | 'aria' | 'eventhandler' | 'form' | 'particular';
	value: AttributeValue;
};

export type AttributeValue = {};

export type AttributeSpec = Attribute & {
	required: boolean;
};
