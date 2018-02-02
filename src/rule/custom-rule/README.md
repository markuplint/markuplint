# Custom Rule

## Creation

**Recommended to develop with TypeScript**

```js
import { CustomRule, VerifyReturn } from 'markuplint/lib/rule';

export default CustomRule.create({
	name: 'name',
	defaultValue: null,
	defaultOptions: null,
	async verify (document, locale) {
		return [
			{
				level: [ERROR_LEVEL],
				message: [ERROR_MESSAGE],
				line: [LOCATION_LINE_NUMBER],
				col: [LOCATION_COLUMN_NUMBER],
				raw: [CODE_RAW_STRING],
			}
		];
	},
});
```

### Require module

```js
import { CustomRule, VerifyReturn } from 'markuplint/lib/rule';
```

`CustomRule` is a **Class** that has static main method `create` and static helper methods.

`VerifyReturn` is a **Interface** on _TypeScript_.

### Types

```js
export default CustomRule.create<T, O>({
	name: string,
	defaultValue: T,
	defaultOptions: O,
	async verify (document: MarkuplintDocument, locale: string): Promise<VerifyReturn[]> {
		return [
			{
				level: 'error' | 'warning',
				message: string,
				line: number,
				col: number,
				raw: string,
			}
		];
	}
});
```

## Basic

1. [MUST] Default exporting CustomRule instance.
2. [MUST] Set paramater as Object.
3. [MUST] Set name property.
4. [MUST] Set defaultValue property.
5. [MUST] Set defaultOptions property.
6. [OPTINAL] Set defaltLevel property.
7. [MUST] Define async verify method that return array of VerifyReturn as Promise.

WIP
