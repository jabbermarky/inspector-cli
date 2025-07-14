import { createModuleLogger } from '../utils/logger.js';
import { AnalysisResult, IndexEntry } from './types.js';
import path from 'path';
import fs from 'fs/promises';

const logger = createModuleLogger('learn-storage');

/**
 * Store analysis result to filesystem
 */
export async function storeAnalysisResult(result: AnalysisResult): Promise<void> {
    logger.info('Storing analysis result', { 
        analysisId: result.metadata.analysisId,
        url: result.metadata.url 
    });
    
    try {
        const learnDir = path.join(process.cwd(), 'data', 'learn');
        const dateDir = path.join(learnDir, 'by-date', new Date().toISOString().split('T')[0]);
        
        // Ensure directories exist
        await fs.mkdir(dateDir, { recursive: true });
        
        // Generate filename
        const domain = new URL(result.inputData.url).hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `analysis-${result.metadata.analysisId}-${domain}.json`;
        const filepath = path.join(dateDir, filename);
        
        // Write analysis file
        await fs.writeFile(filepath, JSON.stringify(result, null, 2));
        
        // Update index
        await updateIndex(result, filepath);
        
        logger.info('Analysis result stored successfully', { 
            analysisId: result.metadata.analysisId,
            filepath: filepath.replace(process.cwd(), '.')
        });
        
    } catch (error) {
        logger.error('Failed to store analysis result', { 
            analysisId: result.metadata.analysisId,
            url: result.metadata.url 
        }, error as Error);
        throw error;
    }
}

/**
 * Update the master index with new analysis
 */
async function updateIndex(result: AnalysisResult, filepath: string): Promise<void> {
    const learnDir = path.join(process.cwd(), 'data', 'learn');
    const indexPath = path.join(learnDir, 'index.json');
    
    let index: IndexEntry[] = [];
    
    try {
        const indexContent = await fs.readFile(indexPath, 'utf-8');
        index = JSON.parse(indexContent);
    } catch (error) {
        // Index doesn't exist yet, start fresh
        logger.info('Creating new learn index', { indexPath });
    }
    
    const newEntry: IndexEntry = {
        analysisId: result.metadata.analysisId,
        url: result.inputData.url,
        timestamp: result.metadata.timestamp,
        filepath: path.relative(learnDir, filepath),
        technology: result.analysis?.technologyDetected || 'Unknown',
        confidence: result.analysis?.confidence || 0
    };
    
    index.push(newEntry);
    
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
    
    logger.debug('Index updated', { 
        analysisId: result.metadata.analysisId,
        indexEntries: index.length 
    });
}

/**
 * Ensure learn directory structure exists
 */
export async function ensureLearnDirectoryStructure(): Promise<void> {
    const learnDir = path.join(process.cwd(), 'data', 'learn');
    
    const directories = [
        learnDir,
        path.join(learnDir, 'by-date'),
        path.join(learnDir, 'by-technology'),
        path.join(learnDir, 'summaries')
    ];
    
    for (const dir of directories) {
        await fs.mkdir(dir, { recursive: true });
    }
    
    logger.debug('Learn directory structure ensured', { learnDir });
}