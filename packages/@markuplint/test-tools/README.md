# @markuplint/test-tools

This is a private package.

## API

```ts
import { createJSDOMElement } from '@markuplint/test-tools';

it('is test', () => {
  expect(createJSDOMElement('<div>foo</div>').textContent).toBe('foo');
  expect(createJSDOMElement('<div><span>foo</span></div>', 'span').textContent).toBe('foo');
});
```
