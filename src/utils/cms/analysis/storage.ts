import * as path from 'path';
import { DetectionDataPoint, AnalysisQuery, CollectionConfig } from './types.js';
import { FileSystemAdapter, FileSystemAdapterFactory } from './filesystem-adapter.js';

// Re-export for external use
export type { AnalysisQuery };
import { createModuleLogger } from '../../logger.js';

const logger = createModuleLogger('data-storage');

/**
 * Data storage manager for analysis data
 * Handles efficient storage, retrieval, and querying of detection data points
 */
export class DataStorage {
    private dataDir: string;
    private indexFile: string;
    private index: Map<string, DataPointIndex> = new Map();
    private fileSystem: FileSystemAdapter;

    constructor(dataDir: string = './data/cms-analysis', fileSystemType: 'node' | 'memory' = 'node') {
        this.dataDir = dataDir;
        this.indexFile = path.join(dataDir, 'index.json');
        this.fileSystem = FileSystemAdapterFactory.create(fileSystemType);
    }

    /**
     * Initialize storage directory and load existing index
     */
    async initialize(): Promise<void> {
        try {
            // Create data directory if it doesn't exist
            await this.fileSystem.mkdir(this.dataDir, { recursive: true });
            
            // Load existing index
            await this.loadIndex();
            
            logger.info('Data storage initialized', { 
                dataDir: this.dataDir,
                indexedItems: this.index.size 
            });
        } catch (error) {
            logger.error('Failed to initialize data storage', { 
                error: (error as Error).message 
            });
            throw error;
        }
    }

    /**
     * Store a detection data point
     */
    async store(dataPoint: DetectionDataPoint): Promise<string> {
        try {
            // Generate unique file ID based on URL and timestamp
            const fileId = this.generateFileId(dataPoint.url, dataPoint.timestamp);
            const fileName = `${fileId}.json`;
            const filePath = path.join(this.dataDir, fileName);
            
            // Write data point to file
            const jsonData = JSON.stringify(dataPoint, null, 2);
            await this.fileSystem.writeFile(filePath, jsonData, 'utf8');
            
            // Update index
            const indexEntry: DataPointIndex = {
                fileId,
                url: dataPoint.url,
                timestamp: dataPoint.timestamp,
                cms: this.extractCmsFromResults(dataPoint.detectionResults),
                confidence: this.extractMaxConfidence(dataPoint.detectionResults),
                dataSize: jsonData.length,
                filePath: fileName,
                captureVersion: dataPoint.captureVersion
            };
            
            this.index.set(fileId, indexEntry);
            await this.saveIndex();
            
            logger.debug('Data point stored', { 
                fileId, 
                url: dataPoint.url,
                dataSize: indexEntry.dataSize
            });
            
            return fileId;
            
        } catch (error) {
            logger.error('Failed to store data point', { 
                url: dataPoint.url,
                error: (error as Error).message 
            });
            throw error;
        }
    }

    /**
     * Store multiple data points in batch
     */
    async storeBatch(dataPoints: DetectionDataPoint[]): Promise<string[]> {
        const fileIds: string[] = [];
        
        // Handle empty batch - still need to ensure index exists
        if (dataPoints.length === 0) {
            await this.saveIndex();
            return fileIds;
        }
        
        for (const dataPoint of dataPoints) {
            try {
                const fileId = await this.store(dataPoint);
                fileIds.push(fileId);
            } catch (error) {
                logger.warn('Failed to store data point in batch', { 
                    url: dataPoint.url,
                    error: (error as Error).message 
                });
                // For batch operations, if any writes fail, we should propagate the error
                // This matches the expected behavior in tests
                throw error;
            }
        }
        
        logger.info('Batch storage completed', { 
            total: dataPoints.length,
            successful: fileIds.length,
            failed: dataPoints.length - fileIds.length
        });
        
        return fileIds;
    }

    /**
     * Get a data point by file ID (alias for retrieve)
     */
    async getDataPoint(fileId: string): Promise<DetectionDataPoint | null> {
        return this.retrieve(fileId);
    }

    /**
     * Retrieve a data point by file ID
     */
    async retrieve(fileId: string): Promise<DetectionDataPoint | null> {
        try {
            const indexEntry = this.index.get(fileId);
            if (!indexEntry) {
                return null;
            }
            
            const filePath = path.join(this.dataDir, indexEntry.filePath);
            const jsonData = await this.fileSystem.readFile(filePath, 'utf8');
            const dataPoint = JSON.parse(jsonData) as DetectionDataPoint;
            
            // Convert timestamp back to Date object
            dataPoint.timestamp = new Date(dataPoint.timestamp);
            
            return dataPoint;
            
        } catch (error) {
            logger.error('Failed to retrieve data point', { 
                fileId,
                error: (error as Error).message 
            });
            return null;
        }
    }

