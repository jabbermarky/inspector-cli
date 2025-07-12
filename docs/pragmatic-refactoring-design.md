# Pragmatic Refactoring Design for Inspector CLI

## Executive Summary

This pragmatic design addresses the critique of the simplified design by removing unnecessary abstractions like service containers and complex dependency injection. Instead, it focuses on the core problems: breaking down the 2,108-line monolith into understandable, testable modules while keeping the solution as simple as possible.

## Core Principle: Solve Real Problems, Not Theoretical Ones

**Real Problems:**
- 2,108-line file is hard to understand and maintain
- Hard to test because of external dependencies mixed with business logic
- Code is not reusable between commands

**Not Problems:**
- Need for enterprise-grade dependency injection
- Need for complex service orchestration
- Need for sophisticated architectural patterns

## Pragmatic Solution: Function-Based Modules

### Simple Directory Structure

```
src/
├── commands/
│   ├── ground-truth.ts              # Thin command handler
│   ├── detect-cms.ts               # Thin command handler
│   ├── analyze.ts                  # Thin command handler
│   └── __tests__/
├── ground-truth/                   # Ground truth functionality
│   ├── index.ts                    # Main entry point
│   ├── data-collection.ts          # Data collection logic
│   ├── signal-analysis.ts          # Signal analysis logic
│   ├── interactive-ui.ts           # User interaction logic
│   ├── database.ts                 # Data persistence logic
│   ├── types.ts                    # Type definitions
│   └── __tests__/
├── cms-detection/                  # CMS detection functionality
│   ├── index.ts
│   ├── detector.ts
│   ├── strategies/
│   └── __tests__/
├── shared/                         # Truly shared utilities
│   ├── browser.ts
│   ├── storage.ts
│   ├── logger.ts
│   └── __tests__/
└── index.ts
```

## Module-Based Design

### Ground Truth Module

```typescript
// src/ground-truth/index.ts - Main entry point
import { collectData } from './data-collection';
import { analyzeSignals } from './signal-analysis';
import { verifyInteractively } from './interactive-ui';
import { saveToDatabase } from './database';
import type { GroundTruthOptions, GroundTruthResult } from './types';

export async function analyzeGroundTruth(
    url: string, 
    options: GroundTruthOptions
): Promise<GroundTruthResult> {
    // Simple sequential flow - easy to understand
    const data = await collectData(url);
    const signals = await analyzeSignals(data);
    const verified = await verifyInteractively(signals, options);
    
    if (options.save) {
        await saveToDatabase(verified);
    }
    
    return verified;
}

// Re-export individual functions for testing
export { collectData, analyzeSignals, verifyInteractively, saveToDatabase };
```

### Data Collection Module

```typescript
// src/ground-truth/data-collection.ts
import { createBrowser } from '../shared/browser';
import { analyzeRobotsTxt } from './robots-analysis';
import type { DetectionDataPoint } from './types';

export async function collectData(url: string): Promise<DetectionDataPoint> {
    // Bot-resistant approach
    const robotsData = await analyzeRobotsTxt(url);
    
    const browser = await createBrowser({
        bypassBot: robotsData.bypassAvailable
    });
    
    try {
        const page = await browser.newPage();
        await page.goto(url);
        
        const [html, scripts, stylesheets, headers, metadata] = await Promise.all([
            page.content(),
            extractScripts(page),
            extractStylesheets(page),
            extractHeaders(page),
            extractMetadata(page)
        ]);
        
        return {
            url,
            html,
            scripts,
            stylesheets,
            headers,
            metadata,
            robotsData,
            collectedAt: new Date()
        };
    } finally {
        await browser.close();
    }
}

async function extractScripts(page: any): Promise<string[]> {
    return await page.evaluate(() => {
        return Array.from(document.querySelectorAll('script[src]'))
            .map(script => script.getAttribute('src'))
            .filter(Boolean);
    });
}

async function extractStylesheets(page: any): Promise<string[]> {
    return await page.evaluate(() => {
        return Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
            .map(link => link.getAttribute('href'))
            .filter(Boolean);
    });
}

async function extractHeaders(page: any): Promise<Record<string, string>> {
    const response = page.response();
    return response ? response.headers() : {};
}

async function extractMetadata(page: any): Promise<Record<string, string>> {
    return await page.evaluate(() => {
        const meta = {};
        document.querySelectorAll('meta').forEach(element => {
            const name = element.getAttribute('name') || element.getAttribute('property');
            const content = element.getAttribute('content');
            if (name && content) {
                meta[name] = content;
            }
        });
        return meta;
    });
}

export async function analyzeRobotsTxt(url: string): Promise<RobotsData> {
    // Robots.txt analysis logic
    const robotsUrl = new URL('/robots.txt', url).toString();
    
    try {
        const response = await fetch(robotsUrl);
        const content = await response.text();
        
        return {
            exists: response.ok,
            content,
            bypassAvailable: content.includes('Crawl-delay') || content.includes('Disallow'),
            analysis: parseRobotsContent(content)
        };
    } catch (error) {
        return {
            exists: false,
            content: '',
            bypassAvailable: false,
            analysis: null
        };
    }
}

function parseRobotsContent(content: string): RobotsAnalysis {
    // Parse robots.txt content for bot detection patterns
    const lines = content.split('\n').map(line => line.trim());
    
    return {
        userAgents: lines.filter(line => line.startsWith('User-agent:')),
        disallows: lines.filter(line => line.startsWith('Disallow:')),
        crawlDelay: lines.find(line => line.startsWith('Crawl-delay:'))
    };
}
```

