const gitignoreInput = document.getElementById('gitignore-input');
const p4ignoreOutput = document.getElementById('p4ignore-output');
const convertButton = document.getElementById('convert-button');
const statusMessage = document.getElementById('status-message');

// p4ignore has no character-class syntax, so every [...] group has to be
// expanded into one literal line per combination. That product grows fast:
// four [0-9] groups on a single line is already 10,000 lines. Past these
// budgets we fall back to '*' rather than expanding.
const MAX_VARIANTS_PER_LINE = 64;
const MAX_TOTAL_LINES = 20000;

// 'a/**/b' is emitted as both 'a/**/b' and 'a/b'; more than a few of those on
// one line isn't worth the doubling.
const MAX_DOUBLE_STAR_SEGMENTS = 3;

convertButton.addEventListener('click', () => {
    const result = convertGitignoreToP4ignore(gitignoreInput.value);

    p4ignoreOutput.value = result.text;
    statusMessage.textContent = describeResult(result);
});

function describeResult(result) {
    const notes = [];

    if (result.anchoredCount > 0) {
        notes.push(
            `${result.anchoredCount} line(s) gained a leading '/': a pattern like ` +
            `'Assets/aa/' is anchored by git but floats to any depth in P4.`
        );
    }
    if (result.collapsedCount > 0) {
        notes.push(
            `${result.collapsedCount} line(s) had too many character-class combinations ` +
            `to expand, so their [...] groups were replaced with '*' (which matches more).`
        );
    }
    if (result.questionMarkCount > 0) {
        notes.push(
            `${result.questionMarkCount} line(s) used '?', which p4ignore does not treat ` +
            `as a wildcard at all; replaced with '*' (which matches more).`
        );
    }
    if (result.tripleDotCount > 0) {
        notes.push(
            `${result.tripleDotCount} line(s) contain a literal '...', which p4 rejects ` +
            `as a "senseless juxtaposition" — those rules will not match anything.`
        );
    }
    if (result.truncated) {
        notes.push(`Output stopped at ${MAX_TOTAL_LINES.toLocaleString()} lines.`);
    }

    return notes.join(' ');
}

function convertGitignoreToP4ignore(gitignoreContent) {
    const gitignoreLines = gitignoreContent.split('\n');
    const p4ignoreLines = [];
    let anchoredCount = 0;
    let collapsedCount = 0;
    let questionMarkCount = 0;
    let tripleDotCount = 0;
    let truncated = false;

    for (const line of gitignoreLines) {
        // Remove leading and trailing whitespace.
        let trimmedLine = line.trim();

        // Skip blank lines and comments.
        if (trimmedLine === "" || trimmedLine.startsWith("#")) {
            p4ignoreLines.push(line); // Keep comments and blank lines
            continue;
        }

        // Save leading ! if present. Both syntaxes use it to re-include, and it
        // stays in front of any leading '/' we add below.
        let prefix = "";
        if (trimmedLine.startsWith("!")) {
            prefix = "!";
            trimmedLine = trimmedLine.slice(1);
        }

        // Character classes first, so the path rules below see real separators.
        const expanded = expandLine(trimmedLine);
        if (expanded.collapsed) {
            collapsedCount++;
        }

        const translated = [];
        const seen = new Set();
        let anchoredThisLine = false;
        let rewroteQuestionMark = false;
        let hasTripleDot = false;

        for (const variant of expanded.lines) {
            const rewritten = rewriteQuestionMarks(variant);
            if (rewritten !== variant) {
                rewroteQuestionMark = true;
            }

            const result = translatePattern(rewritten);
            if (result.anchored) {
                anchoredThisLine = true;
            }
            for (const pattern of result.lines) {
                // We only ever emit '**' for recursion, so any run of three or
                // more dots came from the user and will be rejected by p4.
                if (/\.{3,}/.test(pattern)) {
                    hasTripleDot = true;
                }
                // Safe to de-duplicate within a single source line: these are
                // all emitted together, so no '!' rule can sit between them to
                // make the repeat meaningful.
                if (!seen.has(pattern)) {
                    seen.add(pattern);
                    translated.push(prefix + pattern);
                }
            }
        }
        if (anchoredThisLine) {
            anchoredCount++;
        }
        if (rewroteQuestionMark) {
            questionMarkCount++;
        }
        if (hasTripleDot) {
            tripleDotCount++;
        }

        if (p4ignoreLines.length + translated.length > MAX_TOTAL_LINES) {
            truncated = true;
            break;
        }
        p4ignoreLines.push(...translated);
    }

    return {
        text: p4ignoreLines.join('\n'),
        anchoredCount,
        collapsedCount,
        questionMarkCount,
        tripleDotCount,
        truncated
    };
}

// git's '?' matches exactly one character. p4ignore has no equivalent — it
// passes '?' straight through as a literal, so the rule matches nothing at all
// (verified with `p4 ignores -i -v`, P4/2025.2). '*' is the closest thing:
// it matches zero or more characters but never crosses a '/'.
function rewriteQuestionMarks(pattern) {
    if (!pattern.includes('?')) {
        return pattern;
    }

    // '**' is meaningful (it compiles to Perforce's '...' and does cross '/'),
    // so hide it before collapsing runs of wildcards, or 'a??b' would turn into
    // 'a**b' and match far more than intended.
    const RECURSIVE = '\u0000';
    let result = pattern.split('**').join(RECURSIVE);

    // Each run of '?' and '*' becomes a single '*'.
    result = result.replace(/[?*]+/g, '*');

    // A '*' immediately beside a '**' adds nothing.
    result = result.replace(/\*?\u0000\*?/g, RECURSIVE).replace(/\u0000+/g, RECURSIVE);

    return result.split(RECURSIVE).join('**');
}

