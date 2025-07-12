import fs from 'fs';
import path from 'path';
import { GroundTruthDatabase, GroundTruthSite } from './types';
import { displayMessage } from './interactive-ui-utils';
import { normalizeUrlForGroundTruth, normalizeUrlForDataFileSearch } from './normalize-url.js';
import { extractVersionInfo } from './extract-version-info.js';

const groundTruthPath: string = './data/ground-truth-sites.json';
const dataDir = './data/cms-analysis';

export function findDataFile(url: string): string | null {
    const indexPath = path.join(dataDir, 'index.json');

    if (!fs.existsSync(indexPath)) {
        return null;
    }

    try {
        const indexContent = fs.readFileSync(indexPath, 'utf8');
        const indexData = JSON.parse(indexContent);
        const indexArray = Array.isArray(indexData) ? indexData : indexData.files;

        // Normalize the search URL to match the format stored in the index
        const normalizedSearchUrl = normalizeUrlForDataFileSearch(url);

        // Find the most recent entry for this URL with flexible matching
        const entry = indexArray
            .filter((item: any) => {
                const normalizedStoredUrl = normalizeUrlForDataFileSearch(item.url);
                return normalizedStoredUrl === normalizedSearchUrl;
            })
            .sort(
                (a: any, b: any) =>
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            )[0];

        if (entry) {
            return path.join(dataDir, entry.filePath);
        }
    } catch (error) {
        displayMessage(`⚠️  Error reading index file: ${(error as Error).message}`);
    }

    return null;
}

export async function addToGroundTruth(
    url: string,
    cms: string,
    confidence: number,
    notes: string,
    version?: string
): Promise<void> {
    const normalizedUrl = normalizeUrlForGroundTruth(url);
    let database: GroundTruthDatabase;

    // Load existing database or create new one
    if (fs.existsSync(groundTruthPath)) {
        const content = fs.readFileSync(groundTruthPath, 'utf8');
        database = JSON.parse(content);
    } else {
        database = {
            version: '1.0',
            lastUpdated: new Date().toISOString(),
            sites: [],
        };
    }

    // Check if normalized URL already exists
    const existingIndex = database.sites.findIndex(
        site => normalizeUrlForGroundTruth(site.url) === normalizedUrl
    );

    // Get detected version information from the data (use original URL for file lookup)
    const dataPath = findDataFile(url);
    let detectedVersion: string | undefined;
    let versionSource: 'meta-generator' | 'manual' | 'header' | 'pattern' | 'unknown' = 'unknown';

    if (dataPath && fs.existsSync(dataPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
            const versionInfo = extractVersionInfo(data);
            if (versionInfo.length > 0) {
                // Use the highest confidence version detection
                const bestVersion = versionInfo[0];
                if (bestVersion.cms.toLowerCase() === cms.toLowerCase()) {
                    detectedVersion = bestVersion.version;
                    versionSource = bestVersion.source as any;
                }
            }
        } catch (error) {
            displayMessage(`⚠️  Could not extract version info: ${(error as Error).message}`);
        }
    }

    const newSite: GroundTruthSite = {
        url: normalizedUrl,
        cms: cms,
        version: version || undefined,
        confidence: confidence,
        addedAt: new Date().toISOString(),
        verifiedBy: 'ground-truth-discovery',
        notes: notes || undefined,
        detectedVersion: detectedVersion,
        versionSource: versionSource,
    };

    if (existingIndex >= 0) {
        database.sites[existingIndex] = newSite;
    } else {
        database.sites.push(newSite);
    }

    database.lastUpdated = new Date().toISOString();

    // Ensure directory exists
    const dir = path.dirname(groundTruthPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Save database
    fs.writeFileSync(groundTruthPath, JSON.stringify(database, null, 2));
}
