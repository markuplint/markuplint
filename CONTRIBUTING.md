# Contributing

Thanks for trying to contribute or interesting.

You can contribute to:

- [Report any issues or bugs](https://github.com/markuplint/markuplint/issues).
- Update [schemas](https://github.com/markuplint/markuplint/tree/main/packages/%40markuplint/html-spec/src) according to the updated specs of W3C/WHATWG.
- [Request or propose something new function](https://github.com/markuplint/markuplint/issues/new?assignees=%40YusukeHirao&labels=Features%3A+Proposal&template=feature.md&title=Supporting+for).
- Improve APIs and CLIs.
- Review to design for linting according to the specs.
- Improve the documentation and [the website](https://markuplint.dev/).
- Re-design and improve DevOps.
- Improve [testing](https://github.com/markuplint/markuplint/actions?query=workflow%3ATest) and [coverage](https://coveralls.io/github/markuplint/markuplint?branch=main).
- Create and develop its plugins.

Its purpose is all developers are able to better markup and fit each of diverse their projects. So we want you to contribute. Your thought leads to diversity.

## Code contribution

You need:

- Node.js v22 or later.
- NPM
- (Optional) Volta

After cloning this repository, you can also install them through [Docker](https://github.com/markuplint/markuplint/blob/main/Dockerfile).

When you wrote code then:

- Format and lint code through `npm run lint`.
- Check to build successfully through `npm run build`.
- Test your code through `npm run test`.
- Push to the topic branch and open a pull request.
- Assign reviewer:
  - For the improved code: @yusukehirao
  - For plugins: @yusukehirao
  - For documents/website: @yusukehirao, @kagankan
