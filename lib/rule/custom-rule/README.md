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

WIP