    /**
     * Query data points based on criteria
     */
    async query(query: AnalysisQuery): Promise<DetectionDataPoint[]> {
        try {
            const matchingEntries = this.filterIndex(query);
            const dataPoints: DetectionDataPoint[] = [];
            
            for (const entry of matchingEntries) {
                try {
                    const dataPoint = await this.retrieve(entry.fileId);
                    if (dataPoint) {
                        dataPoints.push(dataPoint);
                    }
                } catch (error) {
                    // If we can't read a specific file, just skip it instead of failing the entire query
                    logger.warn('Failed to retrieve data point during query', { 
                        fileId: entry.fileId,
                        error: (error as Error).message 
                    });
                }
            }
            
            logger.info('Query completed', { 
                query: this.summarizeQuery(query),
                results: dataPoints.length 
            });
            
            return dataPoints;
            
        } catch (error) {
            logger.error('Failed to query data points', { 
                error: (error as Error).message 
            });
            throw error;
        }
    }

    /**
     * Get storage statistics
     */
    async getStatistics(): Promise<StorageStatistics> {
        const stats: StorageStatistics = {
            totalDataPoints: this.index.size,
            totalSize: 0,
            cmsDistribution: new Map(),
            dateRange: { earliest: null, latest: null },
            avgConfidence: 0
        };

        let totalConfidence = 0;
        let confidenceCount = 0;

        for (const entry of this.index.values()) {
            stats.totalSize += entry.dataSize;
            
            // CMS distribution
            const cms = entry.cms || 'Unknown';
            stats.cmsDistribution.set(cms, (stats.cmsDistribution.get(cms) || 0) + 1);
            
            // Date range
            if (!stats.dateRange.earliest || entry.timestamp < stats.dateRange.earliest) {
                stats.dateRange.earliest = entry.timestamp;
            }
            if (!stats.dateRange.latest || entry.timestamp > stats.dateRange.latest) {
                stats.dateRange.latest = entry.timestamp;
            }
            
            // Average confidence
            if (entry.confidence > 0) {
                totalConfidence += entry.confidence;
                confidenceCount++;
            }
        }

        if (confidenceCount > 0) {
            stats.avgConfidence = totalConfidence / confidenceCount;
        }

        return stats;
    }

    /**
     * Export data to different formats
     */
    async export(format: 'json' | 'jsonl' | 'csv', outputPath: string, query?: AnalysisQuery): Promise<void> {
        try {
            const dataPoints = query ? await this.query(query) : await this.getAllDataPoints();
            
            switch (format) {
                case 'json':
                    await this.exportJson(dataPoints, outputPath);
                    break;
                case 'jsonl':
                    await this.exportJsonLines(dataPoints, outputPath);
                    break;
                case 'csv':
                    await this.exportCsv(dataPoints, outputPath);
                    break;
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }
            
            logger.info('Data exported successfully', { 
                format, 
                outputPath, 
                dataPoints: dataPoints.length 
            });
            
        } catch (error) {
            logger.error('Failed to export data', { 
                format, 
                outputPath, 
                error: (error as Error).message 
            });
            throw error;
        }
    }

    // Private helper methods

    private generateFileId(url: string, timestamp: Date): string {
        const urlHash = Buffer.from(url).toString('base64url').substring(0, 10);
        const timeHash = timestamp.getTime().toString(36);
        const randomSuffix = Math.random().toString(36).substring(2, 6);
        return `${timeHash}-${urlHash}-${randomSuffix}`;
    }

    private async loadIndex(): Promise<void> {
        try {
            const indexData = await this.fileSystem.readFile(this.indexFile, 'utf8');
            const parsedData = JSON.parse(indexData);
            
            // Handle both formats: direct array or {files: array}
            const indexArray = Array.isArray(parsedData) ? parsedData : parsedData.files;
            
            if (!indexArray || !Array.isArray(indexArray)) {
                throw new Error('Invalid index format: expected array or {files: array}');
            }
            
            this.index.clear();
            for (const entry of indexArray) {
                entry.timestamp = new Date(entry.timestamp);
                this.index.set(entry.fileId, entry);
            }
            
            logger.debug('Index loaded successfully', { 
                format: Array.isArray(parsedData) ? 'direct-array' : 'wrapped-object',
                entries: indexArray.length 
            });
        } catch (error) {
            if ((error as any).code === 'ENOENT') {
                // Index file doesn't exist, start fresh
                logger.info('Starting with fresh index', { reason: 'Index file not found' });
                this.index.clear();
            } else if (error instanceof SyntaxError) {
                // JSON parsing error - this should be thrown for corrupted JSON
                logger.error('Corrupted index file', { error: error.message });
                throw new Error('Corrupted index file: ' + error.message);
            } else {
                // Other errors should be thrown
                logger.error('Failed to load index', { error: (error as Error).message });
                throw error;
            }
        }
    }

