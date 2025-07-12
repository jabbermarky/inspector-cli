# Display Function & File Naming Convention

## Standardized Naming Patterns

All presentation functions AND files now follow the **"display"** prefix convention instead of "show".

### ✅ Correct Naming Pattern:
- `displayStats()` - Shows statistics to user
- `displayVersionAnalysis()` - Shows version analysis 
- `displayAdditionalContext()` - Shows additional context
- `displayComprehensiveSignalAnalysis()` - Shows signal analysis

### ❌ Old "show" Pattern (Deprecated):
- ~~`showStats()`~~ → `displayStats()`
- ~~`showVersionAnalysis()`~~ → `displayVersionAnalysis()`
- ~~`showAdditionalContext()`~~ → `displayAdditionalContextFromData()`
- ~~`showComprehensiveSignalAnalysis()`~~ → `displayComprehensiveSignalAnalysis()`

## File Naming Convention

### ✅ Correct File Names:
- `display-stats.ts` - Statistics display functions
- `display-additional-context.ts` - Additional context display functions
- `display-additional-context-orchestrator.ts` - Orchestration functions
- `display-comprehensive-signal-analysis.ts` - Signal analysis display
- `display-signal-category.ts` - Signal category display
- `display-signal-strength-summary.ts` - Signal strength display

### ❌ Old File Names (Renamed):
- ~~`show-additional-context.ts`~~ → `display-additional-context-orchestrator.ts`
- ~~`show-comprehensive-signal-analysis.ts`~~ → `display-comprehensive-signal-analysis.ts`

## Function Categories

### 📊 **Data Generation Functions** (Pure)
- `generate*()` prefix
- No side effects
- Return structured data objects
- Examples: `generateGroundTruthStats()`, `generateAdditionalContext()`

### 🎨 **Presentation Functions** (Side Effects)
- `display*()` prefix  
- Handle formatting and console output
- Take structured data as input
- Examples: `displayGroundTruthStats()`, `displayAdditionalContext()`

### 🔧 **Orchestration Functions** (Convenience)
- `display*FromData()` pattern for orchestrators
- Combine generation + display in one call
- Examples: `displayAdditionalContextFromData()`

## Migration Path

All old "show" functions have deprecated aliases:

```typescript
// DEPRECATED: Use displayStats instead
export async function showStats(): Promise<void> {
    console.warn('showStats is deprecated. Use displayStats instead.');
    await displayStats();
}
```

## Usage Examples

### ✅ New Recommended Pattern:
```typescript
// Separate generation and display for flexibility
const stats = generateGroundTruthStats('./database.json');
displayGroundTruthStats(stats);

// Or use orchestrator for convenience
displayAdditionalContextFromData(data);
```

### 📊 Multiple Display Formats:
```typescript
const context = generateAdditionalContext(data);

// Choose display format based on needs
displayAdditionalContext(context);        // Full format
displayAdditionalContextCompact(context); // Compact format
displayAdditionalContextMinimal(context); // Essential info only

// Collected data analysis - separate generation from display
const analysis = generateCollectedDataAnalysis('./data.json');
displayCollectedDataAnalysis(analysis, rawData);  // Full format
displayCollectedDataAnalysisCompact(analysis);    // Compact format
displayVersionInfoOnly(analysis);                 // Version only
```

### 🧪 Testing Benefits:
```typescript
// Easy to unit test data generation separately
const stats = generateGroundTruthStats(mockDatabase);
expect(stats.totalSites).toBe(10);
expect(stats.cmsDistribution['WordPress']).toBe(6);

// Display functions can be tested with mock data
const mockStats = { totalSites: 5, cmsDistribution: {} };
displayGroundTruthStats(mockStats); // No database needed for testing
```

## Current File Structure

```
src/ground-truth/
├── 📊 Data Generation (Pure Functions)
│   ├── generate-stats.ts
│   ├── generate-additional-context.ts
│   ├── generate-collected-data-analysis.ts
│   ├── generate-ground-truth-analysis.ts         # NEW: Complete analysis pipeline
│   └── signal-analysis.ts
│
├── 🎨 Display Functions (Presentation)
│   ├── display-stats.ts
│   ├── display-additional-context.ts
│   ├── display-collected-data-analysis.ts
│   ├── display-ground-truth-analysis.ts         # NEW: Full analysis display
│   ├── display-comprehensive-signal-analysis.ts
│   ├── display-signal-category.ts
│   └── display-signal-strength-summary.ts
│
├── 🔧 Orchestration (Convenience Functions)
│   ├── analyze-ground-truth.ts                  # REFACTORED: Clean orchestrator
│   ├── analyze-collected-data.ts               # Orchestrator
│   ├── display-additional-context-orchestrator.ts
│   └── interactive-ui.ts (displayStats, displayVersionAnalysis)
│
├── 📝 Core Functions
│   ├── evaluate-feature.ts
│   ├── discriminative-features.ts
│   └── various other business logic files...
│
└── 📚 Documentation
    └── display-naming-convention.md
```

## Benefits of This Convention

1. **Clear Separation**: Data processing vs presentation concerns
2. **Testability**: Pure functions easier to unit test
3. **Reusability**: Data can be displayed in multiple formats
4. **Consistency**: All display functions AND files follow same pattern
5. **Flexibility**: Data can be used for APIs, logging, etc.
6. **Performance**: Generate once, display multiple ways
7. **File Organization**: Clear file naming makes codebase navigation easier