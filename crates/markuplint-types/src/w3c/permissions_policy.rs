//! W3C Serialized Permissions Policy validator.
//!
//! Validates the `allow` attribute value per the W3C Permissions Policy spec.
//!
//! <https://w3c.github.io/webappsec-permissions-policy/#serialized-permissions-policy>
//!
//! ```abnf
//! serialized-permissions-policy = serialized-policy-directive *(";" serialized-policy-directive)
//! serialized-policy-directive = feature-identifier [RWS allow-list]
//! feature-identifier = 1*( ALPHA / DIGIT / "-")
//! allow-list = allow-list-value *(RWS allow-list-value)
//! allow-list-value = serialized-origin / "*" / "'self'" / "'src'" / "'none'"
//! ```

/// Validates a serialized permissions policy string.
///
/// # Examples
///
/// ```
/// use markuplint_types::w3c::permissions_policy::is_serialized_permissions_policy;
///
/// assert!(is_serialized_permissions_policy("autoplay"));
/// assert!(is_serialized_permissions_policy("autoplay *"));
/// assert!(is_serialized_permissions_policy("autoplay; gyroscope"));
/// assert!(!is_serialized_permissions_policy(""));
/// ```
#[must_use]
pub fn is_serialized_permissions_policy(value: &str) -> bool {
    if value.is_empty() {
        return false;
    }

    for directive in value.split(';') {
        if !is_valid_directive(directive) {
            return false;
        }
    }

    true
}

fn is_valid_directive(directive: &str) -> bool {
    let trimmed = directive.trim_start();

    if trimmed.is_empty() {
        return false;
    }

    // Split into tokens by whitespace
    let mut tokens = trimmed.split_ascii_whitespace();

    // First token must be a feature-identifier
    let Some(feature_id) = tokens.next() else {
        return false;
    };

    if !is_feature_identifier(feature_id) {
        return false;
    }

    // Remaining tokens form the allow-list (optional)
    for token in tokens {
        if !is_allow_list_value(token) {
            return false;
        }
    }

    true
}

/// `feature-identifier = 1*( ALPHA / DIGIT / "-")`
fn is_feature_identifier(value: &str) -> bool {
    !value.is_empty() && value.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
}

/// `allow-list-value = serialized-origin / "*" / "'self'" / "'src'" / "'none'"`
fn is_allow_list_value(value: &str) -> bool {
    // Check special keywords first
    if value == "*"
        || value.eq_ignore_ascii_case("'self'")
        || value.eq_ignore_ascii_case("'src'")
        || value.eq_ignore_ascii_case("'none'")
    {
        return true;
    }

    // Must be a serialized origin (URL)
    is_serialized_origin(value)
}

/// Validates a serialized origin.
///
/// A serialized origin is a URL with restrictions:
/// - Must be parseable as a URL
/// - No path (or just `/`), no query, no hash
/// - No username or password
/// - The host must appear literally in the value (no IDN normalization)
/// - Must not contain raw `'`, `*`, `,`, or `;` (must be percent-encoded)
fn is_serialized_origin(value: &str) -> bool {
    // Must not contain forbidden raw characters
    if value.contains('\'') || value.contains('*') || value.contains(',') || value.contains(';') {
        return false;
    }

    let Ok(url) = url::Url::parse(value) else {
        return false;
    };

    // No path (or just "/")
    if url.path() != "/" && !url.path().is_empty() {
        return false;
    }

    // No query
    if url.query().is_some() {
        return false;
    }

    // No fragment
    if url.fragment().is_some() {
        return false;
    }

    // No username
    if !url.username().is_empty() {
        return false;
    }

    // No password
    if url.password().is_some() {
        return false;
    }

    // Host must appear literally in the value (reject IDN normalization)
    if url.host_str().is_some_and(|host| !value.contains(host)) {
        return false;
    }

    true
}
