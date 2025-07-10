// Debug script to test what's happening with script signal analysis

function isSameDomainScript(scriptUrl, targetUrl) {
    try {
        if (!scriptUrl.startsWith('http')) {
            return true;
        }
        const scriptDomain = new URL(scriptUrl).hostname.toLowerCase();
        const targetDomain = new URL(targetUrl).hostname.toLowerCase();
        return scriptDomain === targetDomain;
    } catch {
        return false;
    }
}

function analyzeScriptSignalsDebug(data) {
    const scripts = data.scripts || [];
    const targetUrl = data.url || '';
    
    console.log('=== SCRIPT ANALYSIS DEBUG ===');
    console.log('Target URL:', targetUrl);
    console.log('Scripts array length:', scripts.length);
    console.log('Scripts array:', JSON.stringify(scripts, null, 2));
    
    if (scripts.length === 0) {
        console.log('❌ NO SCRIPTS FOUND - this is the problem!');
        return;
    }
    
    // WordPress script patterns - only count same-domain scripts
    console.log('\n--- Checking wp-content scripts ---');
    const wpContentScripts = scripts.filter((s) => {
        const hasSrc = !!s.src;
        const hasWpContent = s.src && s.src.toLowerCase().includes('/wp-content/');
        const isSameDomain = s.src && isSameDomainScript(s.src, targetUrl);
        
        console.log(`Script: ${s.src}`);
        console.log(`  Has src: ${hasSrc}`);
        console.log(`  Has wp-content: ${hasWpContent}`);
        console.log(`  Is same domain: ${isSameDomain}`);
        console.log(`  Passes filter: ${hasSrc && hasWpContent && isSameDomain}`);
        console.log('---');
        
        return s.src && s.src.toLowerCase().includes('/wp-content/') && isSameDomainScript(s.src, targetUrl);
    });
    
    console.log('\n--- Checking wp-includes scripts ---');
    const wpIncludesScripts = scripts.filter((s) => {
        const hasSrc = !!s.src;
        const hasWpIncludes = s.src && s.src.toLowerCase().includes('/wp-includes/');
        const isSameDomain = s.src && isSameDomainScript(s.src, targetUrl);
        
        console.log(`Script: ${s.src}`);
        console.log(`  Has src: ${hasSrc}`);
        console.log(`  Has wp-includes: ${hasWpIncludes}`);
        console.log(`  Is same domain: ${isSameDomain}`);
        console.log(`  Passes filter: ${hasSrc && hasWpIncludes && isSameDomain}`);
        console.log('---');
        
        return s.src && s.src.toLowerCase().includes('/wp-includes/') && isSameDomainScript(s.src, targetUrl);
    });
    
    console.log('\n=== RESULTS ===');
    console.log('wp-content scripts found:', wpContentScripts.length);
    console.log('wp-includes scripts found:', wpIncludesScripts.length);
    console.log('wp-content examples:', wpContentScripts.map(s => s.src));
    console.log('wp-includes examples:', wpIncludesScripts.map(s => s.src));
}

// Test with the expected script data from lamaisondaffichage.ca
const testData = {
    url: 'https://lamaisondaffichage.ca',
    scripts: [
        { src: 'https://lamaisondaffichage.ca/wp-content/plugins/cookie-law-info/lite/frontend/js/script.min.js?ver=3.3.1', type: 'text/javascript' },
        { src: 'https://lamaisondaffichage.ca/wp-content/plugins/google-analytics-for-wordpress/assets/js/frontend-gtag.min.js?ver=9.6.1', type: 'text/javascript' },
        { src: 'https://lamaisondaffichage.ca/wp-includes/js/jquery/jquery.min.js?ver=3.7.1', type: 'text/javascript' },
        { src: 'https://lamaisondaffichage.ca/wp-includes/js/jquery/jquery-migrate.min.js?ver=3.4.1', type: 'text/javascript' }
    ]
};

console.log('Testing with expected lamaisondaffichage.ca data:');
analyzeScriptSignalsDebug(testData);

// Test with empty scripts array to see the difference
console.log('\n\n=== Testing with empty scripts array ===');
const emptyData = {
    url: 'https://lamaisondaffichage.ca',
    scripts: []
};
analyzeScriptSignalsDebug(emptyData);