### Signal Analysis Module

```typescript
// src/ground-truth/signal-analysis.ts
import type { DetectionDataPoint, SignalAnalysis } from './types';

export async function analyzeSignals(data: DetectionDataPoint): Promise<SignalAnalysis> {
    // Simple parallel analysis using Promise.all
    const [scripts, html, meta, headers, stylesheets] = await Promise.all([
        analyzeScripts(data.scripts),
        analyzeHTML(data.html),
        analyzeMeta(data.metadata),
        analyzeHeaders(data.headers),
        analyzeStylesheets(data.stylesheets)
    ]);
    
    const confidence = calculateOverallConfidence(scripts, html, meta, headers, stylesheets);
    const detectedCMS = determineDetectedCMS(scripts, html, meta, headers, stylesheets);
    
    return {
        url: data.url,
        detectedCMS,
        confidence,
        signals: {
            scripts,
            html,
            meta,
            headers,
            stylesheets
        },
        analyzedAt: new Date()
    };
}

export async function analyzeScripts(scripts: string[]): Promise<ScriptAnalysis> {
    const patterns = {
        wordpress: ['/wp-content/', '/wp-includes/', 'wp-emoji'],
        drupal: ['/sites/default/', '/modules/', '/themes/'],
        joomla: ['/media/jui/', '/templates/', 'joomla']
    };
    
    const matches = {};
    for (const [cms, cmsPatterns] of Object.entries(patterns)) {
        matches[cms] = scripts.filter(script => 
            cmsPatterns.some(pattern => script.includes(pattern))
        ).length;
    }
    
    const topMatch = Object.entries(matches)
        .sort(([,a], [,b]) => b - a)[0];
    
    return {
        totalScripts: scripts.length,
        matches,
        detectedCMS: topMatch[1] > 0 ? topMatch[0] : null,
        confidence: Math.min(topMatch[1] / 3, 1) // Max confidence with 3+ matches
    };
}

export async function analyzeHTML(html: string): Promise<HTMLAnalysis> {
    const patterns = {
        wordpress: ['wp-content', 'WordPress', 'wp-json'],
        drupal: ['Drupal', 'drupal', '/sites/default/'],
        joomla: ['Joomla', 'joomla', '/media/jui/']
    };
    
    const matches = {};
    for (const [cms, cmsPatterns] of Object.entries(patterns)) {
        matches[cms] = cmsPatterns.filter(pattern => 
            html.includes(pattern)
        ).length;
    }
    
    const topMatch = Object.entries(matches)
        .sort(([,a], [,b]) => b - a)[0];
    
    return {
        htmlLength: html.length,
        matches,
        detectedCMS: topMatch[1] > 0 ? topMatch[0] : null,
        confidence: Math.min(topMatch[1] / 2, 1)
    };
}

export async function analyzeMeta(metadata: Record<string, string>): Promise<MetaAnalysis> {
    const generator = metadata.generator?.toLowerCase() || '';
    const description = metadata.description?.toLowerCase() || '';
    
    let detectedCMS = null;
    let confidence = 0;
    
    if (generator.includes('wordpress')) {
        detectedCMS = 'wordpress';
        confidence = 0.9;
    } else if (generator.includes('drupal')) {
        detectedCMS = 'drupal';
        confidence = 0.9;
    } else if (generator.includes('joomla')) {
        detectedCMS = 'joomla';
        confidence = 0.9;
    }
    
    return {
        generator,
        description,
        detectedCMS,
        confidence
    };
}

export async function analyzeHeaders(headers: Record<string, string>): Promise<HeaderAnalysis> {
    const server = headers.server?.toLowerCase() || '';
    const xPoweredBy = headers['x-powered-by']?.toLowerCase() || '';
    
    const signals = [server, xPoweredBy].join(' ');
    
    let detectedCMS = null;
    let confidence = 0;
    
    if (signals.includes('apache') && signals.includes('php')) {
        confidence = 0.3; // Common setup, low confidence
    }
    
    return {
        server,
        xPoweredBy,
        detectedCMS,
        confidence
    };
}

export async function analyzeStylesheets(stylesheets: string[]): Promise<StylesheetAnalysis> {
    const patterns = {
        wordpress: ['/wp-content/', '/wp-includes/', 'style.css'],
        drupal: ['/sites/default/', '/themes/', '/modules/'],
        joomla: ['/media/', '/templates/', '/administrator/']
    };
    
    const matches = {};
    for (const [cms, cmsPatterns] of Object.entries(patterns)) {
        matches[cms] = stylesheets.filter(sheet => 
            cmsPatterns.some(pattern => sheet.includes(pattern))
        ).length;
    }
    
    const topMatch = Object.entries(matches)
        .sort(([,a], [,b]) => b - a)[0];
    
    return {
        totalStylesheets: stylesheets.length,
        matches,
        detectedCMS: topMatch[1] > 0 ? topMatch[0] : null,
        confidence: Math.min(topMatch[1] / 2, 1)
    };
}

function calculateOverallConfidence(...analyses: any[]): number {
    const confidences = analyses
        .map(analysis => analysis.confidence || 0)
        .filter(confidence => confidence > 0);
    
    if (confidences.length === 0) return 0;
    
    // Weighted average with more weight on higher confidences
    const weights = confidences.map(c => c * c);
    const weightedSum = confidences.reduce((sum, conf, i) => sum + conf * weights[i], 0);
    const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
    
    return weightSum > 0 ? weightedSum / weightSum : 0;
}

function determineDetectedCMS(...analyses: any[]): string {
    const cmsVotes = {};
    
    analyses.forEach(analysis => {
        if (analysis.detectedCMS) {
            cmsVotes[analysis.detectedCMS] = (cmsVotes[analysis.detectedCMS] || 0) + analysis.confidence;
        }
    });
    
    const topCMS = Object.entries(cmsVotes)
        .sort(([,a], [,b]) => b - a)[0];
    
    return topCMS ? topCMS[0] : 'Unknown';
}
```

