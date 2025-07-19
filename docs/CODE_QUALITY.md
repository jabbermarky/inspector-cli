# Code Quality Setup

Inspector has comprehensive code quality tools configured for maintaining consistent, high-quality code.

## Tools Configured

### ESLint
- **Purpose**: Static code analysis for identifying problematic patterns
- **Configuration**: `eslint.config.js` (flat config format)
- **Rules**: TypeScript-specific, security, and code quality rules

### Prettier
- **Purpose**: Automatic code formatting for consistency
- **Configuration**: `.prettierrc` with project-specific formatting rules
- **Ignore**: `.prettierignore` for files that shouldn't be formatted

## Available Scripts

```bash
# Linting
npm run lint              # Check for code quality issues
npm run lint:fix          # Automatically fix fixable issues

# Formatting  
npm run format            # Format all files with Prettier
npm run format:check      # Check if files need formatting

# Combined
npm run quality           # Run both lint and format checks
npm run quality:fix       # Fix both linting and formatting issues
```

## Integration with Development Workflow

### Pre-commit Workflow (Recommended)
```bash
# Before committing
npm run quality:fix      # Fix auto-fixable issues
npm run build           # Ensure code still compiles
npm run test           # Run tests
git add .
git commit
```

### CI/CD Integration
The quality scripts can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions step
- name: Code Quality Check
  run: |
    npm run quality
    npm run build
    npm run test
```