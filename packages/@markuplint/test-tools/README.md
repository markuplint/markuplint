# @markuplint/test-tools

A private package for testing in this repository

## API

```ts
import { createJSDOMElement } from '@markuplint/test-tools';

it('is test', () => {
  expect(createJSDOMElement('<div>foo</div>').textContent).toBe('foo');
  expect(createJSDOMElement('<div><span>foo</span></div>', 'span').textContent).toBe('foo');
});
```