### Interactive UI Module

```typescript
// src/ground-truth/interactive-ui.ts
import readline from 'readline';
import { logger } from '../shared/logger';
import type { SignalAnalysis, VerifiedResult, GroundTruthOptions } from './types';

export async function verifyInteractively(
    signals: SignalAnalysis, 
    options: GroundTruthOptions
): Promise<VerifiedResult> {
    
    // Display analysis results
    displayAnalysis(signals);
    
    // If not interactive, return as-is
    if (!options.interactive) {
        return {
            ...signals,
            verified: true,
            correctedCMS: signals.detectedCMS,
            verifiedAt: new Date()
        };
    }
    
    // Interactive verification
    const verification = await promptVerification(signals);
    
    return {
        ...signals,
        verified: verification.confirmed,
        correctedCMS: verification.correctedCMS,
        notes: verification.notes,
        verifiedAt: new Date()
    };
}

function displayAnalysis(signals: SignalAnalysis): void {
    console.log('\n=== Ground Truth Analysis Results ===');
    console.log(`URL: ${signals.url}`);
    console.log(`Detected CMS: ${signals.detectedCMS}`);
    console.log(`Overall Confidence: ${(signals.confidence * 100).toFixed(1)}%`);
    
    console.log('\n--- Signal Analysis ---');
    console.log(`Scripts: ${signals.signals.scripts.detectedCMS || 'Unknown'} (${(signals.signals.scripts.confidence * 100).toFixed(1)}%)`);
    console.log(`HTML: ${signals.signals.html.detectedCMS || 'Unknown'} (${(signals.signals.html.confidence * 100).toFixed(1)}%)`);
    console.log(`Meta: ${signals.signals.meta.detectedCMS || 'Unknown'} (${(signals.signals.meta.confidence * 100).toFixed(1)}%)`);
    console.log(`Headers: ${signals.signals.headers.detectedCMS || 'Unknown'} (${(signals.signals.headers.confidence * 100).toFixed(1)}%)`);
    console.log(`Stylesheets: ${signals.signals.stylesheets.detectedCMS || 'Unknown'} (${(signals.signals.stylesheets.confidence * 100).toFixed(1)}%)`);
}

async function promptVerification(signals: SignalAnalysis): Promise<UserVerification> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    try {
        const confirmed = await question(rl, 
            `\nIs the detected CMS "${signals.detectedCMS}" correct? (y/n): `
        );
        
        if (confirmed.toLowerCase() === 'y') {
            return {
                confirmed: true,
                correctedCMS: signals.detectedCMS,
                notes: ''
            };
        }
        
        const correctedCMS = await question(rl, 'What is the correct CMS? ');
        const notes = await question(rl, 'Any additional notes? (optional): ');
        
        return {
            confirmed: false,
            correctedCMS,
            notes
        };
        
    } finally {
        rl.close();
    }
}

function question(rl: any, prompt: string): Promise<string> {
    return new Promise(resolve => {
        rl.question(prompt, resolve);
    });
}
```