// Rewrite one already-class-free pattern from gitignore path semantics to
// p4ignore path semantics.
//
// The rule that differs: git anchors any pattern containing a separator other
// than a trailing one ('Assets/aa/' means <root>/Assets/aa/), while P4 floats
// it to any depth unless it starts with '/'. Patterns with no separator at all
// float in both, so they are left bare.
function translatePattern(pattern) {
    // A trailing '/' means "directory only" in both syntaxes. Set it aside so
    // it isn't mistaken for an internal separator, then put it back.
    const dirOnly = pattern.endsWith('/');
    let body = dirOnly ? pattern.slice(0, -1) : pattern;

    let floats;
    let anchored = false;

    if (body.startsWith('**/')) {
        // git's leading '**/' means "at any depth, including the root", but
        // P4's '**/' starts one level down. Dropping it leaves a bare pattern,
        // which floats over every depth including the root.
        body = body.slice(3);
        floats = true;
    } else if (body.startsWith('/')) {
        body = body.slice(1);
        floats = false;
    } else if (body.startsWith('./')) {
        // './foo' is anchored the same way '/foo' is.
        body = body.slice(2);
        floats = false;
    } else if (body.includes('/')) {
        // Anchored by git, would float in P4 — this is the case that needs the
        // leading '/' added.
        floats = false;
        anchored = true;
    } else {
        floats = true;
    }

    if (body === '') {
        return { lines: [pattern], anchored: false };
    }

    const leader = floats ? '' : '/';
    const suffix = dirOnly ? '/' : '';

    return {
        lines: expandDoubleStar(body).map(variant => leader + variant + suffix),
        anchored
    };
}

// git's 'a/**/b' matches 'a/b' as well as 'a/x/b'. P4's '**' starts a level
// down, so emit both forms — the extra line is redundant at worst.
function expandDoubleStar(body) {
    const segments = body.split('/**/').length - 1;
    if (segments === 0 || segments > MAX_DOUBLE_STAR_SEGMENTS) {
        return [body];
    }

    const index = body.indexOf('/**/');
    const head = body.slice(0, index);
    const lines = [];

    for (const tail of expandDoubleStar(body.slice(index + 4))) {
        lines.push(head + '/**/' + tail);
        lines.push(head + '/' + tail);
    }
    return lines;
}

// Expand one pattern's character classes into the literal patterns they cover.
function expandLine(pattern) {
    const segments = parseSegments(pattern);

    let variants = 1;
    for (const segment of segments) {
        if (Array.isArray(segment)) {
            variants *= segment.length;
        }
    }

    // Too many combinations to be useful (or even to fit in memory): keep the
    // line, but widen each class to '*' instead of enumerating it.
    if (variants > MAX_VARIANTS_PER_LINE) {
        const widened = segments.map(segment => Array.isArray(segment) ? '*' : segment);
        return { lines: [widened.join('')], collapsed: true };
    }

    let lines = [''];
    for (const segment of segments) {
        const options = Array.isArray(segment) ? segment : [segment];
        const next = [];
        for (const line of lines) {
            for (const option of options) {
                next.push(line + option);
            }
        }
        lines = next;
    }

    return { lines, collapsed: false };
}

// Split a pattern into literal strings and character classes, where a class is
// represented as the array of characters it can match.
function parseSegments(pattern) {
    const segments = [];
    let literal = '';
    let i = 0;

    while (i < pattern.length) {
        if (pattern[i] !== '[') {
            literal += pattern[i];
            i++;
            continue;
        }

        const close = findClosingBracket(pattern, i);
        if (close === -1) {
            // Unmatched '[' — leave it alone.
            literal += pattern[i];
            i++;
            continue;
        }

        if (literal !== '') {
            segments.push(literal);
            literal = '';
        }
        segments.push(expandClass(pattern.slice(i + 1, close)));
        i = close + 1;
    }

    if (literal !== '') {
        segments.push(literal);
    }
    return segments;
}

function findClosingBracket(pattern, open) {
    let i = open + 1;

    // A leading '!' or '^' negates the class, and a ']' straight after that is
    // a literal member rather than the terminator.
    if (pattern[i] === '!' || pattern[i] === '^') {
        i++;
    }
    if (pattern[i] === ']') {
        i++;
    }

    for (; i < pattern.length; i++) {
        if (pattern[i] === '\\') {
            i++; // skip the escaped character
            continue;
        }
        if (pattern[i] === ']') {
            return i;
        }
    }
    return -1;
}

function expandClass(content) {
    // A negated class matches "anything but these", which p4ignore can't
    // express, so widen it to '*' instead of emitting the wrong characters.
    if (content.startsWith('!') || content.startsWith('^')) {
        return ['*'];
    }

    const characters = [];
    let i = 0;

    while (i < content.length) {
        if (content[i] === '\\' && i + 1 < content.length) {
            characters.push(content[i + 1]);
            i += 2;
            continue;
        }

        if (i + 2 < content.length && content[i + 1] === '-') {
            const start = content.charCodeAt(i);
            const end = content.charCodeAt(i + 2);

            if (start <= end) {
                for (let code = start; code <= end; code++) {
                    characters.push(String.fromCharCode(code));
                }
                i += 3;
                continue;
            }
            // Backwards range such as [z-a]: fall through and take the
            // characters literally rather than dropping the pattern.
        }

        characters.push(content[i]);
        i++;
    }

    // Remove duplicates and sort
    return [...new Set(characters)].sort();
}
