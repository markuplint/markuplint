//! The order of the nodes of a region that an encoder makes: by their tag, then by how many items or entries they have, then by
//! the position of their index and by their first field as the walk of `encode.rs` numbered them, and the walk's own number
//! for the rest. What is the same is then together in the words, which is what a compressor needs; a reader asks for nothing
//! of the order, since it reaches a node by the number that a list or the root holds. This is the pass of `group.ts`, and the
//! bytes are the same.
//!
//! What moves is the numbers of the nodes, which only the lists and the root hold. The lists are written again in the order
//! of the first node that has them, with the numbers of the nodes that moved. A list that an array and an object have
//! together (the same words, which the walk shares) is two lists now, since the words of an object hold the keys that no
//! number moves.

use std::collections::HashMap;

use crate::format::{BARE_FLAG, tag};
use crate::read::{word, words_to_bytes};

/// The error of a list that a region does not have.
fn outside_lists() -> String {
    "A list is not inside the lists of its region".to_string()
}

/// The words of the list of an array or of an object with the numbers of its nodes that moved: the items of an array; the keys,
/// which no number moves, and the nodes, of an object (in pairs for rows, or all the keys and then all the nodes for columns).
fn moved_list(
    own: &[u32],
    node_tag: u32,
    columns: bool,
    moved: &dyn Fn(u32) -> Result<u32, String>,
) -> Result<Vec<u32>, String> {
    if node_tag == tag::ARRAY {
        return own.iter().map(|item| moved(*item)).collect();
    }
    if columns {
        let (keys, nodes) = own.split_at(own.len() / 2);
        let mut words = keys.to_vec();
        for item in nodes {
            words.push(moved(*item)?);
        }
        return Ok(words);
    }
    let mut words = Vec::with_capacity(own.len());
    for entry in own.as_chunks::<2>().0 {
        words.push(entry[0]);
        words.push(moved(entry[1])?);
    }
    Ok(words)
}