### Database Module

```typescript
// src/ground-truth/database.ts
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { logger } from '../shared/logger';
import type { VerifiedResult, GroundTruthEntry } from './types';

const GROUND_TRUTH_DIR = './data/ground-truth';

export async function saveToDatabase(result: VerifiedResult): Promise<void> {
    try {
        await mkdir(GROUND_TRUTH_DIR, { recursive: true });
        
        const entry: GroundTruthEntry = {
            url: result.url,
            detectedCMS: result.detectedCMS,
            correctedCMS: result.correctedCMS,
            confidence: result.confidence,
            verified: result.verified,
            notes: result.notes,
            signals: result.signals,
            verifiedAt: result.verifiedAt,
            savedAt: new Date()
        };
        
        const filename = generateFilename(result.url);
        const filepath = join(GROUND_TRUTH_DIR, filename);
        
        await writeFile(filepath, JSON.stringify(entry, null, 2));
        
        logger.info(`Ground truth entry saved: ${filepath}`);
        
        // Update index
        await updateIndex(entry);
        
    } catch (error) {
        logger.error('Failed to save ground truth entry', error);
        throw error;
    }
}

export async function loadFromDatabase(url: string): Promise<GroundTruthEntry | null> {
    try {
        const filename = generateFilename(url);
        const filepath = join(GROUND_TRUTH_DIR, filename);
        
        const content = await readFile(filepath, 'utf-8');
        return JSON.parse(content);
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            return null; // File doesn't exist
        }
        
        logger.error('Failed to load ground truth entry', error);
        throw error;
    }
}

function generateFilename(url: string): string {
    // Create a safe filename from URL
    const sanitized = url
        .replace(/https?:\/\//, '')
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
    
    return `${sanitized}.json`;
}

async function updateIndex(entry: GroundTruthEntry): Promise<void> {
    const indexPath = join(GROUND_TRUTH_DIR, 'index.json');
    
    try {
        let index = [];
        try {
            const content = await readFile(indexPath, 'utf-8');
            index = JSON.parse(content);
        } catch (error) {
            // Index doesn't exist yet, start with empty array
        }
        
        // Remove existing entry for this URL
        index = index.filter(item => item.url !== entry.url);
        
        // Add new entry
        index.push({
            url: entry.url,
            detectedCMS: entry.detectedCMS,
            correctedCMS: entry.correctedCMS,
            confidence: entry.confidence,
            verified: entry.verified,
            verifiedAt: entry.verifiedAt,
            savedAt: entry.savedAt
        });
        
        // Sort by savedAt (most recent first)
        index.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        
        await writeFile(indexPath, JSON.stringify(index, null, 2));
        
    } catch (error) {
        logger.error('Failed to update index', error);
        // Don't throw - index update is not critical
    }
}
```

