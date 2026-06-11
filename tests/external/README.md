# `tests/external`

Snapshot-based compatibility benchmark between markuplint and
[Nu Html Checker](https://validator.github.io/validator/). Not part
of CI — maintainers run it locally when they want fresh coverage
numbers.

See [`CLAUDE.md`](./CLAUDE.md) for the operating policy and
task-to-skill routing.

## TL;DR

```
git submodule update --init tests/external/validator   # first time only
yarn bench:update                                       # ~2 min, needs Docker
```

Raw snapshot trees (`snapshots/nu-validator/`, `snapshots/markuplint/`)
are git-ignored and regenerate locally. Git tracks only the diff
summary, exclusion list, metadata, and generated spec. Start reviewing
at `snapshots/diff/summary.md`.
