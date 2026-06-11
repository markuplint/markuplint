pub type MatchResult = Result<(), MismatchInfo>;

#[derive(Clone, Debug, PartialEq)]
pub struct MismatchInfo {
    /// Byte offset in the input where the mismatch occurred.
    pub offset: usize,
    /// Length of the mismatched segment in bytes.
    pub length: usize,
    /// What was expected at the mismatch point.
    pub expected: Vec<String>,
}

impl std::fmt::Display for MismatchInfo {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.expected.is_empty() {
            write!(f, "Unexpected value at offset {}", self.offset)
        } else {
            write!(f, "Expected {} at offset {}", self.expected.join(" | "), self.offset)
        }
    }
}

impl std::error::Error for MismatchInfo {}