### Type Definitions

```typescript
// src/ground-truth/types.ts
export interface GroundTruthOptions {
    interactive: boolean;
    save: boolean;
    collectData: boolean;
}

export interface DetectionDataPoint {
    url: string;
    html: string;
    scripts: string[];
    stylesheets: string[];
    headers: Record<string, string>;
    metadata: Record<string, string>;
    robotsData: RobotsData;
    collectedAt: Date;
}

export interface RobotsData {
    exists: boolean;
    content: string;
    bypassAvailable: boolean;
    analysis: RobotsAnalysis | null;
}

export interface RobotsAnalysis {
    userAgents: string[];
    disallows: string[];
    crawlDelay: string | undefined;
}

export interface SignalAnalysis {
    url: string;
    detectedCMS: string;
    confidence: number;
    signals: {
        scripts: ScriptAnalysis;
        html: HTMLAnalysis;
        meta: MetaAnalysis;
        headers: HeaderAnalysis;
        stylesheets: StylesheetAnalysis;
    };
    analyzedAt: Date;
}

export interface ScriptAnalysis {
    totalScripts: number;
    matches: Record<string, number>;
    detectedCMS: string | null;
    confidence: number;
}

export interface HTMLAnalysis {
    htmlLength: number;
    matches: Record<string, number>;
    detectedCMS: string | null;
    confidence: number;
}

export interface MetaAnalysis {
    generator: string;
    description: string;
    detectedCMS: string | null;
    confidence: number;
}

export interface HeaderAnalysis {
    server: string;
    xPoweredBy: string;
    detectedCMS: string | null;
    confidence: number;
}

export interface StylesheetAnalysis {
    totalStylesheets: number;
    matches: Record<string, number>;
    detectedCMS: string | null;
    confidence: number;
}

export interface UserVerification {
    confirmed: boolean;
    correctedCMS: string;
    notes: string;
}

export interface VerifiedResult extends SignalAnalysis {
    verified: boolean;
    correctedCMS: string;
    notes?: string;
    verifiedAt: Date;
}

export interface GroundTruthResult extends VerifiedResult {}

export interface GroundTruthEntry extends VerifiedResult {
    savedAt: Date;
}
```

## Updated Commands

### Ground Truth Command

```typescript
// src/commands/ground-truth.ts
import { analyzeGroundTruth } from '../ground-truth';
import { logger } from '../shared/logger';
import type { GroundTruthOptions } from '../ground-truth/types';

export async function groundTruthCommand(args: any): Promise<void> {
    try {
        const options: GroundTruthOptions = {
            interactive: args.interactive ?? true,
            save: args.save ?? true,
            collectData: args.collectData ?? true
        };
        
        const result = await analyzeGroundTruth(args.url, options);
        
        // Output results
        if (args.format === 'json') {
            console.log(JSON.stringify(result, null, 2));
        } else {
            console.log(`\nAnalysis complete for ${result.url}`);
            console.log(`Final CMS: ${result.correctedCMS}`);
            console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
            console.log(`Verified: ${result.verified ? 'Yes' : 'No'}`);
            
            if (result.notes) {
                console.log(`Notes: ${result.notes}`);
            }
        }
        
    } catch (error) {
        logger.error('Ground truth command failed', error);
        console.error('Error:', error.message);
        process.exit(1);
    }
}
```

### CMS Detection Command

