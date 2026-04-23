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

- Node.js v24 or later (the exact version is pinned in `.mise.toml`; install [mise](https://mise.jdx.dev/) and run `mise install` to match it)
- Yarn 4.x (pinned in both `.mise.toml` and `package.json#packageManager` — bump them together; CI derives the sandbox Yarn version from the latter)

After cloning this repository, you can also install them through [Docker](https://github.com/markuplint/markuplint/blob/main/Dockerfile).

When you wrote code then:

- Format and lint code through `yarn lint`.
- Check to build successfully through `yarn build`.
- Test your code through `yarn test` (this also runs TypeScript type-checking on spec files).
- Push to the topic branch and open a pull request.
- Assign reviewer:
  - For the improved code: @yusukehirao
  - For plugins: @yusukehirao
  - For documents/website: @yusukehirao, @kagankan

### nu-validator compatibility benchmark

`tests/external/` houses a local-only benchmark that compares markuplint
with [Nu Html Checker](https://validator.github.io/validator/). It is not
wired into CI. See [`tests/external/CLAUDE.md`](./tests/external/CLAUDE.md)
for the setup, command list, and the Docker / `excluded-ids.json` workflow.

## Publishing the VS Code Extension

The npm packages are published automatically from CI (npm trusted publisher).
The VS Code extension, in contrast, is published **manually** after the core
packages land.

### Publisher

The extension is published under the `markuplint` publisher
(Marketplace ID: `markuplint.vscode-markuplint`).

The legacy `yusukehirao.vscode-markuplint` ID is deprecated from
`v5.0.0-rc.3` onwards and no longer receives updates.

`yarn vscode:login` runs `vsce login markuplint`, so the Azure DevOps
Personal Access Token you authenticate with must have rights on the
`markuplint` publisher.

### Versioning

All packages — including the VS Code extension — share a single version
because Lerna is configured in non-independent mode. The extension version
therefore always matches the core version (e.g. `5.0.0`, `5.0.0-rc.2`).

VS Code's recommended odd/even minor split is **not** used. Instead,
semver prerelease tags (`-alpha.x` / `-beta.x` / `-rc.x`) are mapped to the
Marketplace prerelease channel.

### When to publish which mode

| Core version tag                 | Command                   | Marketplace channel |
| -------------------------------- | ------------------------- | ------------------- |
| Stable (e.g. `5.0.0`)            | `yarn vscode:release`     | Stable              |
| `-alpha.x` / `-beta.x` / `-rc.x` | `yarn vscode:pre-release` | Prerelease          |

`vscode:package` / `vscode:pre-package` produce a local `.vsix` without
publishing — use these for smoke-testing before running the publish commands.

### Workflow

1. Wait for the core packages to be published to npm by CI
2. Pull the release tag locally (`git pull --tags`)
3. (First time only) `yarn vscode:login` to authenticate with Marketplace
4. Run `yarn vscode:release` **or** `yarn vscode:pre-release` depending on the
   tag (see the table above)

Valid modes accepted by `vscode/scripts/install.mjs`: `package`, `release`,
`pre-package`, `pre-release`. Any other argument exits non-zero.

### Reference

- [VS Code: Prerelease Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#prerelease-extensions)
- [@vscode/vsce](https://github.com/microsoft/vscode-vsce)
