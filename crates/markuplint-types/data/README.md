# CSS Data Files

Extracted from [mdn-data](https://www.npmjs.com/package/mdn-data) for use by the CSS value matching engine.

## Files

| File | Source | Description |
|------|--------|-------------|
| `css-syntaxes.json` | `mdn-data/css/syntaxes.json` | CSS type syntax definitions (name → syntax string) |
| `css-properties.json` | `mdn-data/css/properties.json` | CSS property syntax definitions (name → syntax string, vendor-prefixed properties excluded) |

## How to Update

When `mdn-data` is updated in the project's npm dependencies, regenerate these files:

```bash
# From the repository root
node -e "
const syns = require('mdn-data/css/syntaxes.json');
const result = {};
for (const [name, data] of Object.entries(syns)) {
  result[name] = data.syntax;
}
console.log(JSON.stringify(result, null, 2));
" > crates/markuplint-types/data/css-syntaxes.json

node -e "
const props = require('mdn-data/css/properties.json');
const result = {};
for (const [name, data] of Object.entries(props)) {
  if (data.syntax && !name.startsWith('-ms-') && !name.startsWith('-webkit-') && !name.startsWith('-moz-')) {
    result[name] = data.syntax;
  }
}
console.log(JSON.stringify(result, null, 2));
" > crates/markuplint-types/data/css-properties.json
```

Then run `cargo test -p markuplint-types` to verify nothing is broken.
