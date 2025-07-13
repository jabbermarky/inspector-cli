import * as fs from 'fs';

/**
 * Types for ground truth statistics
 */
export interface GroundTruthStats {
    totalSites: number;
    lastUpdated: string;
    cmsDistribution: { [cms: string]: number };
    versionDistribution: { [cms: string]: { [version: string]: number } };
    databaseExists: boolean;
    error?: string;
}

/**
 * Generate statistics from ground truth database
 * Pure function - no side effects, just data processing
 * 
 * @param databasePath - Path to the ground truth database file
 * @returns Statistics object or error information
 */
export function generateGroundTruthStats(databasePath: string): GroundTruthStats {
    // Check if database exists
    if (!fs.existsSync(databasePath)) {
        return {
            totalSites: 0,
            lastUpdated: '',
            cmsDistribution: {},
            versionDistribution: {},
            databaseExists: false,
            error: 'Ground truth database not found'
        };
    }

    try {
        // Read and parse database
        const content = fs.readFileSync(databasePath, 'utf8');
        const database: any = JSON.parse(content);

        // Validate database structure
        if (!database.sites || !Array.isArray(database.sites)) {
            return {
                totalSites: 0,
                lastUpdated: '',
                cmsDistribution: {},
                versionDistribution: {},
                databaseExists: true,
                error: 'Invalid database structure - missing sites array'
            };
        }

        // Generate CMS distribution
        const cmsDistribution: { [cms: string]: number } = {};
        database.sites.forEach((site: any) => {
            if (site.cms) {
                cmsDistribution[site.cms] = (cmsDistribution[site.cms] || 0) + 1;
            }
        });

        // Generate version distribution
        const versionDistribution: { [cms: string]: { [version: string]: number } } = {};
        database.sites.forEach((site: any) => {
            if (site.cms && site.version) {
                if (!versionDistribution[site.cms]) {
                    versionDistribution[site.cms] = {};
                }
                versionDistribution[site.cms][site.version] =
                    (versionDistribution[site.cms][site.version] || 0) + 1;
            }
        });

        return {
            totalSites: database.sites.length,
            lastUpdated: database.lastUpdated || 'Unknown',
            cmsDistribution,
            versionDistribution,
            databaseExists: true
        };

    } catch (error) {
        return {
            totalSites: 0,
            lastUpdated: '',
            cmsDistribution: {},
            versionDistribution: {},
            databaseExists: true,
            error: `Error reading database: ${(error as Error).message}`
        };
    }
}

/**
 * Get default ground truth database path
 * TODO: Move to configuration file
 */
export function getDefaultDatabasePath(): string {
    return './data/ground-truth-sites.json';
}