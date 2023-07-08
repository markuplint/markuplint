# The `__pluginName__` rule

TODO: Write a description

## Install

```shell
npm install --save-dev {{ name }}
```

## Applying rules

```json
{
  "plugins": ["__pluginName__"],
  "rules": {
    "__pluginName__/__ruleName__": {
      "value": "__MAIN_VALUE__",
      "options": {
        "foo": "__OPTIONAL_VALUE__",
        "bar": [123, 456, 789]
      }
    }
  }
}
```

## Rule Details

👎 Examples of **incorrect** code for this rule

```html
<todo>Write incorrect codes</todo>
```

👍 Examples of **correct** code for this rule

```html
<todo>Write correct codes</todo>
```

### Interface

- Type: `string`
- Default Value: `"__DEFAULT_MAIN_VALUE__"`

### Options

TODO: Write a description

#### Interface

| Property | Type       | Optional | Default Value | Description               |
| -------- | ---------- | -------- | ------------- | ------------------------- |
| `foo`    | `string`   | ✔       | `undefined`   | TODO: Write a description |
| `bar`    | `number[]` | ✔       | `undefined`   | TODO: Write a description |

### Default severity

TODO: Choose `error` or `warning`
