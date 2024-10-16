const gitignoreInput = document.getElementById('gitignore-input');
const p4ignoreOutput = document.getElementById('p4ignore-output');
const convertButton = document.getElementById('convert-button');

convertButton.addEventListener('click', () => {
    const gitignoreContent = gitignoreInput.value;
    const p4ignoreContent = convertGitignoreToP4ignore(gitignoreContent);
    p4ignoreOutput.value = p4ignoreContent;
});

function convertGitignoreToP4ignore(gitignoreContent) {
    const gitignoreLines = gitignoreContent.split('\n');
    const p4ignoreLines = [];

    for (const line of gitignoreLines) {
        // Remove leading and trailing whitespace.
        let trimmedLine = line.trim();

        // Skip blank lines and comments.
        if (trimmedLine === "" || trimmedLine.startsWith("#")) {
            p4ignoreLines.push(line); // Keep comments and blank lines
            continue;
        }

        // Save leading ! if present
        prefix = ""
        if (trimmedLine.startsWith("!")) {
            prefix = "!"
            trimmedLine = trimmedLine.slice(1)
        }
        // If the pattern ends with '/' and doesn't start with '/', add a leading '/' to make it explicit.
        if (trimmedLine.startsWith("./")) {
            trimmedLine = "/" + trimmedLine;
        }

        p4ignoreLines.push(prefix + trimmedLine);
    }

    const results = expandRegex(p4ignoreLines);

    return results.join('\n');
}

function expandRegex(patterns) {
    const bracketRegex = XRegExp('\\[([^\\]]+)\\]');

    const expandedPatterns = [];

    for (let pattern of patterns) {
        const match = XRegExp.exec(pattern, bracketRegex);
        if (!match) {
            expandedPatterns.push(pattern);
            continue;
        }

        const before = pattern.slice(0, match.index);
        const after = pattern.slice(match.index + match[0].length);

        // Handle character ranges manually
        const rangeRegex = XRegExp('(?<start>.)\\-(?<end>.)', 'g');
        let characters = [];

        let charContent = match[1];
        XRegExp.forEach(charContent, rangeRegex, (rangeMatch) => {
            const { start, end } = rangeMatch.groups;
            for (let i = start.charCodeAt(0); i <= end.charCodeAt(0); i++) {
                characters.push(String.fromCharCode(i));
            }
            // Remove the processed range from charContent
            charContent = charContent.replace(rangeMatch[0], '');
        });

        // Add remaining individual characters
        characters.push(...charContent.split(''));

        // Remove duplicates and sort
        characters = [...new Set(characters)].sort();

        for (let character of characters) {
            expandedPatterns.push(before + character + after);
        }
    }

    if (expandedPatterns.length === patterns.length) {
        return expandedPatterns;
    } else {
        return expandRegex(expandedPatterns);
    }
}