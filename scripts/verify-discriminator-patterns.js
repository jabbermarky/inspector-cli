#!/usr/bin/env node

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Define discriminator patterns for each CMS
const DISCRIMINATOR_PATTERNS = {
    WordPress: [
        'meta_generator_wordpress',
        'url_json_endpoint_wp',
        'url_content_structure_wordpress',
        'js_embed_wordpress',
        'css_includes_wordpress',
        'js_emoji_release_wordpress',
        'url_rest_api_wp',
        'url_admin_ajax_wp'
    ],
    Drupal: [
        'js_settings_drupal',
        'js_object_drupal',
        'meta_generator_drupal',
        'header_x_drupal',
        'css_aggregate_drupal',
        'js_aggregate_drupal',
        'js_version_drupal',
        'url_theme_structure_drupal'
    ],
    Joomla: [
        'js_object_joomla',
        'meta_generator_joomla',
        'css_system_joomla',
        'url_template_structure_joomla',
        'url_media_version_joomla',
        'url_component_structure_joomla',
        'url_modules_structure_joomla'
    ],
    Duda: [
        'js_global_window_parameters',
        'css_class_dm_body',
        'js_global_dm_direct',
        'url_ajax_api_duda',
        'meta_viewport_duda',
        'js_runtime_config_duda'
    ]
};

// Minimum required discriminator patterns
const MIN_DISCRIMINATORS = 2;

function analyzeCollectedData() {
    const dataDir = join(process.cwd(), 'data', 'cms-analysis');
    const files = readdirSync(dataDir).filter(f => f.endsWith('.json') && f !== 'index.json');
    
    const results = {
        WordPress: { total: 0, withDiscriminators: 0, patterns: {} },
        Drupal: { total: 0, withDiscriminators: 0, patterns: {} },
        Joomla: { total: 0, withDiscriminators: 0, patterns: {} },
        Duda: { total: 0, withDiscriminators: 0, patterns: {} }
    };
    
    for (const file of files) {
        try {
            const data = JSON.parse(readFileSync(join(dataDir, file), 'utf-8'));
            const cms = data.detectedCMS?.name;
            
            if (!cms || !results[cms]) continue;
            
            results[cms].total++;
            
            // Count discriminator patterns
            let discriminatorCount = 0;
            const foundPatterns = [];
            
            if (data.analysisResult?.patterns) {
                for (const pattern of data.analysisResult.patterns) {
                    if (DISCRIMINATOR_PATTERNS[cms].includes(pattern.name)) {
                        discriminatorCount++;
                        foundPatterns.push(pattern.name);
                        results[cms].patterns[pattern.name] = (results[cms].patterns[pattern.name] || 0) + 1;
                    }
                }
            }
            
            if (discriminatorCount >= MIN_DISCRIMINATORS) {
                results[cms].withDiscriminators++;
            } else {
                console.log(`⚠️  ${data.url} - Only ${discriminatorCount} discriminator patterns:`, foundPatterns);
            }
            
        } catch (e) {
            console.error(`Error processing ${file}:`, e.message);
        }
    }
    
    console.log('\n=== Discriminator Pattern Analysis ===\n');
    
    for (const [cms, data] of Object.entries(results)) {
        if (data.total === 0) continue;
        
        const percentage = ((data.withDiscriminators / data.total) * 100).toFixed(1);
        console.log(`${cms}:`);
        console.log(`  Total sites: ${data.total}`);
        console.log(`  Sites with ${MIN_DISCRIMINATORS}+ discriminators: ${data.withDiscriminators} (${percentage}%)`);
        console.log(`  Pattern frequency:`);
        
        const sortedPatterns = Object.entries(data.patterns)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
        
        for (const [pattern, count] of sortedPatterns) {
            const freq = ((count / data.total) * 100).toFixed(1);
            console.log(`    - ${pattern}: ${count} sites (${freq}%)`);
        }
        console.log();
    }
    
    // Check if all sites meet criteria
    const allGood = Object.values(results).every(r => 
        r.total === 0 || r.withDiscriminators === r.total
    );
    
    if (allGood) {
        console.log('✅ All sites have sufficient discriminator patterns!');
    } else {
        console.log('⚠️  Some sites lack sufficient discriminator patterns');
    }
}

analyzeCollectedData();