```typescript
// src/commands/detect-cms.ts
import { detectCMS } from '../cms-detection';
import { logger } from '../shared/logger';

export async function detectCMSCommand(args: any): Promise<void> {
    try {
        if (args.csv) {
            // Handle CSV batch processing
            const results = await processCMSDetectionBatch(args.csv, args);
            
            if (args.format === 'json') {
                console.log(JSON.stringify(results, null, 2));
            } else {
                results.forEach(result => {
                    console.log(`${result.url}: ${result.cms} (${(result.confidence * 100).toFixed(1)}%)`);
                });
            }
        } else {
            // Handle single URL
            const result = await detectCMS(args.url, {
                threshold: args.threshold || 0.7,
                collectData: args.collectData || false
            });
            
            if (args.format === 'json') {
                console.log(JSON.stringify(result, null, 2));
            } else {
                console.log(`${result.url}: ${result.cms} (${(result.confidence * 100).toFixed(1)}%)`);
            }
        }
        
    } catch (error) {
        logger.error('CMS detection command failed', error);
        console.error('Error:', error.message);
        process.exit(1);
    }
}
```

## Benefits of This Approach

### 1. **Dramatically Simpler**
- No service container complexity
- No dependency injection framework
- No abstract service interfaces
- Just modules with focused functions

### 2. **Easy to Understand**
- Linear flow through functions
- Clear input/output for each function
- Easy to trace execution path
- Functions can be used independently

### 3. **Easy to Test**
```typescript
// Testing is straightforward
describe('Signal Analysis', () => {
    it('should detect WordPress from scripts', async () => {
        const scripts = ['/wp-content/themes/theme.js', '/wp-includes/jquery.js'];
        const result = await analyzeScripts(scripts);
        
        expect(result.detectedCMS).toBe('wordpress');
        expect(result.confidence).toBeGreaterThan(0.5);
    });
});
```

### 4. **Maintainable**
- Each module has a single responsibility
- Functions can be modified independently
- Easy to add new signal analysis types
- Clear boundaries between concerns

### 5. **Flexible**
- Functions can be composed in different ways
- Easy to create new workflows
- Can reuse functions in different commands
- Simple to extend with new functionality

## Migration Strategy

### Step 1: Extract Functions (Week 1)
1. Extract data collection logic to `ground-truth/data-collection.ts`
2. Extract signal analysis logic to `ground-truth/signal-analysis.ts`
3. Create comprehensive tests for each function

### Step 2: Extract UI and Database (Week 2)
1. Extract interactive UI logic to `ground-truth/interactive-ui.ts`
2. Extract database operations to `ground-truth/database.ts`
3. Create main orchestration function in `ground-truth/index.ts`

### Step 3: Update Command (Week 3)
1. Update ground-truth command to use new modules
2. Validate all functionality works identically
3. Remove old ground-truth.ts file

### Step 4: Other Commands (Week 4)
1. Apply same pattern to other large commands
2. Extract reusable functionality to shared modules
3. Complete testing and documentation

## File Size Comparison

### Before
- `commands/ground-truth.ts`: 2,108 lines

### After
- `ground-truth/data-collection.ts`: ~400 lines
- `ground-truth/signal-analysis.ts`: ~600 lines
- `ground-truth/interactive-ui.ts`: ~200 lines
- `ground-truth/database.ts`: ~150 lines
- `ground-truth/index.ts`: ~50 lines
- `ground-truth/types.ts`: ~200 lines
- `commands/ground-truth.ts`: ~50 lines

**Total**: ~1,650 lines (22% reduction) organized in focused, understandable modules.

## Testing Strategy

### Function-Level Testing
```typescript
// Test individual functions in isolation
describe('Data Collection', () => {
    it('should collect scripts from page', async () => {
        const mockPage = {
            evaluate: jest.fn().mockResolvedValue(['/script1.js', '/script2.js'])
        };
        
        const scripts = await extractScripts(mockPage);
        expect(scripts).toEqual(['/script1.js', '/script2.js']);
    });
});
```

### Module-Level Testing
```typescript
// Test complete modules
describe('Ground Truth Analysis', () => {
    it('should complete full analysis workflow', async () => {
        const result = await analyzeGroundTruth('https://wordpress.com', {
            interactive: false,
            save: false,
            collectData: true
        });
        
        expect(result.detectedCMS).toBe('wordpress');
        expect(result.confidence).toBeGreaterThan(0.8);
    });
});
```

## Conclusion

This pragmatic approach solves the real problems:
- **Breaks down the monolith** into understandable pieces
- **Makes testing easy** with focused functions
- **Improves maintainability** with clear module boundaries
- **Keeps it simple** with no unnecessary abstractions

The solution is much simpler to understand, implement, and maintain than service-based approaches while achieving all the goals of the refactoring.