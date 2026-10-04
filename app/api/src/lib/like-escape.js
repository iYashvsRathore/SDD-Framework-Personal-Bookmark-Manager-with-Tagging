/**
 * Escapes a value so it is matched as LITERAL text when bound into a
 * `LIKE ? ESCAPE '\'` pattern (S6, data-model.md section 3).
 *
 * `%` and `_` are SQL LIKE wildcards; `\` is the escape character itself, so it
 * must be escaped first, or an escaped `%`/`_` in the input would be unescaped
 * again by the later replacement. This is the one place this convention lives —
 * shared by F02's tag-prefix query now and reserved for F05's future search
 * (data-model.md section 3).
 *
 * @param {string} value already-trimmed, already-lowercased text — never a
 *   pattern a caller intends to match
 * @returns {string} `value` with `\`, `%` and `_` each prefixed with `\`
 */
export function escapeLikePattern(value) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