    private async saveIndex(): Promise<void> {
        const indexArray = Array.from(this.index.values());
        const jsonData = JSON.stringify(indexArray, null, 2);
        await this.fileSystem.writeFile(this.indexFile, jsonData, 'utf8');
    }

    private filterIndex(query: AnalysisQuery): DataPointIndex[] {
        let results = Array.from(this.index.values());

        if (query.urls) {
            results = results.filter(entry => query.urls!.includes(entry.url));
        }

        if (query.cmsTypes) {
            results = results.filter(entry => query.cmsTypes!.includes(entry.cms || 'Unknown'));
        }

        if (query.dateRange) {
            results = results.filter(entry => 
                entry.timestamp >= query.dateRange!.start && 
                entry.timestamp <= query.dateRange!.end
            );
        }

        if (query.minConfidence !== undefined) {
            results = results.filter(entry => entry.confidence >= query.minConfidence!);
        }

        if (!query.includeUnknown) {
            results = results.filter(entry => entry.cms && entry.cms !== 'Unknown');
        }

        return results;
    }

    async getAllDataPoints(): Promise<DetectionDataPoint[]> {
        const dataPoints: DetectionDataPoint[] = [];
        for (const entry of this.index.values()) {
            const dataPoint = await this.retrieve(entry.fileId);
            if (dataPoint) {
                dataPoints.push(dataPoint);
            }
        }
        return dataPoints;
    }

    private extractCmsFromResults(results: DetectionDataPoint['detectionResults']): string | undefined {
        if (!results || results.length === 0) return undefined;
        
        const bestResult = results.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
        );
        
        return bestResult.cms !== 'Unknown' ? bestResult.cms : undefined;
    }

    private extractMaxConfidence(results: DetectionDataPoint['detectionResults']): number {
        if (!results || results.length === 0) return 0;
        return Math.max(...results.map(r => r.confidence));
    }

    private summarizeQuery(query: AnalysisQuery): string {
        const parts = [];
        if (query.urls) parts.push(`urls: ${query.urls.length}`);
        if (query.cmsTypes) parts.push(`cms: [${query.cmsTypes.join(', ')}]`);
        if (query.dateRange) parts.push(`date: ${query.dateRange.start.toISOString().split('T')[0]} to ${query.dateRange.end.toISOString().split('T')[0]}`);
        if (query.minConfidence) parts.push(`minConf: ${query.minConfidence}`);
        return parts.join(', ');
    }

    private async exportJson(dataPoints: DetectionDataPoint[], outputPath: string): Promise<void> {
        const jsonData = JSON.stringify(dataPoints, null, 2);
        await this.fileSystem.writeFile(outputPath, jsonData, 'utf8');
    }

    private async exportJsonLines(dataPoints: DetectionDataPoint[], outputPath: string): Promise<void> {
        const lines = dataPoints.map(dp => JSON.stringify(dp)).join('\n');
        await this.fileSystem.writeFile(outputPath, lines, 'utf8');
    }

    private async exportCsv(dataPoints: DetectionDataPoint[], outputPath: string): Promise<void> {
        const headers = [
            'url', 'timestamp', 'finalUrl', 'statusCode', 'cms', 'confidence', 
            'version', 'redirectCount', 'protocolUpgraded', 'loadTime', 
            'htmlSize', 'metaTagCount', 'scriptCount', 'linkCount'
        ];
        
        const rows = dataPoints.map(dp => [
            dp.url,
            dp.timestamp.toISOString(),
            dp.finalUrl,
            dp.statusCode,
            this.extractCmsFromResults(dp.detectionResults) || 'Unknown',
            this.extractMaxConfidence(dp.detectionResults),
            dp.detectionResults.find(r => r.version)?.version || '',
            dp.totalRedirects,
            dp.protocolUpgraded,
            dp.loadTime,
            dp.htmlSize,
            dp.metaTags.length,
            dp.scripts.length,
            dp.links.length
        ]);
        
        const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))]
            .join('\n');
        
        await this.fileSystem.writeFile(outputPath, csvContent, 'utf8');
    }
}

// Supporting interfaces
interface DataPointIndex {
    fileId: string;
    url: string;
    timestamp: Date;
    cms?: string;
    confidence: number;
    dataSize: number;
    filePath: string;
    captureVersion: import('../types.js').CaptureVersion;
}

interface StorageStatistics {
    totalDataPoints: number;
    totalSize: number;
    cmsDistribution: Map<string, number>;
    dateRange: {
        earliest: Date | null;
        latest: Date | null;
    };
    avgConfidence: number;
}