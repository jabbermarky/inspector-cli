// Manual verification of platform specificity calculations
// This script validates the mathematical formulas used in bias detection

console.log('=== Platform Specificity Calculation Verification ===\n');

function calculatePlatformSpecificity(frequencies) {
  const mean = frequencies.reduce((a, b) => a + b) / frequencies.length;
  const variance = frequencies.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) / frequencies.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / mean;
  const platformSpecificity = Math.min(1, coefficientOfVariation);
  
  return {
    mean: mean.toFixed(3),
    variance: variance.toFixed(6),
    stdDev: stdDev.toFixed(3),
    coefficientOfVariation: coefficientOfVariation.toFixed(3),
    platformSpecificity: platformSpecificity.toFixed(3)
  };
}

// Test case 1: set-cookie (3 platforms only - current test)
console.log('1. SET-COOKIE (Current test - 3 platforms):');
const setCookie3 = [0.88, 0.40, 0.43]; // Joomla, WordPress, Drupal
const result1 = calculatePlatformSpecificity(setCookie3);
console.log(`   Frequencies: [${setCookie3.join(', ')}]`);
console.log(`   Mean: ${result1.mean}`);
console.log(`   StdDev: ${result1.stdDev}`);
console.log(`   CoV: ${result1.coefficientOfVariation}`);
console.log(`   Platform Specificity: ${result1.platformSpecificity}`);
console.log(`   TEST CLAIMS: 0.75 (WRONG!)`);
console.log(`   ACTUAL: ${result1.platformSpecificity}`);
console.log('');

// Test case 2: set-cookie (6 platforms - realistic)
console.log('2. SET-COOKIE (Realistic - 6 platforms):');
const setCookie6 = [0.88, 0.40, 0.43, 0.30, 0.35, 0.25]; // + Duda, Shopify, Unknown
const result2 = calculatePlatformSpecificity(setCookie6);
console.log(`   Frequencies: [${setCookie6.join(', ')}]`);
console.log(`   Platform Specificity: ${result2.platformSpecificity}`);
console.log('');

// Test case 3: x-pingback (WordPress-specific)
console.log('3. X-PINGBACK (WordPress-specific):');
const xPingback = [0.00, 0.90, 0.00, 0.00, 0.00, 0.00]; // Only WordPress
const result3 = calculatePlatformSpecificity(xPingback);
console.log(`   Frequencies: [${xPingback.join(', ')}]`);
console.log(`   Platform Specificity: ${result3.platformSpecificity}`);
console.log(`   TEST CLAIMS: 0.95`);
console.log(`   ACTUAL: ${result3.platformSpecificity} (should be high)`);
console.log('');

// Test case 4: content-type (Universal)
console.log('4. CONTENT-TYPE (Universal):');
const contentType = [0.97, 0.97, 1.00, 0.98, 0.99, 0.96]; // Very similar across all
const result4 = calculatePlatformSpecificity(contentType);
console.log(`   Frequencies: [${contentType.join(', ')}]`);
console.log(`   Platform Specificity: ${result4.platformSpecificity}`);
console.log(`   TEST CLAIMS: 0.15`);
console.log(`   ACTUAL: ${result4.platformSpecificity} (should be low)`);
console.log('');

console.log('=== SUMMARY ===');
console.log('✅ Universal headers (content-type): Low specificity (~0.01-0.02)');
console.log('❌ set-cookie test: Claims 0.75, actual ~0.38 (MAJOR ERROR)');
console.log('✅ Platform-specific (x-pingback): High specificity (>0.9)');
console.log('');
console.log('🚨 CONCLUSION: 12+ hardcoded values in tests are MATHEMATICALLY INCORRECT');