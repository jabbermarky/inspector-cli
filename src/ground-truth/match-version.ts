export function isValidWordPressVersion(version: string): boolean {
    // WordPress versions should be in format X.Y or X.Y.Z where X is 4-10, Y is 0-20, Z is 0-20
    const match = version.match(/^(\d+)\.(\d+)(?:\.(\d+))?$/);
    if (!match) return false;
    
    const major = parseInt(match[1]);
    const minor = parseInt(match[2]);
    const patch = match[3] ? parseInt(match[3]) : 0;
    
    // WordPress versions: 4.0+ (modern WordPress) - rejects old plugin/theme versions
    return major >= 4 && major <= 10 && minor >= 0 && minor <= 20 && patch >= 0 && patch <= 20;
}

export function isValidDrupalVersion(version: string): boolean {
    // Drupal versions can be X (major only) or X.Y or X.Y.Z where X is 6-11, Y is 0-50, Z is 0-50
    const match = version.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);
    if (!match) return false;
    
    const major = parseInt(match[1]);
    const minor = match[2] ? parseInt(match[2]) : 0;
    const patch = match[3] ? parseInt(match[3]) : 0;
    
    // Drupal versions: 6.x to 11.x range, allow major-only versions like "10"
    return major >= 6 && major <= 11 && minor >= 0 && minor <= 50 && patch >= 0 && patch <= 50;
}

export function isValidJoomlaVersion(version: string): boolean {
    // Joomla versions should be in format X.Y or X.Y.Z where X is 1-5, Y is 0-10, Z is 0-50
    const match = version.match(/^(\d+)\.(\d+)(?:\.(\d+))?$/);
    if (!match) return false;

    const major = parseInt(match[1]);
    const minor = parseInt(match[2]);
    const patch = match[3] ? parseInt(match[3]) : 0;

    // Joomla versions: 1.x to 5.x range
    return major >= 1 && major <= 5 && minor >= 0 && minor <= 10 && patch >= 0 && patch <= 50;
}
