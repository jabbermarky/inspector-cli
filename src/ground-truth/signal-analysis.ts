import { isSameDomainScript } from './same-domain-script.js';
import { hasSameDomainHtmlPattern, countSameDomainHtmlPatterns } from './same-domain-html-pattern.js';
import { extractVersionInfo } from './extract-version-info.js';
import { getVersionHints } from './get-version-hints.js';

export function analyzeScriptSignals(data: any): Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, examples?: string[]}> {
        const signals: Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, examples?: string[]}> = [];
        const scripts = data.scripts || [];
        const targetUrl = data.finalUrl || data.url || '';
        
        // WordPress script patterns - only count same-domain scripts
        const wpContentScripts = scripts.filter((s: any) => 
            s.src && s.src.toLowerCase().includes('/wp-content/') && isSameDomainScript(s.src, targetUrl));
        const wpIncludesScripts = scripts.filter((s: any) => 
            s.src && s.src.toLowerCase().includes('/wp-includes/') && isSameDomainScript(s.src, targetUrl));
        
        signals.push({
            signal: '/wp-content/ scripts (WordPress)',
            confidence: 'high' as const,
            match: wpContentScripts.length > 0,
            cms: 'WordPress',
            examples: wpContentScripts.slice(0, 2).map((s: any) => s.src)
        });
        
        signals.push({
            signal: '/wp-includes/ scripts (WordPress)',
            confidence: 'high' as const,
            match: wpIncludesScripts.length > 0,
            cms: 'WordPress',
            examples: wpIncludesScripts.slice(0, 1).map((s: any) => s.src)
        });
        
        // Drupal script patterns - only count same-domain scripts
        const drupalSitesScripts = scripts.filter((s: any) => 
            s.src && s.src.toLowerCase().includes('/sites/') && isSameDomainScript(s.src, targetUrl));
        const drupalCoreScripts = scripts.filter((s: any) => 
            s.src && s.src.toLowerCase().includes('/core/') && isSameDomainScript(s.src, targetUrl));
        const drupalModulesScripts = scripts.filter((s: any) => 
            s.src && s.src.toLowerCase().includes('/modules/') && isSameDomainScript(s.src, targetUrl));
        
        signals.push({
            signal: '/sites/ directory (Drupal)',
            confidence: 'high' as const,
            match: drupalSitesScripts.length > 0,
            cms: 'Drupal',
            examples: drupalSitesScripts.slice(0, 2).map((s: any) => s.src)
        });
        
        signals.push({
            signal: '/core/ directory (Drupal 8+)',
            confidence: 'medium' as const,
            match: drupalCoreScripts.length > 0,
            cms: 'Drupal',
            examples: drupalCoreScripts.slice(0, 1).map((s: any) => s.src)
        });
        
        signals.push({
            signal: '/modules/ directory (Drupal)',
            confidence: 'high' as const,
            match: drupalModulesScripts.length > 0,
            cms: 'Drupal',
            examples: drupalModulesScripts.slice(0, 2).map((s: any) => s.src)
        });
        
        // Drupal settings JSON pattern (very reliable Drupal indicator)
        const hasDrupalSettingsJson = 
            scripts.some((s: any) => s.content && s.content.includes('data-drupal-selector="drupal-settings-json"')) ||
            (data.htmlContent && data.htmlContent.includes('data-drupal-selector="drupal-settings-json"'));
        
        signals.push({
            signal: 'drupal-settings-json script tag (Drupal)',
            confidence: 'high' as const,
            match: hasDrupalSettingsJson,
            cms: 'Drupal',
            examples: hasDrupalSettingsJson ? ['data-drupal-selector="drupal-settings-json"'] : []
        });
        
        // Drupal messages fallback pattern (Drupal 8.7+ indicator)
        const hasDrupalMessagesFallback = data.htmlContent && 
            data.htmlContent.includes('data-drupal-messages-fallback');
        
        signals.push({
            signal: 'data-drupal-messages-fallback div (Drupal 8.7+)',
            confidence: 'high' as const,
            match: hasDrupalMessagesFallback,
            cms: 'Drupal',
            examples: hasDrupalMessagesFallback ? ['data-drupal-messages-fallback'] : []
        });
        
        // Drupal settings extend pattern (Drupal 7 indicator)
        const hasDrupalSettingsExtend = 
            scripts.some((s: any) => s.content && s.content.includes('jQuery.extend(Drupal.settings')) ||
            (data.htmlContent && data.htmlContent.includes('jQuery.extend(Drupal.settings'));
        
        signals.push({
            signal: 'jQuery.extend(Drupal.settings (Drupal 7)',
            confidence: 'high' as const,
            match: hasDrupalSettingsExtend,
            cms: 'Drupal',
            examples: hasDrupalSettingsExtend ? ['jQuery.extend(Drupal.settings'] : []
        });
        
        // Drupal JavaScript namespace and HTML attribute patterns
        const drupalJsPatterns = ['Drupal.behaviors', 'Drupal.toolbar', 'typeof Drupal', 'if (Drupal', 'window.Drupal', 'Drupal &&', 'init_drupal_core_settings', 'jQuery.holdReady', 'window.Drupal){', 'Drupal.settings,'];
        const drupalHtmlPatterns = ['data-drupal-link-system-path', 'data-drupal-link-query', 'data-off-canvas', 'data-responsive-menu'];
        
        const foundDrupalJs = drupalJsPatterns.filter(pattern =>
            scripts.some((s: any) => s.content && s.content.includes(pattern)) ||
            (data.htmlContent && data.htmlContent.includes(pattern))
        );
        
        const foundDrupalHtml = drupalHtmlPatterns.filter(pattern =>
            data.htmlContent && data.htmlContent.includes(pattern)
        );
        
        const allFoundPatterns = [...foundDrupalJs, ...foundDrupalHtml];
        
        signals.push({
            signal: 'Drupal JavaScript/HTML patterns',
            confidence: 'high' as const,
            match: allFoundPatterns.length > 0,
            cms: 'Drupal',
            examples: allFoundPatterns.slice(0, 3)
        });
        
        // Joomla script patterns - only count same-domain scripts
        const joomlaJuiScripts = scripts.filter((s: any) => 
            s.src && s.src.toLowerCase().includes('/media/jui/js/') && isSameDomainScript(s.src, targetUrl));
        const joomlaMediaScripts = scripts.filter((s: any) => 
            s.src && s.src.toLowerCase().includes('/media/') && isSameDomainScript(s.src, targetUrl));
        const joomlaComponentScripts = scripts.filter((s: any) => 
            s.src && s.src.toLowerCase().includes('/components/') && isSameDomainScript(s.src, targetUrl));
        
        signals.push({
            signal: '/media/jui/js/ scripts (Joomla UI library)',
            confidence: 'high' as const,
            match: joomlaJuiScripts.length > 0,
            cms: 'Joomla',
            examples: joomlaJuiScripts.slice(0, 2).map((s: any) => s.src)
        });
        
        signals.push({
            signal: '/media/ scripts (Joomla)',
            confidence: 'medium' as const,
            match: joomlaMediaScripts.length > 0,
            cms: 'Joomla',
            examples: joomlaMediaScripts.slice(0, 2).map((s: any) => s.src)
        });
        
        signals.push({
            signal: '/components/ scripts (Joomla)',
            confidence: 'medium' as const,
            match: joomlaComponentScripts.length > 0,
            cms: 'Joomla',
            examples: joomlaComponentScripts.slice(0, 1).map((s: any) => s.src)
        });
        
        // Common libraries - only count same-domain to avoid false positives from CDNs
        const jqueryScripts = scripts.filter((s: any) => 
            s.src && s.src.toLowerCase().includes('jquery') && isSameDomainScript(s.src, targetUrl));
        const bootstrapScripts = scripts.filter((s: any) => 
            s.src && s.src.toLowerCase().includes('bootstrap') && isSameDomainScript(s.src, targetUrl));
        
        // Only show jQuery if it's not already covered by more specific WordPress patterns
        const hasWordPressPatterns = wpContentScripts.length > 0 || wpIncludesScripts.length > 0;
        if (!hasWordPressPatterns && jqueryScripts.length > 0) {
            signals.push({
                signal: 'jQuery library (same-domain)',
                confidence: 'low' as const,
                match: true,
                examples: jqueryScripts.slice(0, 1).map((s: any) => s.src)
            });
        }
        
        signals.push({
            signal: 'Bootstrap framework (same-domain)',
            confidence: 'low' as const,
            match: bootstrapScripts.length > 0,
            examples: bootstrapScripts.slice(0, 1).map((s: any) => s.src)
        });
        
        return signals;
    }
    
    export function analyzeHtmlSignals(data: any): Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, details?: string}> {
        const signals: Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, details?: string}> = [];
        const html = (data.htmlContent || '').toLowerCase();
        const targetUrl = data.finalUrl || data.url || '';
        
        // WordPress HTML patterns - only count same-domain references
        const wpContentMatch = hasSameDomainHtmlPattern(data.htmlContent, 'wp-content', targetUrl);
        const wpContentCount = wpContentMatch ? countSameDomainHtmlPatterns(data.htmlContent, 'wp-content', targetUrl) : 0;
        const wpJsonMatch = hasSameDomainHtmlPattern(data.htmlContent, 'wp-json', targetUrl);
        const wpJsonCount = wpJsonMatch ? countSameDomainHtmlPatterns(data.htmlContent, 'wp-json', targetUrl) : 0;
        const wpBlockCount = (html.match(/wp-block-/g) || []).length;
        
        signals.push({
            signal: 'wp-content references (WordPress)',
            confidence: 'high' as const,
            match: wpContentCount > 0,
            cms: 'WordPress',
            details: wpContentCount > 0 ? `${wpContentCount} instances` : undefined
        });
        
        signals.push({
            signal: 'wp-json API endpoints (WordPress)',
            confidence: 'high' as const,
            match: wpJsonCount > 0,
            cms: 'WordPress',
            details: wpJsonCount > 0 ? `${wpJsonCount} references` : undefined
        });
        
        signals.push({
            signal: 'Gutenberg blocks (WordPress 5.0+)',
            confidence: 'medium' as const,
            match: wpBlockCount > 0,
            cms: 'WordPress',
            details: wpBlockCount > 0 ? `${wpBlockCount} blocks` : undefined
        });
        
        // Drupal HTML patterns
        const drupalSettingsMatch = html.includes('drupal.settings');
        const drupalJsMatch = html.includes('drupal.js');
        
        signals.push({
            signal: 'drupal.settings object (Drupal)',
            confidence: 'high' as const,
            match: drupalSettingsMatch,
            cms: 'Drupal'
        });
        
        signals.push({
            signal: 'drupal.js references (Drupal)',
            confidence: 'medium' as const,
            match: drupalJsMatch,
            cms: 'Drupal'
        });
        
        // Joomla HTML patterns
        const joomlaSystemMessage = html.includes('system-message');
        const joomlaContent = html.includes('com_content');
        const joomlaScriptOptions = html.includes('joomla-script-options new');
        
        signals.push({
            signal: 'joomla-script-options new (100% Joomla)',
            confidence: 'high' as const,
            match: joomlaScriptOptions,
            cms: 'Joomla'
        });
        
        signals.push({
            signal: 'system-message class (Joomla)',
            confidence: 'medium' as const,
            match: joomlaSystemMessage,
            cms: 'Joomla'
        });
        
        signals.push({
            signal: 'com_content component (Joomla)',
            confidence: 'medium' as const,
            match: joomlaContent,
            cms: 'Joomla'
        });
        
        return signals;
    }
    
    export function analyzeMetaSignals(data: any): Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, content?: string}> {
        const signals: Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, content?: string}> = [];
        const metaTags = data.metaTags || [];
        
        // Generator meta tag
        const generator = metaTags.find((tag: any) => tag.name && tag.name.toLowerCase() === 'generator');
        const generatorContent = generator?.content || '';
        
        signals.push({
            signal: 'WordPress generator tag',
            confidence: 'high' as const,
            match: generatorContent.toLowerCase().includes('wordpress'),
            cms: 'WordPress',
            content: generatorContent.toLowerCase().includes('wordpress') ? generatorContent : undefined
        });
        
        signals.push({
            signal: 'Drupal generator tag',
            confidence: 'high' as const,
            match: generatorContent.toLowerCase().includes('drupal'),
            cms: 'Drupal',
            content: generatorContent.toLowerCase().includes('drupal') ? generatorContent : undefined
        });
        
        signals.push({
            signal: 'Joomla generator tag',
            confidence: 'high' as const,
            match: generatorContent.toLowerCase().includes('joomla'),
            cms: 'Joomla',
            content: generatorContent.toLowerCase().includes('joomla') ? generatorContent : undefined
        });
        
        return signals;
    }
    
    export function analyzeHeaderSignals(data: any): Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, value?: string}> {
        const signals: Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, value?: string}> = [];
        const mainHeaders = data.httpHeaders || {};
        const robotsHeaders = data.robotsTxt?.httpHeaders || {};
        
        // Analyze headers from both sources
        const analyzeHeaderSource = (headers: Record<string, string>, source: 'main' | 'robots') => {
            const sourceLabel = source === 'robots' ? ' (robots.txt)' : '';
            
            // WordPress headers
            const xPingback = headers['x-pingback'] || headers['X-Pingback'];
            const linkHeader = headers['link'] || headers['Link'];
            const wpJsonInLink = linkHeader && linkHeader.toLowerCase().includes('wp-json');
            
            if (xPingback) {
                signals.push({
                    signal: `X-Pingback header (WordPress)${sourceLabel}`,
                    confidence: 'high' as const,
                    match: true,
                    cms: 'WordPress',
                    value: xPingback
                });
            }
            
            if (wpJsonInLink) {
                signals.push({
                    signal: `wp-json in Link header (WordPress)${sourceLabel}`,
                    confidence: 'high' as const,
                    match: true,
                    cms: 'WordPress',
                    value: linkHeader
                });
            }
            
            // Drupal headers
            const xDrupalCache = headers['x-drupal-cache'] || headers['X-Drupal-Cache'];
            const xDrupalDynamicCache = headers['x-drupal-dynamic-cache'] || headers['X-Drupal-Dynamic-Cache'];
            
            if (xDrupalCache) {
                signals.push({
                    signal: `X-Drupal-Cache header (Drupal)${sourceLabel}`,
                    confidence: 'high' as const,
                    match: true,
                    cms: 'Drupal',
                    value: xDrupalCache
                });
            }
            
            if (xDrupalDynamicCache) {
                signals.push({
                    signal: `X-Drupal-Dynamic-Cache (Drupal 8+)${sourceLabel}`,
                    confidence: 'high' as const,
                    match: true,
                    cms: 'Drupal',
                    value: xDrupalDynamicCache
                });
            }
            
            // General headers with CMS info
            const xGenerator = headers['x-generator'] || headers['X-Generator'];
            const xContentEncodedBy = headers['x-content-encoded-by'] || headers['X-Content-Encoded-By'];
            
            if (xGenerator) {
                signals.push({
                    signal: `X-Generator header${sourceLabel}`,
                    confidence: 'high' as const,
                    match: true,
                    value: xGenerator
                });
            }
            
            if (xContentEncodedBy) {
                signals.push({
                    signal: `X-Content-Encoded-By header${sourceLabel}`,
                    confidence: 'high' as const,
                    match: true,
                    value: xContentEncodedBy
                });
            }
            
            // Enhanced cookie analysis for all CMS types
            const cookiePatterns = analyzeCookiePatterns(headers);
            cookiePatterns.forEach(pattern => {
                if (pattern.match) {
                    signals.push({
                        ...pattern,
                        signal: pattern.signal + sourceLabel
                    });
                }
            });
            
            // X-Pingback alternatives for other CMSs
            const pingbackAlternatives = analyzePingbackAlternatives(headers);
            pingbackAlternatives.forEach(alt => {
                if (alt.match) {
                    signals.push({
                        ...alt,
                        signal: alt.signal + sourceLabel
                    });
                }
            });
        };
        
        // Analyze both main page and robots.txt headers
        analyzeHeaderSource(mainHeaders, 'main');
        analyzeHeaderSource(robotsHeaders, 'robots');
        
        return signals;
    }
    
    export function analyzeCookiePatterns(headers: any): Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, value?: string}> {
        const cookieSignals: Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, value?: string}> = [];
        
        // Look for Set-Cookie headers
        const setCookieHeaders = Object.keys(headers).filter(key => 
            key.toLowerCase().includes('set-cookie') || key.toLowerCase() === 'cookie'
        );
        
        setCookieHeaders.forEach(headerName => {
            const cookieValue = headers[headerName];
            if (typeof cookieValue === 'string') {
                const lowerValue = cookieValue.toLowerCase();
                
                // WordPress cookie patterns
                if (lowerValue.includes('wordpress') || lowerValue.includes('wp-')) {
                    cookieSignals.push({
                        signal: 'WordPress cookies',
                        confidence: 'medium' as const,
                        match: true,
                        cms: 'WordPress',
                        value: cookieValue
                    });
                }
                
                // Drupal cookie patterns
                if (lowerValue.includes('drupal') || lowerValue.includes('sess') && lowerValue.includes('drupal')) {
                    cookieSignals.push({
                        signal: 'Drupal session cookies',
                        confidence: 'medium' as const,
                        match: true,
                        cms: 'Drupal',
                        value: cookieValue
                    });
                }
                
                // Joomla cookie patterns
                if (lowerValue.includes('joomla') || lowerValue.includes('joomla_session')) {
                    cookieSignals.push({
                        signal: 'Joomla session cookies',
                        confidence: 'medium' as const,
                        match: true,
                        cms: 'Joomla',
                        value: cookieValue
                    });
                }
                
                // Generic CMS session patterns
                if (lowerValue.includes('phpsessid') || lowerValue.includes('sessionid')) {
                    cookieSignals.push({
                        signal: 'PHP session cookies',
                        confidence: 'low' as const,
                        match: true,
                        value: cookieValue
                    });
                }
            }
        });
        
        return cookieSignals;
    }
    
    export function analyzePingbackAlternatives(headers: any): Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, value?: string}> {
        const pingbackSignals: Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, value?: string}> = [];
        
        // Look for various pingback/trackback alternatives
        const pingbackHeaders = [
            'x-trackback',
            'x-webmention',
            'x-xmlrpc',
            'x-rpc-endpoint',
            'x-api-endpoint'
        ];
        
        pingbackHeaders.forEach(headerName => {
            const headerValue = headers[headerName] || headers[headerName.replace('x-', 'X-')];
            if (headerValue) {
                const lowerValue = headerValue.toLowerCase();
                
                // WordPress-like patterns
                if (lowerValue.includes('xmlrpc') || lowerValue.includes('wp-')) {
                    pingbackSignals.push({
                        signal: `${headerName} endpoint (WordPress-like)`,
                        confidence: 'medium' as const,
                        match: true,
                        cms: 'WordPress',
                        value: headerValue
                    });
                }
                
                // Drupal-like patterns
                if (lowerValue.includes('services') || lowerValue.includes('rest')) {
                    pingbackSignals.push({
                        signal: `${headerName} endpoint (Drupal-like)`,
                        confidence: 'medium' as const,
                        match: true,
                        cms: 'Drupal',
                        value: headerValue
                    });
                }
                
                // Generic API endpoints
                if (lowerValue.includes('api') || lowerValue.includes('rpc')) {
                    pingbackSignals.push({
                        signal: `${headerName} API endpoint`,
                        confidence: 'low' as const,
                        match: true,
                        value: headerValue
                    });
                }
            }
        });
        
        return pingbackSignals;
    }
    
    export function analyzeStylesheetSignals(data: any): Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, examples?: string[]}> {
        const signals: Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, examples?: string[]}> = [];
        const stylesheets = data.stylesheets || [];
        
        // WordPress stylesheet patterns
        const wpThemes = stylesheets.filter((s: any) => s.href && s.href.toLowerCase().includes('/wp-content/themes/'));
        const wpPlugins = stylesheets.filter((s: any) => s.href && s.href.toLowerCase().includes('/wp-content/plugins/'));
        
        signals.push({
            signal: '/wp-content/themes/ (WordPress)',
            confidence: 'high' as const,
            match: wpThemes.length > 0,
            cms: 'WordPress',
            examples: wpThemes.slice(0, 2).map((s: any) => s.href)
        });
        
        signals.push({
            signal: '/wp-content/plugins/ (WordPress)',
            confidence: 'high' as const,
            match: wpPlugins.length > 0,
            cms: 'WordPress',
            examples: wpPlugins.slice(0, 1).map((s: any) => s.href)
        });
        
        // Drupal stylesheet patterns
        const drupalThemes = stylesheets.filter((s: any) => s.href && s.href.toLowerCase().includes('/themes/'));
        const drupalModules = stylesheets.filter((s: any) => s.href && s.href.toLowerCase().includes('/modules/'));
        
        signals.push({
            signal: '/themes/ directory (Drupal)',
            confidence: 'medium' as const,
            match: drupalThemes.length > 0,
            cms: 'Drupal',
            examples: drupalThemes.slice(0, 1).map((s: any) => s.href)
        });
        
        signals.push({
            signal: '/modules/ directory (Drupal)',
            confidence: 'medium' as const,
            match: drupalModules.length > 0,
            cms: 'Drupal',
            examples: drupalModules.slice(0, 1).map((s: any) => s.href)
        });
        
        // Joomla stylesheet patterns
        const joomlaTemplates = stylesheets.filter((s: any) => s.href && s.href.toLowerCase().includes('/templates/'));
        const joomlaMedia = stylesheets.filter((s: any) => s.href && s.href.toLowerCase().includes('/media/'));
        
        signals.push({
            signal: '/templates/ directory (Joomla)',
            confidence: 'high' as const,
            match: joomlaTemplates.length > 0,
            cms: 'Joomla',
            examples: joomlaTemplates.slice(0, 2).map((s: any) => s.href)
        });
        
        signals.push({
            signal: '/media/ stylesheets (Joomla)',
            confidence: 'medium' as const,
            match: joomlaMedia.length > 0,
            cms: 'Joomla',
            examples: joomlaMedia.slice(0, 1).map((s: any) => s.href)
        });
        
        return signals;
    }
    
    export function analyzeVersionSignals(data: any): Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, version?: string, hint?: string}> {
        const signals: Array<{signal: string, confidence: 'high'|'medium'|'low', match: boolean, cms?: string, version?: string, hint?: string}> = [];
        const versionInfo = extractVersionInfo(data);
        const hints = getVersionHints(data);
        
        // Add detected versions
        versionInfo.forEach(info => {
            signals.push({
                signal: `${info.cms} version detected`,
                confidence: info.confidence as 'high'|'medium'|'low',
                match: true,
                cms: info.cms.toLowerCase(),
                version: info.version
            });
        });
        
        // Add version hints
        hints.forEach(hint => {
            signals.push({
                signal: 'Version hint',
                confidence: 'low' as const,
                match: true,
                hint: hint
            });
        });
        
        return signals;
    }
    
