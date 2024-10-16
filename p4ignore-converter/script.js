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
    const bracketRegex = /\[([^\]]+)\]/g;
    const expandedPatterns = [];
    for (pattern of patterns) {
        const match = bracketRegex.exec(pattern);
        if (!match) {
            expandedPatterns.push(pattern);
            continue
        };
        const before = pattern.slice(0, match.index);
        const after = pattern.slice(match.index + match[0].length);

        characters = match[1].split('');
        for (character of characters) {
            expandedPatterns.push(before + character + after);
        }
    }
    if (expandedPatterns.length === patterns.length) {
        return expandedPatterns;
    } else {
        return expandRegex(expandedPatterns);
    }

}