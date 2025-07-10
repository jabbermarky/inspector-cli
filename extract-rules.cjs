#!/usr/bin/env node

/**
 * Simple rule extraction tool
 * Reads existing CMS analysis data and extracts frequency-based detection rules
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DATA_DIR = './data/cms-analysis';
const RULES_OUTPUT_DIR = './rules';
const MIN_FREQUENCY = 0.3; // Pattern must appear in 30%+ of sites to be included

class RuleExtractor {
    constructor() {
        this.dataPoints = [];
        this.cmsGroups = {};
    }

    async run() {
        console.log('🔍 Rule Extraction Tool');
        console.log('=======================');
        
        try {
            await this.loadData();
            this.groupByCMS();
            const rules = this.extractRules();
            await this.writeRules(rules);
            this.printSummary(rules);
        } catch (error) {
            console.error('❌ Error:', error.message);
            process.exit(1);
        }
    }

    async loadData() {
        console.log(`📂 Loading data from ${DATA_DIR}...`);
        
        if (!fs.existsSync(DATA_DIR)) {
            throw new Error(`Data directory ${DATA_DIR} not found`);
        }

        // Read index.json to get list of data files
        const indexPath = path.join(DATA_DIR, 'index.json');
        if (!fs.existsSync(indexPath)) {
            throw new Error(`Index file ${indexPath} not found`);
        }

        const indexContent = fs.readFileSync(indexPath, 'utf8');
        const indexData = JSON.parse(indexContent);
        
        // Handle both array and {files: array} formats
        const indexArray = Array.isArray(indexData) ? indexData : indexData.files;
        
        if (!indexArray || !Array.isArray(indexArray)) {
            throw new Error('Invalid index format');
        }

        console.log(`📊 Found ${indexArray.length} indexed data files`);

        // Load each data file
        for (const entry of indexArray) {
            const dataFilePath = path.join(DATA_DIR, entry.filePath);
            
            if (fs.existsSync(dataFilePath)) {
                try {
                    const dataContent = fs.readFileSync(dataFilePath, 'utf8');
                    const dataPoint = JSON.parse(dataContent);
                    
                    // Add index metadata to data point
                    dataPoint.indexEntry = entry;
                    this.dataPoints.push(dataPoint);
                } catch (error) {
                    console.warn(`⚠️  Failed to load ${entry.filePath}: ${error.message}`);
                }
            }
        }

        console.log(`✅ Loaded ${this.dataPoints.length} data points`);
    }

    groupByCMS() {
        console.log('🏷️  Grouping data by CMS type...');
        
        this.cmsGroups = {};
        
        for (const dataPoint of this.dataPoints) {
            // Get CMS from index entry (more reliable than detection results)
            const cms = dataPoint.indexEntry?.cms || 'Unknown';
            
            if (cms !== 'Unknown') {
                if (!this.cmsGroups[cms]) {
                    this.cmsGroups[cms] = [];
                }
                this.cmsGroups[cms].push(dataPoint);
            }
        }

        Object.entries(this.cmsGroups).forEach(([cms, sites]) => {
            console.log(`   ${cms}: ${sites.length} sites`);
        });
    }

    extractRules() {
        console.log('🔬 Extracting patterns...');
        
        const allRules = {};
        
        for (const [cmsName, sites] of Object.entries(this.cmsGroups)) {
            console.log(`\n📋 Analyzing ${cmsName} (${sites.length} sites):`);
            
            const cmsRules = {
                ruleset: `${cmsName.toLowerCase()}-v0-extracted`,
                version: '0.1.0',
                cms: cmsName,
                extraction_info: {
                    source_sites: sites.length,
                    extraction_date: new Date().toISOString(),
                    min_frequency: MIN_FREQUENCY,
                    tool: 'extract-rules.js'
                },
                rules: []
            };

            // Extract meta tag patterns
            const metaRules = this.extractMetaTagPatterns(sites, cmsName);
            cmsRules.rules.push(...metaRules);

            // Extract script patterns
            const scriptRules = this.extractScriptPatterns(sites, cmsName);
            cmsRules.rules.push(...scriptRules);

            // Extract header patterns
            const headerRules = this.extractHeaderPatterns(sites, cmsName);
            cmsRules.rules.push(...headerRules);

            // Extract HTML content patterns
            const htmlRules = this.extractHtmlContentPatterns(sites, cmsName);
            cmsRules.rules.push(...htmlRules);

            // Extract stylesheet patterns
            const stylesheetRules = this.extractStylesheetPatterns(sites, cmsName);
            cmsRules.rules.push(...stylesheetRules);

            // Extract DOM element patterns
            const domRules = this.extractDomElementPatterns(sites, cmsName);
            cmsRules.rules.push(...domRules);

            // Extract link patterns
            const linkRules = this.extractLinkPatterns(sites, cmsName);
            cmsRules.rules.push(...linkRules);

            // Extract form patterns
            const formRules = this.extractFormPatterns(sites, cmsName);
            cmsRules.rules.push(...formRules);

            // Extract robots.txt patterns
            const robotsRules = this.extractRobotsPatterns(sites, cmsName);
            cmsRules.rules.push(...robotsRules);

            console.log(`   ✅ Extracted ${cmsRules.rules.length} rules`);
            allRules[cmsName] = cmsRules;
        }

        return allRules;
    }

    extractMetaTagPatterns(sites, cmsName) {
        const metaTags = sites.flatMap(site => site.metaTags || []);
        const patterns = {};

        // Count occurrences of each meta tag name/content combination
        sites.forEach((site, siteIndex) => {
            if (site.metaTags && Array.isArray(site.metaTags)) {
                site.metaTags.forEach(tag => {
                    if (tag.name) {
                        const key = `${tag.name}:${tag.content || ''}`;
                        if (!patterns[key]) {
                            patterns[key] = {
                                name: tag.name,
                                content: tag.content,
                                count: 0,
                                sites: new Set()
                            };
                        }
                        patterns[key].count++;
                        patterns[key].sites.add(siteIndex);
                    }
                });
            }
        });

        const rules = [];
        
        // Create aggregated patterns for better rule extraction
        const aggregatedPatterns = {};
        
        Object.entries(patterns).forEach(([key, pattern]) => {
            if (pattern.content && pattern.name) {
                const contentLower = pattern.content.toLowerCase();
                const cmsLower = cmsName.toLowerCase();
                
                // CMS detection patterns
                const cmsVariations = {
                    'wordpress': ['wordpress', 'wp-'],
                    'joomla': ['joomla', 'joomla!'],
                    'drupal': ['drupal']
                };
                
                const variationsToCheck = cmsVariations[cmsLower] || [cmsLower];
                const matchesVariation = variationsToCheck.some(variation => 
                    contentLower.includes(variation.toLowerCase())
                );
                
                if (matchesVariation) {
                    // Create aggregated pattern key
                    const aggregatedKey = `${pattern.name}-${cmsName.toLowerCase()}`;
                    
                    if (!aggregatedPatterns[aggregatedKey]) {
                        aggregatedPatterns[aggregatedKey] = {
                            name: pattern.name,
                            cmsName: cmsName,
                            sites: new Set(),
                            examples: []
                        };
                    }
                    
                    // Add sites and examples
                    pattern.sites.forEach(site => aggregatedPatterns[aggregatedKey].sites.add(site));
                    if (aggregatedPatterns[aggregatedKey].examples.length < 3) {
                        aggregatedPatterns[aggregatedKey].examples.push(pattern.content);
                    }
                }
            }
        });
        
        // Convert aggregated patterns to rules
        Object.entries(aggregatedPatterns).forEach(([key, pattern]) => {
            const frequency = pattern.sites.size / sites.length;
            
            // Use lower threshold for meta tags since they're more reliable
            const metaThreshold = 0.1; // 10% for meta tags
            
            if (frequency >= metaThreshold) {
                rules.push({
                    id: `${cmsName.toLowerCase()}-meta-${pattern.name}`,
                    type: 'meta-tag',
                    selector: `name=${pattern.name}`,
                    condition: 'contains',
                    value: cmsName,
                    confidence: Math.round(frequency * 100) / 100,
                    frequency: frequency,
                    found_in_sites: pattern.sites.size,
                    total_sites: sites.length,
                    examples: pattern.examples.slice(0, 3)
                });
            }
        });

        if (rules.length > 0) {
            console.log(`      📝 Meta tags: ${rules.length} patterns`);
        }

        return rules;
    }

    extractScriptPatterns(sites, cmsName) {
        const scripts = sites.flatMap(site => site.scripts || []);
        const patterns = {};

        // Extract common script path patterns
        scripts.forEach(script => {
            if (script.src) {
                // Look for CMS-specific path patterns
                const src = script.src.toLowerCase();
                const cmsLower = cmsName.toLowerCase();
                
                // Common CMS patterns
                const cmsPatterns = {
                    'wordpress': ['wp-content', 'wp-includes', 'wp-admin'],
                    'drupal': ['/sites/', '/core/', '/modules/', '/themes/'],
                    'joomla': ['/media/', '/administrator/', '/components/']
                };

                const patternsToCheck = cmsPatterns[cmsLower] || [cmsLower];
                
                patternsToCheck.forEach(pattern => {
                    if (src.includes(pattern)) {
                        if (!patterns[pattern]) {
                            patterns[pattern] = {
                                pattern: pattern,
                                count: 0,
                                sites: new Set(),
                                examples: []
                            };
                        }
                        patterns[pattern].count++;
                        patterns[pattern].sites.add(sites.findIndex(s => s.scripts?.includes(script)));
                        if (patterns[pattern].examples.length < 3) {
                            patterns[pattern].examples.push(script.src);
                        }
                    }
                });
            }
        });

        const rules = [];
        
        Object.entries(patterns).forEach(([patternKey, pattern]) => {
            const frequency = pattern.sites.size / sites.length;
            
            if (frequency >= MIN_FREQUENCY) {
                rules.push({
                    id: `${cmsName.toLowerCase()}-script-${patternKey.replace(/[^a-z0-9]/g, '')}`,
                    type: 'script-src',
                    condition: 'contains',
                    value: pattern.pattern,
                    confidence: Math.round(frequency * 100) / 100,
                    frequency: frequency,
                    found_in_sites: pattern.sites.size,
                    total_sites: sites.length,
                    examples: pattern.examples
                });
            }
        });

        if (rules.length > 0) {
            console.log(`      🎬 Scripts: ${rules.length} patterns`);
        }

        return rules;
    }

    extractHeaderPatterns(sites, cmsName) {
        const allHeaders = sites.flatMap(site => 
            Object.entries(site.headers || {}).map(([name, value]) => ({
                name: name.toLowerCase(),
                value: value,
                site: site.url
            }))
        );

        const patterns = {};
        const cmsLower = cmsName.toLowerCase();

        allHeaders.forEach(header => {
            const valueLower = (header.value || '').toLowerCase();
            
            // Look for CMS name in header values
            if (valueLower.includes(cmsLower)) {
                const key = `${header.name}:${cmsLower}`;
                if (!patterns[key]) {
                    patterns[key] = {
                        headerName: header.name,
                        count: 0,
                        sites: new Set(),
                        examples: []
                    };
                }
                patterns[key].count++;
                patterns[key].sites.add(header.site);
                if (patterns[key].examples.length < 3) {
                    patterns[key].examples.push(header.value);
                }
            }
        });

        const rules = [];

        Object.entries(patterns).forEach(([key, pattern]) => {
            const frequency = pattern.sites.size / sites.length;
            
            if (frequency >= MIN_FREQUENCY) {
                rules.push({
                    id: `${cmsName.toLowerCase()}-header-${pattern.headerName.replace(/[^a-z0-9]/g, '')}`,
                    type: 'http-header',
                    header: pattern.headerName,
                    condition: 'contains',
                    value: cmsName,
                    confidence: Math.round(frequency * 100) / 100,
                    frequency: frequency,
                    found_in_sites: pattern.sites.size,
                    total_sites: sites.length,
                    examples: pattern.examples
                });
            }
        });

        if (rules.length > 0) {
            console.log(`      🌐 Headers: ${rules.length} patterns`);
        }

        return rules;
    }

    extractHtmlContentPatterns(sites, cmsName) {
        const patterns = {};
        const cmsLower = cmsName.toLowerCase();

        // Common CMS content patterns
        const contentPatterns = {
            'wordpress': ['wp-content', 'wp-includes', 'wordpress', 'wp-json'],
            'drupal': ['drupal', '/sites/', '/core/', 'drupal.js'],
            'joomla': ['joomla', '/administrator/', '/components/', '/templates/']
        };

        const patternsToCheck = contentPatterns[cmsLower] || [cmsLower];

        sites.forEach((site, siteIndex) => {
            const htmlContent = (site.htmlContent || '').toLowerCase();
            
            patternsToCheck.forEach(pattern => {
                if (htmlContent.includes(pattern)) {
                    if (!patterns[pattern]) {
                        patterns[pattern] = {
                            pattern: pattern,
                            count: 0,
                            sites: new Set()
                        };
                    }
                    patterns[pattern].count++;
                    patterns[pattern].sites.add(siteIndex);
                }
            });
        });

        const rules = [];

        Object.entries(patterns).forEach(([patternKey, pattern]) => {
            const frequency = pattern.sites.size / sites.length;
            
            if (frequency >= MIN_FREQUENCY) {
                rules.push({
                    id: `${cmsName.toLowerCase()}-html-${patternKey.replace(/[^a-z0-9]/g, '')}`,
                    type: 'html-content',
                    condition: 'contains',
                    value: pattern.pattern,
                    confidence: Math.round(frequency * 100) / 100,
                    frequency: frequency,
                    found_in_sites: pattern.sites.size,
                    total_sites: sites.length
                });
            }
        });

        if (rules.length > 0) {
            console.log(`      📄 HTML content: ${rules.length} patterns`);
        }

        return rules;
    }

    extractStylesheetPatterns(sites, cmsName) {
        const stylesheets = sites.flatMap(site => site.stylesheets || []);
        const patterns = {};
        const cmsLower = cmsName.toLowerCase();

        // Common CMS stylesheet patterns
        const cmsStylesheetPatterns = {
            'wordpress': ['/wp-content/', '/wp-includes/', '/themes/', '/plugins/'],
            'drupal': ['/sites/', '/core/', '/modules/', '/themes/'],
            'joomla': ['/media/', '/templates/', '/administrator/', '/components/']
        };

        const patternsToCheck = cmsStylesheetPatterns[cmsLower] || [cmsLower];

        stylesheets.forEach(stylesheet => {
            if (stylesheet.href) {
                const href = stylesheet.href.toLowerCase();
                
                patternsToCheck.forEach(pattern => {
                    if (href.includes(pattern)) {
                        if (!patterns[pattern]) {
                            patterns[pattern] = {
                                pattern: pattern,
                                count: 0,
                                sites: new Set(),
                                examples: []
                            };
                        }
                        patterns[pattern].count++;
                        patterns[pattern].sites.add(sites.findIndex(s => s.stylesheets?.includes(stylesheet)));
                        if (patterns[pattern].examples.length < 3) {
                            patterns[pattern].examples.push(stylesheet.href);
                        }
                    }
                });
            }
        });

        const rules = [];
        
        Object.entries(patterns).forEach(([patternKey, pattern]) => {
            const frequency = pattern.sites.size / sites.length;
            
            if (frequency >= MIN_FREQUENCY) {
                rules.push({
                    id: `${cmsName.toLowerCase()}-stylesheet-${patternKey.replace(/[^a-z0-9]/g, '')}`,
                    type: 'stylesheet-href',
                    condition: 'contains',
                    value: pattern.pattern,
                    confidence: Math.round(frequency * 100) / 100,
                    frequency: frequency,
                    found_in_sites: pattern.sites.size,
                    total_sites: sites.length,
                    examples: pattern.examples
                });
            }
        });

        if (rules.length > 0) {
            console.log(`      🎨 Stylesheets: ${rules.length} patterns`);
        }

        return rules;
    }

    extractDomElementPatterns(sites, cmsName) {
        const rules = [];
        const cmsLower = cmsName.toLowerCase();

        // Aggregate DOM element data
        const elementPatterns = {};

        sites.forEach((site, siteIndex) => {
            if (site.domElements && Array.isArray(site.domElements)) {
                site.domElements.forEach(element => {
                    if (element.count > 0) {
                        const selector = element.selector;
                        if (!elementPatterns[selector]) {
                            elementPatterns[selector] = {
                                selector: selector,
                                sites: new Set(),
                                totalCount: 0,
                                examples: []
                            };
                        }
                        elementPatterns[selector].sites.add(siteIndex);
                        elementPatterns[selector].totalCount += element.count;
                        
                        // Add samples if available
                        if (element.samples && element.samples.length > 0) {
                            elementPatterns[selector].examples.push(...element.samples.slice(0, 2));
                        }
                    }
                });
            }
        });

        // Convert to rules
        Object.entries(elementPatterns).forEach(([selector, pattern]) => {
            const frequency = pattern.sites.size / sites.length;
            
            if (frequency >= MIN_FREQUENCY) {
                // Check if selector is CMS-specific
                const selectorLower = selector.toLowerCase();
                if (selectorLower.includes(cmsLower) || 
                    (cmsLower === 'wordpress' && (selectorLower.includes('wp-') || selectorLower.includes('wp_'))) ||
                    (cmsLower === 'drupal' && selectorLower.includes('drupal')) ||
                    (cmsLower === 'joomla' && selectorLower.includes('joomla'))) {
                    
                    rules.push({
                        id: `${cmsName.toLowerCase()}-dom-${selector.replace(/[^a-z0-9]/g, '').substring(0, 20)}`,
                        type: 'dom-element',
                        selector: selector,
                        condition: 'exists',
                        confidence: Math.round(frequency * 100) / 100,
                        frequency: frequency,
                        found_in_sites: pattern.sites.size,
                        total_sites: sites.length,
                        total_elements: pattern.totalCount,
                        examples: pattern.examples.slice(0, 3)
                    });
                }
            }
        });

        if (rules.length > 0) {
            console.log(`      🏗️  DOM elements: ${rules.length} patterns`);
        }

        return rules;
    }

    extractLinkPatterns(sites, cmsName) {
        const links = sites.flatMap(site => site.links || []);
        const patterns = {};
        const cmsLower = cmsName.toLowerCase();

        // Look for CMS-specific link patterns
        links.forEach(link => {
            if (link.href) {
                const href = link.href.toLowerCase();
                const rel = (link.rel || '').toLowerCase();
                
                // Common CMS link patterns
                const cmsLinkPatterns = {
                    'wordpress': ['wp-content', 'wp-includes', 'wp-json', 'xmlrpc.php'],
                    'drupal': ['/sites/', '/core/', '/modules/', 'drupal'],
                    'joomla': ['/media/', '/templates/', '/administrator/', 'joomla']
                };

                const patternsToCheck = cmsLinkPatterns[cmsLower] || [cmsLower];
                
                patternsToCheck.forEach(pattern => {
                    if (href.includes(pattern)) {
                        const key = `${pattern}-${rel}`;
                        if (!patterns[key]) {
                            patterns[key] = {
                                pattern: pattern,
                                rel: rel,
                                count: 0,
                                sites: new Set(),
                                examples: []
                            };
                        }
                        patterns[key].count++;
                        patterns[key].sites.add(sites.findIndex(s => s.links?.includes(link)));
                        if (patterns[key].examples.length < 3) {
                            patterns[key].examples.push(link.href);
                        }
                    }
                });
            }
        });

        const rules = [];
        
        Object.entries(patterns).forEach(([key, pattern]) => {
            const frequency = pattern.sites.size / sites.length;
            
            if (frequency >= MIN_FREQUENCY) {
                rules.push({
                    id: `${cmsName.toLowerCase()}-link-${pattern.pattern.replace(/[^a-z0-9]/g, '')}-${pattern.rel}`,
                    type: 'link-href',
                    condition: 'contains',
                    value: pattern.pattern,
                    rel: pattern.rel || 'any',
                    confidence: Math.round(frequency * 100) / 100,
                    frequency: frequency,
                    found_in_sites: pattern.sites.size,
                    total_sites: sites.length,
                    examples: pattern.examples
                });
            }
        });

        if (rules.length > 0) {
            console.log(`      🔗 Links: ${rules.length} patterns`);
        }

        return rules;
    }

    extractFormPatterns(sites, cmsName) {
        const forms = sites.flatMap(site => site.forms || []);
        const patterns = {};
        const cmsLower = cmsName.toLowerCase();

        forms.forEach(form => {
            if (form.action) {
                const action = form.action.toLowerCase();
                
                // Look for CMS-specific form actions
                const cmsFormPatterns = {
                    'wordpress': ['wp-admin', 'wp-login', 'wp-content', 'xmlrpc'],
                    'drupal': ['/user/', '/admin/', '/node/', 'drupal'],
                    'joomla': ['/administrator/', '/component/', '/index.php', 'joomla']
                };

                const patternsToCheck = cmsFormPatterns[cmsLower] || [cmsLower];
                
                patternsToCheck.forEach(pattern => {
                    if (action.includes(pattern)) {
                        const method = (form.method || 'get').toLowerCase();
                        const key = `${pattern}-${method}`;
                        
                        if (!patterns[key]) {
                            patterns[key] = {
                                pattern: pattern,
                                method: method,
                                count: 0,
                                sites: new Set(),
                                examples: []
                            };
                        }
                        patterns[key].count++;
                        patterns[key].sites.add(sites.findIndex(s => s.forms?.includes(form)));
                        if (patterns[key].examples.length < 3) {
                            patterns[key].examples.push(form.action);
                        }
                    }
                });
            }
        });

        const rules = [];
        
        Object.entries(patterns).forEach(([key, pattern]) => {
            const frequency = pattern.sites.size / sites.length;
            
            if (frequency >= MIN_FREQUENCY) {
                rules.push({
                    id: `${cmsName.toLowerCase()}-form-${pattern.pattern.replace(/[^a-z0-9]/g, '')}-${pattern.method}`,
                    type: 'form-action',
                    condition: 'contains',
                    value: pattern.pattern,
                    method: pattern.method,
                    confidence: Math.round(frequency * 100) / 100,
                    frequency: frequency,
                    found_in_sites: pattern.sites.size,
                    total_sites: sites.length,
                    examples: pattern.examples
                });
            }
        });

        if (rules.length > 0) {
            console.log(`      📝 Forms: ${rules.length} patterns`);
        }

        return rules;
    }

    extractRobotsPatterns(sites, cmsName) {
        const robotsData = sites.map(site => site.robots).filter(robots => robots && robots.content);
        const patterns = {};
        const cmsLower = cmsName.toLowerCase();

        robotsData.forEach((robots, index) => {
            const content = robots.content.toLowerCase();
            
            // Look for CMS-specific robots.txt patterns
            const cmsRobotsPatterns = {
                'wordpress': ['wp-admin', 'wp-content', 'wp-includes', 'wp-json', 'xmlrpc'],
                'drupal': ['/admin/', '/user/', '/sites/', '/core/', '/modules/'],
                'joomla': ['/administrator/', '/cache/', '/tmp/', '/logs/', '/cli/']
            };

            const patternsToCheck = cmsRobotsPatterns[cmsLower] || [cmsLower];
            
            patternsToCheck.forEach(pattern => {
                if (content.includes(pattern)) {
                    if (!patterns[pattern]) {
                        patterns[pattern] = {
                            pattern: pattern,
                            count: 0,
                            sites: new Set(),
                            examples: []
                        };
                    }
                    patterns[pattern].count++;
                    patterns[pattern].sites.add(index);
                    if (patterns[pattern].examples.length < 2) {
                        // Extract relevant line from robots.txt
                        const lines = robots.content.split('\n');
                        const relevantLine = lines.find(line => line.toLowerCase().includes(pattern));
                        if (relevantLine) {
                            patterns[pattern].examples.push(relevantLine.trim());
                        }
                    }
                }
            });
        });

        const rules = [];
        
        Object.entries(patterns).forEach(([patternKey, pattern]) => {
            const frequency = pattern.sites.size / robotsData.length;
            
            if (frequency >= MIN_FREQUENCY && robotsData.length >= 3) {
                rules.push({
                    id: `${cmsName.toLowerCase()}-robots-${patternKey.replace(/[^a-z0-9]/g, '')}`,
                    type: 'robots-txt',
                    condition: 'contains',
                    value: pattern.pattern,
                    confidence: Math.round(frequency * 100) / 100,
                    frequency: frequency,
                    found_in_sites: pattern.sites.size,
                    total_sites: robotsData.length,
                    examples: pattern.examples
                });
            }
        });

        if (rules.length > 0) {
            console.log(`      🤖 Robots.txt: ${rules.length} patterns`);
        }

        return rules;
    }

    async writeRules(allRules) {
        console.log(`\n💾 Writing rules to ${RULES_OUTPUT_DIR}...`);
        
        // Create rules directory if it doesn't exist
        if (!fs.existsSync(RULES_OUTPUT_DIR)) {
            fs.mkdirSync(RULES_OUTPUT_DIR, { recursive: true });
        }

        for (const [cmsName, rules] of Object.entries(allRules)) {
            const filename = `${cmsName.toLowerCase()}-v0.json`;
            const filepath = path.join(RULES_OUTPUT_DIR, filename);
            
            fs.writeFileSync(filepath, JSON.stringify(rules, null, 2));
            console.log(`   ✅ ${filename}`);
        }
    }

    printSummary(allRules) {
        console.log('\n📊 Extraction Summary:');
        console.log('======================');
        
        let totalRules = 0;
        let totalSites = 0;

        Object.entries(allRules).forEach(([cmsName, rules]) => {
            const ruleCount = rules.rules.length;
            const siteCount = rules.extraction_info.source_sites;
            
            console.log(`${cmsName}:`);
            console.log(`   📏 ${ruleCount} rules extracted`);
            console.log(`   🏠 ${siteCount} sites analyzed`);
            
            if (ruleCount > 0) {
                const avgConfidence = rules.rules.reduce((sum, rule) => sum + rule.confidence, 0) / ruleCount;
                console.log(`   📈 Average confidence: ${Math.round(avgConfidence * 100)}%`);
            }
            
            totalRules += ruleCount;
            totalSites += siteCount;
        });

        console.log(`\n🎯 Total: ${totalRules} rules from ${totalSites} sites`);
        console.log(`📁 Rules saved to: ${RULES_OUTPUT_DIR}/`);
        
        if (totalRules === 0) {
            console.log('\n⚠️  No rules extracted. Try lowering MIN_FREQUENCY or check your data.');
        } else {
            console.log('\n✨ Rule extraction complete! Review the generated JSON files.');
        }
    }
}

// Run the tool
if (require.main === module) {
    const extractor = new RuleExtractor();
    extractor.run().catch(console.error);
}

module.exports = RuleExtractor;