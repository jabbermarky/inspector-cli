/**
 * Preprocessed Data Types - Placeholder
 * 
 * This is a placeholder for the preprocessed data types.
 * These will be properly defined when the data preprocessing system is implemented.
 */

export interface PreprocessedData {
    readonly headers: Map<string, HeaderPattern>;
    readonly metaTags: Map<string, MetaPattern>;
    readonly scripts: Map<string, ScriptPattern>;
    readonly totalSites: number;
    readonly dataVersion: string;
}

export interface HeaderPattern {
    readonly frequency: number;
    readonly sites: number;
    readonly examples: string[];
}

export interface MetaPattern {
    readonly frequency: number;
    readonly sites: number;
    readonly examples: string[];
}

export interface ScriptPattern {
    readonly frequency: number;
    readonly sites: number;
    readonly examples: string[];
}