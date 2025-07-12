export interface GroundTruthSite {
    url: string;
    cms: string;
    version?: string;
    confidence: number;
    addedAt: string;
    verifiedBy: string;
    notes?: string;
    detectedVersion?: string;
    versionSource?: 'meta-generator' | 'manual' | 'header' | 'pattern' | 'unknown';
}

export interface GroundTruthDatabase {
    version: string;
    lastUpdated: string;
    sites: GroundTruthSite[];
}

export interface DiscriminativeFeature {
    feature: string;
    description: string;
    cms: string;
    confidence: number;
    type: 'script-src' | 'html-content' | 'meta-tag' | 'header' | 'dom-structure';
}

export interface GroundTruthOptions {
    interactive: boolean;
    save: boolean;
    collectData: boolean;
    compact: boolean;
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
export interface VerifiedResult extends SignalAnalysis {
    verified: boolean;
    correctedCMS: string;
    notes?: string;
    verifiedAt: Date;
}


export type GroundTruthResult = VerifiedResult