# `tests/external`

Snapshot-based compatibility benchmark between markuplint and
[Nu Html Checker](https://validator.github.io/validator/). Not part
of CI — maintainers run it locally when they want fresh coverage
numbers.

See [`CLAUDE.md`](./CLAUDE.md) for commands, architecture, and the
`excluded-ids.json` workflow.

## TL;DR

```
git submodule update --init tests/external/validator   # first time only
yarn bench:update                                       # ~2 min, needs Docker
```

Raw snapshot trees (`snapshots/nu-validator/`, `snapshots/markuplint/`)
are git-ignored and regenerate locally. Git tracks only the diff
summary, exclusion list, metadata, and generated spec.

Artefacts to review: `snapshots/diff/summary.md`,
`snapshots/diff/coverage.json`, and the two `*-over-detection.json`
files alongside them.
