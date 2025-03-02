## Merge Behavior

| Options                                                                       | Type   | Behavior           | Path Absolutize |
| ----------------------------------------------------------------------------- | ------ | ------------------ | --------------- |
| [ruleCommonSettings](https://markuplint.dev/configuration#ruleCommonSettings) | Object | Shallow Merge      | ✓               |
| [plugins](https://markuplint.dev/configuration#plugins)                       | Array  | Override           | ✓               |
| [parser](https://markuplint.dev/configuration#parser)                         | Object | Shallow Merge      | ✓               |
| [parserOptions](https://markuplint.dev/configuration#parserOptions)           | Object | Shallow Merge      | ✓               |
| [specs](https://markuplint.dev/configuration#specs)                           | Object | Shallow Merge      | -               |
| [extends](https://markuplint.dev/configuration#extends)                       | Array  | Remove After Merge | ✓               |
| [excludeFiles](https://markuplint.dev/configuration#excludeFiles)             | Array  | Override           | ✓               |
| [rules](https://markuplint.dev/configuration#rules)                           | Object | †1                 | -               |
| [nodeRules](https://markuplint.dev/configuration#nodeRules)                   | Array  | Append             | -               |
| [childNodeRules](https://markuplint.dev/configuration#childNodeRules)         | Array  | Append             | -               |
| [pretenders](https://markuplint.dev/configuration#pretenders)                 | Object | †3                 | -               |

## †1 Rules Merge Behavior

| Value Type                | Behavior |
| ------------------------- | -------- |
| String / Number / Boolean | Override |
| Array                     | Append   |
| Object                    | †2       |

## †2 Rule Details Merge Behavior

| Property | Type   | Behavior      |
| -------- | ------ | ------------- |
| value    | †1     | †1            |
| severity | Enum   | Override      |
| options  | Object | Shallow Merge |
| reason   | String | Override      |

## †3 Pretenders Merge Behavior

| Property | Type  | Behavior |
| -------- | ----- | -------- |
| files    | Array | Override |
| data     | Array | Append   |
