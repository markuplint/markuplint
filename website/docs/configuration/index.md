# Configuration

## Configuration file

The configuration file is for specifying the rules and options that apply to. That is usually automatic loading, but you also can load the config expected explicitly using CLI or API.

The automatic loading is **recursively searching up from a directory that the target exists**. In other words, it applies the configuration files closest to each target.

```
📂 A
├── 📄 .markuplintrc # (1)
└── 📂 B
    ├── 📄 index.html # <- Apply (1) A/.markuplintrc
    └── 📂 C
        ├── 📄 index.html # <- Apply (1) A/.markuplintrc
        └── 📂 D
            ├── 📄 .markuplintrc # (2)
            └── 📄 index.html # <- Apply (2) A/B/C/D/.markuplintrc
```

:::note
**Markuplint** stops searching files if found it what is closest. It is **different** from the default of [**ESLint**](https://eslint.org/docs/latest/user-guide/configuring/configuration-files#cascading-and-hierarchy). Its behavior is the same as ESLint is specified as `{ "root": true }`.

Specify the `extends` field if you want to apply configuration files are upper layers more.
:::

### Format and Filename

You can get even if the filename is not `.markuplintrc`.

The priority applied names are:

- `markuplint` field in `package.json`
- `markuplintrc.json`
- `markuplintrc.yaml`
- `markuplintrc.yml`
- `markuplintrc.js`
- `markuplintrc.cjs`
- `markuplint.config.js`
- `markuplint.config.cjs`

`.markuplintrc`'s format is JSON (with comment) and also YAML.
