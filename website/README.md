# Markuplint website

The source of Markuplint website (<https://markuplint.dev/>).

## Development

To get started:

```shell
yarn install
```

To start a development server (of English website):

```shell
yarn run site:start
```

To start a development server of another language website, specify the `--locale` option, such as:

```shell
yarn run site:start --locale ja
```

## `.env`

It supports `.env` file.

Supported variables are the following:

- `NEXT_VERSION`: It gives that the website is the next version. The setting of **Environment variables** at [next.markuplint.dev](https://next.markuplint.dev) on **Netlify** requires this.
