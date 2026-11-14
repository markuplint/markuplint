//! Test support: the strings the equivalence tests feed to a hand-written matcher and to the
//! regular expression it replaced.

/// Calls `f` with every string of up to `max_len` pieces of `alphabet`, the empty string included.
pub fn for_each_string(alphabet: &[&str], max_len: usize, f: &mut dyn FnMut(&str)) {
    let mut current = String::new();
    walk(alphabet, max_len, &mut current, f);
}

fn walk(alphabet: &[&str], remaining: usize, current: &mut String, f: &mut dyn FnMut(&str)) {
    f(current);
    if remaining == 0 {
        return;
    }
    for piece in alphabet {
        let len = current.len();
        current.push_str(piece);
        walk(alphabet, remaining - 1, current, f);
        current.truncate(len);
    }
}
