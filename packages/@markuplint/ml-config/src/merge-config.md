## Merge Props

| Options                                                                       | Type                   | Merging                      | Path Absolutize |
| ----------------------------------------------------------------------------- | ---------------------- | ---------------------------- | --------------- |
| [ruleCommonSettings](https://markuplint.dev/configuration#ruleCommonSettings) | Object                 | Merge                        | ✓               |
| [plugins](https://markuplint.dev/configuration#plugins)                       | Array                  | Add uniquely                 | ✓               |
| [parser](https://markuplint.dev/configuration#parser)                         | Object                 | Merge                        | ✓               |
| [parserOptions](https://markuplint.dev/configuration#parserOptions)           | Object                 | Merge                        | ✓               |
| [specs](https://markuplint.dev/configuration#specs)                           | Object(v2) / Array(v1) | Merge(v2) / Add uniquely(v1) | -               |
| [extends](https://markuplint.dev/configuration#extends)                       | Array                  | Delete after merged          | ✓               |
| [excludeFiles](https://markuplint.dev/configuration#excludeFiles)             | Array                  | Add uniquely                 | ✓               |
| [rules](https://markuplint.dev/configuration#rules)                           | Object                 | †1                           | -               |
| [nodeRules](https://markuplint.dev/configuration#nodeRules)                   | Array                  | Add                          | -               |
| [childNodeRules](https://markuplint.dev/configuration#childNodeRules)         | Array                  | Add                          | -               |

## †1 Merge Rules

| Value Type                | Merging          |
| ------------------------- | ---------------- |
| String / Number / Boolean | Merge(Overwrite) |
| Array                     | Add              |
| Object                    | †2               |

## †2 Merge Rule Details

| options  | Type   | Merging                                        |
| -------- | ------ | ---------------------------------------------- |
| value    | †1     | †1                                             |
| severity | Enum   | Merge(Overwrite)                               |
| option   | Object | Deep Merge(**An array is replaced, no added**) |
| reason   | String | Merge(Overwrite)                               |
