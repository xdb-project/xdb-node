/**
 * @file .prettierrc.js
 * @brief Prettier configuration for XDB-Node.
 * Ensures consistent code style across TypeScript and JavaScript files.
 */

module.exports = {
    // Standard indent of 4 spaces to match C code style
    tabWidth: 4,

    // Use semi-colons at the end of statements
    semi: true,

    // Use single quotes for strings (cleaner in TS/JS)
    singleQuote: true,

    // Ensure trailing commas where valid in ES5 (better for git diffs)
    trailingComma: 'es5',

    // Print spaces between brackets in objects
    bracketSpacing: true,

    // Include parentheses around a sole arrow function parameter
    arrowParens: 'always',

    // Max line length
    printWidth: 100,

    // Use LF for line endings (standard for Unix/C environments)
    endOfLine: 'lf',
};
