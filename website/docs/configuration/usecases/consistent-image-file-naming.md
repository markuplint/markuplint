# Consistent image file naming

Case you want to consist file names of an img element and source elements.

## Rule

Suppose defining the following rule:

- The file name of an img element is a basis.
- Set to source element's the file name that added resolution with `@` to the base name.
- If the file name is `logo.png`, it must add `@2x` prefix to be `logo@2x.png` to the source element.
- It will disallow the format that `logo-2x.png` etc.

```html
<picture>
  <!-- ✅ Correct -->
  <source srcset="logo@3x.png 3x" />
  <source srcset="logo@2x.png 2x" />

  <!-- ❌ Incorrect: Invalid format -->
  <source srcset="logo-3x.png 3x" />

  <!-- ❌ Incorrect: Different name -->
  <source srcset="symbol@2x.png 2x" />

  <!-- It is the basis -->
  <img src="logo.png" alt="logo" />
</picture>
```

## Configuration

Use [`invalid-attr`](/docs/rules/invalid-attr) rule with [`regexSelector`](/docs/configuration/properties#regexselector).

```json class=config
{
  "rules": {
    "invalid-attr": true
  },
  "nodeRules": [
    {
      "regexSelector": {
        "nodeName": "img",
        "attrName": "src",
        "attrValue":
          // Capture a file name and its extension from img elements while...
          "/^(?<FileName>.+)\\.(?<Exp>png|jpg|webp|gif)$/",
        // Use together combinator to select preceding-sibling source elements
        "combination": {
          "combinator": ":has(~)",
          "nodeName": "source"
        }
      },
      "rules": {
        "invalid-attr": {
          "options": {
            "allowAttrs": [
              {
                "name": "srcset",
                "value": {
                  // Expand a file name and its extension by Mustache format
                  "enum": ["{{FileName}}@2x.{{Exp}} 2x", "{{FileName}}@3x.{{Exp}} 3x"]
                }
              }
            ]
          }
        }
      }
    }
  ]
}
```