/// Numbers the nodes of the words of a region again.
///
/// # Errors
///
/// A region that is not as long as its counts say, whose root is not one of its nodes, whose lists hold a node that it lacks, or
/// that has an index without keys that refers to a list that no object has. `bare` is whether the indexes of objects have no
/// keys and say where the list of an object that has them is: the lists are written again, so they are told the new position.
pub fn group_region(region: &[u8], columns: bool, bare: bool) -> Result<Vec<u8>, String> {
    let words: Vec<u32> = (0..region.len() / 4).map(|index| word(region, index)).collect();
    let header = |at: usize| {
        words
            .get(at)
            .copied()
            .ok_or_else(|| "A region is cut short".to_string())
    };
    let count_word = header(0)?;
    let index_words_word = header(2)?;
    let count = count_word as usize;
    let list_words = header(1)? as usize;
    let index_words = index_words_word as usize;
    let root = header(3)? as usize;
    if words.len() != 4 + 4 * count + list_words + index_words || root >= count {
        return Err("A region is not as long as its header says".to_string());
    }
    let lists_at = 4 + 4 * count;
    let indexes_at = lists_at + list_words;
    let field = |field: usize, node: usize| {
        if columns {
            words[4 + field * count + node]
        } else {
            words[4 + 4 * node + field]
        }
    };
    // `len` words of the lists from the position `at` of them
    let list = |at: usize, len: usize| {
        words
            .get(lists_at + at..lists_at + at + len)
            .filter(|_| at + len <= list_words)
            .ok_or_else(outside_lists)
    };

    let mut order: Vec<usize> = (0..count).collect();
    order.sort_by_key(|node| {
        (
            field(0, *node),
            field(2, *node),
            field(3, *node),
            field(1, *node),
            *node,
        )
    });
    let mut renumbered = vec![0_u32; count];
    for (position, node) in order.iter().enumerate() {
        renumbered[*node] = u32::try_from(position).map_err(|_| "Too many nodes".to_string())?;
    }
    let moved = |item: u32| {
        renumbered
            .get(item as usize)
            .copied()
            .ok_or_else(|| "A list holds a node that the region lacks".to_string())
    };

    let mut lists: Vec<u32> = Vec::with_capacity(list_words);
    // The lists that were made, by their old position: the new position, and how many items or entries they were made for
    let mut arrays: HashMap<u32, (u32, u32)> = HashMap::new();
    let mut objects: HashMap<u32, (u32, u32)> = HashMap::new();
    let mut nodes: Vec<[u32; 4]> = Vec::with_capacity(count);
    for node in &order {
        let node_tag = field(0, *node);
        let items_word = field(2, *node);
        let items = items_word as usize;
        let mut a = field(1, *node);
        // An empty array or object has no list, and its `a` is 0 as the encoder wrote it; a reader does not use it
        if (node_tag == tag::ARRAY || node_tag == tag::OBJECT) && items > 0 {
            let known = if node_tag == tag::ARRAY {
                &mut arrays
            } else {
                &mut objects
            };
            if let Some((made, made_for)) = known.get(&a) {
                // The encoder shares a list only when its words are the same, which gives the same count; a list that two
                // nodes share with different counts would be one of them cut or lengthened without a sign
                if *made_for != items_word {
                    return Err(format!("Two nodes share a list with {made_for} and {items_word} items"));
                }
                a = *made;
            } else {
                let made = u32::try_from(lists.len()).map_err(|_| "Too many list words".to_string())?;
                // The words of the list: the nodes of an array, or the keys and the nodes of an object
                let own = list(a as usize, if node_tag == tag::ARRAY { items } else { 2 * items })?;
                lists.extend(moved_list(own, node_tag, columns, &moved)?);
                known.insert(a, (made, items_word));
                a = made;
            }
        }
        nodes.push([node_tag, a, items_word, field(3, *node)]);
    }

    let mut section: Vec<u32> = Vec::with_capacity(4 + 4 * count + lists.len() + index_words);
    section.push(count_word);
    section.push(u32::try_from(lists.len()).map_err(|_| "Too many list words".to_string())?);
    section.push(index_words_word);
    section.push(renumbered[root]);
    if columns {
        for f in 0..4 {
            section.extend(nodes.iter().map(|node| node[f]));
        }
    } else {
        section.extend(nodes.iter().flatten());
    }
    section.extend_from_slice(&lists);
    let mut index_records = words[indexes_at..indexes_at + index_words].to_vec();
    if bare {
        tell_indexes(&mut index_records, &objects)?;
    }
    section.extend_from_slice(&index_records);
    Ok(words_to_bytes(&section))
}

/// Tells the indexes without keys where the list of their object is now: the last word of such a record is the position of a
/// list, which the lists that were written again have at another one.
///
/// # Errors
///
/// A record that is not inside the indexes, or whose list was not written again (no object has it).
fn tell_indexes(indexes: &mut [u32], objects: &HashMap<u32, (u32, u32)>) -> Result<(), String> {
    let mut at = 0;
    while at < indexes.len() {
        if at + 5 > indexes.len() {
            return Err("An index is not inside the indexes of its region".to_string());
        }
        let entries = indexes[at] as usize;
        let is_bare = indexes[at + 1] & BARE_FLAG != 0;
        let length =
            5 + (indexes[at + 3] as usize).div_ceil(2) + indexes[at + 4] as usize + if is_bare { 1 } else { entries };
        if at + length > indexes.len() {
            return Err("An index is not inside the indexes of its region".to_string());
        }
        if is_bare {
            let (made, _) = objects
                .get(&indexes[at + length - 1])
                .ok_or_else(|| format!("The index at {at} has no keys and no object has the list that it refers to"))?;
            indexes[at + length - 1] = *made;
        }
        at += length;
    }
    Ok(())
}
