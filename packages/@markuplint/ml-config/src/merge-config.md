## Merge Props

| Options                                                                       | Type   | Merging             | Path Absolutize |
| ----------------------------------------------------------------------------- | ------ | ------------------- | --------------- |
| [ruleCommonSettings](https://markuplint.dev/configuration#ruleCommonSettings) | Object | Shallow Merge       | ✓               |
| [plugins](https://markuplint.dev/configuration#plugins)                       | Array  | Add uniquely        | ✓               |
| [parser](https://markuplint.dev/configuration#parser)                         | Object | Shallow Merge       | ✓               |
| [parserOptions](https://markuplint.dev/configuration#parserOptions)           | Object | Shallow Merge       | ✓               |
| [specs](https://markuplint.dev/configuration#specs)                           | Object | Shallow Merge       | -               |
| [extends](https://markuplint.dev/configuration#extends)                       | Array  | Delete after merged | ✓               |
| [excludeFiles](https://markuplint.dev/configuration#excludeFiles)             | Array  | Add uniquely        | ✓               |
| [rules](https://markuplint.dev/configuration#rules)                           | Object | †1                  | -               |
| [nodeRules](https://markuplint.dev/configuration#nodeRules)                   | Array  | Add                 | -               |
| [childNodeRules](https://markuplint.dev/configuration#childNodeRules)         | Array  | Add                 | -               |
| [severity](https://markuplint.dev/configuration#severity)                     | Object | Shallow Merge       | -               |
| [pretenders](https://markuplint.dev/configuration#pretenders)                 | Object | †3                  | -               |
| [overrideMode](https://markuplint.dev/configuration#overrideMode)             | String | Overwrite           | -               |
| [overrides](https://markuplint.dev/configuration#overrides)                   | Object | Per-key merge       | -               |

## †1 Merge Rules

| Value Type                | Merging   |
| ------------------------- | --------- |
| String / Number / Boolean | Overwrite |
| Array                     | Overwrite |
| Object                    | †2        |

## †2 Merge Rule Details

| Property | Type   | Merging       |
| -------- | ------ | ------------- |
| value    | †1     | †1            |
| severity | Enum   | Overwrite     |
| options  | Object | Shallow Merge |
| reason   | String | Overwrite     |

## †3 Merge Pretenders

| Property | Type  | Merging   |
| -------- | ----- | --------- |
| files    | Array | Overwrite |
| imports  | Array | Overwrite |
| data     | Array | Add       |
