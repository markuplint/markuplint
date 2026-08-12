// Temporary file: verifies that the CI oxlint step actually lints and fails (#3974).
// This commit is reverted immediately after the lint job result is observed.
const unusedSeedVariable = /^[x]$/;
