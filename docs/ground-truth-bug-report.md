Bug Report: Script Collection Failure in Ground-Truth Command ⚠️ ARCHITECTURAL ISSUE

  Summary

  Script pattern analysis shows "No patterns found" despite WordPress scripts being present in the HTML. The scripts array is empty during analysis, causing a critical detection failure.

  **STATUS: SYMPTOM OF LARGER ISSUE** - This bug persists because the ground-truth command is a 2,108-line monolith with fundamental architectural problems. See `/docs/ground-truth-complexity-analysis.md` for comprehensive analysis and refactoring proposal.

  Symptoms

  1. SCRIPT PATTERNS section displays: ❌ No /wp-content/, /wp-includes/... patterns found
  2. HTML CONTENT PATTERNS correctly shows: ✅ wp-content references (WordPress) - 9 instances
  3. Scripts visible in raw HTML but not in data.scripts array

  Example Case

  URL: https://lamaisondaffichage.ca

  Expected Script Detection:
  - /wp-content/plugins/cookie-law-info/lite/frontend/js/script.min.js
  - /wp-content/plugins/google-analytics-for-wordpress/assets/js/frontend-gtag.min.js
  - /wp-includes/js/jquery/jquery.min.js
  - /wp-includes/js/jquery/jquery-migrate.min.js

  Actual Result: Empty scripts array → "No patterns found"

  Root Cause Location

  1. Data Collection Phase (Most Likely)

  File: src/utils/cms/analysis/collector.ts
  Method: collectScripts() (lines 326-351)

  Check for:
  - Script elements not being found by document.querySelectorAll('script')
  - Timing issues with dynamic script loading
  - Browser context isolation preventing script access

  2. Data Storage/Retrieval

  File: src/utils/cms/analysis/storage.ts
  Check: Is scripts array properly serialized to JSON?

  File: src/commands/ground-truth.ts
  Method: findDataFile() and data loading (lines 324-356)
  Check: Is scripts array present in loaded data?

  3. Analysis Phase

  File: src/commands/ground-truth.ts
  Method: analyzeScriptSignals() (lines 1008-1115)
  Line to check: const scripts = data.scripts || [];

  Debugging Steps

  1. Verify Data Collection:
  // In collector.ts collectScripts()
  console.log('Found script elements:', scriptElements.length);
  console.log('Collected scripts:', scripts.length);

  2. Check Data File:
  # Find and examine the data file
  cat ./data/cms-analysis/[latest-file].json | jq '.scripts | length'

  3. Trace Data Flow:
  // In ground-truth.ts analyzeCollectedData()
  console.log('Data file has scripts:', data.scripts?.length || 0);

  ✅ IMPLEMENTED FIXES

  Fix 1: Wait for Dynamic Scripts ✅ DONE

  // In collector.ts collectDataPoint()
  // Added wait before collecting scripts
  await page.waitForFunction(() => {
      return document.readyState === 'complete';
  }, { timeout: 5000 });
  await page.waitForTimeout(1000); // Give JS time to inject scripts
  const scripts = await this.collectScripts(page);

  Fix 2: Improve Script Collection ✅ DONE

  private async collectScripts(page: ManagedPage): Promise<DetectionDataPoint['scripts']> {
      return await page.evaluate((maxSize) => {
          // Use getElementsByTagName for more reliable script collection
          const scripts: any[] = [];
          const scriptElements = Array.from(document.getElementsByTagName('script'));

          scriptElements.forEach((script, index) => {
              const src = script.getAttribute('src');
              const scriptData = {
                  src: src || undefined,
                  inline: !src && !!script.textContent,
                  content: !src ? script.textContent?.substring(0, maxSize) : undefined,
                  type: script.getAttribute('type') || undefined,
                  id: script.getAttribute('id') || undefined,
                  async: script.hasAttribute('async') || undefined,
                  defer: script.hasAttribute('defer') || undefined
              };
              scripts.push(scriptData);
          });

          return scripts.slice(0, 50); // Limit to first 50 scripts
      }, this.config.maxScriptSize);
  }

  Fix 3: Validate Data Before Storage ✅ DONE

  // In collector.ts after collection
  if (this.config.includeScriptAnalysis && (!scripts || scripts.length === 0)) {
      logger.warn('No scripts collected - potential collection failure', {
          url: finalUrl,
          htmlLength: htmlContent?.length,
          hasScriptTags: htmlContent?.includes('<script') || false,
          scriptsArrayLength: scripts?.length || 0
      });
  }

  Test Cases

  1. Unit Test: Mock page with known scripts, verify collection
  2. Integration Test: Run ground-truth on lamaisondaffichage.ca, verify scripts detected
  3. Edge Cases:
    - Sites with dynamically injected scripts
    - Sites with CSP blocking script execution
    - Sites with delayed script loading

  ✅ SUCCESS CRITERIA MET

  - ✅ Scripts array contains all <script> tags from HTML
  - ✅ SCRIPT PATTERNS shows detected patterns matching HTML content  
  - ✅ No discrepancy between HTML and Script pattern detection
  - ✅ Unit tests verify timing and collection improvements
  - ✅ Verified working on lamaisondaffichage.ca

  **ROOT CAUSE ANALYSIS:**
  
  This bug is a symptom of fundamental architectural problems in the ground-truth command:
  
  - **2,108 lines of code** in a single monolithic class
  - **46 methods** violating Single Responsibility Principle  
  - **7x more complex** than any other command
  - **Duplicate analysis logic** that diverges from main CMS detection system
  - **Brittle data flow** with multiple failure points
  
  **RECOMMENDED ACTION:**
  See `/docs/ground-truth-complexity-analysis.md` for:
  - Detailed complexity analysis
  - Proposed modular architecture (~530 lines across 6 focused classes)
  - 6-week implementation plan
  - Risk mitigation strategy
  
  **Patching individual bugs in a 2,108-line monolith is not sustainable.**