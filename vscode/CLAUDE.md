# vscode

## Release policy (MANDATORY)

The VS Code Marketplace rejects semver prerelease suffixes (`5.0.0-rc.4` is
literally refused on upload), and its own prerelease channel requires a
version scheme divorced from semver (an odd/even minor split), which
conflicts with this repo's Lerna non-independent versioning. Rather than
maintain a divergent version mapping for the extension alone, releases are
split by channel instead:

| Release type                                  | npm     | Marketplace                | GitHub Release (`.vsix`)      |
| --------------------------------------------- | ------- | -------------------------- | ----------------------------- |
| Stable (`X.Y.Z`)                              | CI auto | Manual publish (see below) | Attach for archival           |
| Prerelease (`-rc.N` / `-beta.N` / `-alpha.N`) | CI auto | **Never**                  | **Only** distribution channel |

A prerelease build is therefore installable only via the `.vsix` attached to
its GitHub Release, never via the Marketplace's own prerelease channel.

## Publishing (stable only)

There is no CI publish job for the extension — Marketplace publishing is a
manual step performed after the npm packages for that version are out:

```bash
yarn vscode:package   # builds and verifies the VSIX (installable, no upload)
yarn vscode:release   # publishes the verified VSIX to the Marketplace
```

Always run `vscode:package` first and sanity-check the resulting `.vsix`
before `vscode:release` — there is no dry-run for the Marketplace upload
itself.

An OIDC-based publish pipeline (replacing the long-lived Marketplace PAT)
was scoped but not adopted — there is no `vscode-marketplace` GitHub
Environment and no Azure-related repo secret. Publishing still uses the PAT
via `vsce`'s interactive login (`yarn vscode:login`).

## Build modes

`vscode/scripts/install.mjs [mode]` only accepts `package` and `release`
(see `vscode/scripts/resolve-mode.mjs`). Prerelease modes (`pre-package` /
`pre-release`) existed briefly during the switch to the `markuplint`
publisher namespace and were removed once the policy above was decided —
don't reintroduce them without revisiting that decision.

## Legacy publisher

The extension previously published under `yusukehirao.vscode-markuplint`.
That listing is deprecated in favor of the `markuplint` publisher namespace
above; its final version and migration notice are tracked separately and are
out of scope for this file.
