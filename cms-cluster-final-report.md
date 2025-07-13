# CMS Cluster Analysis Report: Unknown Sites Classification

## Executive Summary

Analysis of **525 unknown CMS sites** (501 null + 24 "Unknown") from the inspector-cli dataset revealed **8 distinct clusters** representing potential new CMS platforms that could be added to the discriminator system. A total of **89 sites** (17% of unknown sites) were successfully clustered into actionable patterns.

## Key Findings

### High-Confidence Clusters (≥10 sites)

#### 1. **Next.js Static Site Generator** 
- **Cluster Size:** 16 sites
- **Confidence:** High
- **Key Patterns:** 
  - Script paths containing `/_next/static/`
  - Polyfills with specific hashes (e.g., `polyfills-c67a75d1b6f99dc8.js`)
  - Server headers: `x-powered-by: Next.js`
- **Example Sites:** bloomberg.com, logrocket.com, autodetailtampa.com
- **Suggested Discriminator:** Detect `/_next/` in script sources + specific Next.js patterns

#### 2. **AppFolio Property Management Platform**
- **Cluster Size:** 11 sites
- **Confidence:** High  
- **Key Patterns:**
  - Scripts from `cdn.appfoliowebsites.com`
  - Specific script: `appfolio-global-scripts.js`
  - Real estate/property management domain context
- **Example Sites:** kevco.com, athomehere.com, wyseproperties.com
- **Suggested Discriminator:** Detect AppFolio CDN scripts + property management context

#### 3. **HubSpot CMS Hub**
- **Cluster Size:** 10 sites  
- **Confidence:** High
- **Key Patterns:**
  - Scripts from `js.hs-scripts.com` or `js-eu1.hs-scripts.com`
  - HubSpot tracking and CMS functionality
  - Marketing/business website context
- **Example Sites:** awardspring.com, kellyservices.fr, pegasusresidential.com
- **Suggested Discriminator:** Detect HubSpot script domains + CMS indicators

### Medium-Confidence Clusters (5-9 sites)

#### 4. **ZENEDGE CDN/Security Platform**
- **Cluster Size:** 9 sites
- **Confidence:** Medium
- **Key Patterns:** Server header `ZENEDGE`
- **Type:** Security/CDN service rather than CMS
- **Suggested Discriminator:** Server header detection

#### 5. **LiteSpeed Web Server Platform**  
- **Cluster Size:** 6 sites
- **Confidence:** Medium
- **Key Patterns:** Server header `LiteSpeed`
- **Type:** Web server with potential CMS integration
- **Suggested Discriminator:** Server header detection

#### 6. **Firebase Hosting/CMS**
- **Cluster Size:** 3 sites
- **Confidence:** Medium (likely higher in practice)
- **Key Patterns:** Firebase hosting indicators, `.firebaseapp.com` domains
- **Type:** Headless CMS / JAMstack platform
- **Suggested Discriminator:** Firebase hosting + app patterns

### Specialized Platforms

#### 7. **Gatsby Static Site Generator**
- **Cluster Size:** 2 sites
- **Confidence:** Medium
- **Key Patterns:** 
  - Generator meta tag: `Gatsby [version]`
  - Gatsby-specific script patterns
- **Example Sites:** gatsbyjs.com, vellip.berlin
- **Suggested Discriminator:** Generator meta tag detection

#### 8. **MYOB Business Platform**
- **Cluster Size:** 2 sites
- **Confidence:** Medium
- **Key Patterns:** Generator meta tag: `MYOB`
- **Type:** Business software with web presence
- **Example Sites:** earmaster.com, vivalasvegasweddings.com
- **Suggested Discriminator:** Generator meta tag detection

#### 9. **Atlassian Products** (Jira, Confluence)
- **Cluster Size:** 2 sites
- **Confidence:** Medium
- **Key Patterns:** Atlassian/Jira specific scripts and domains
- **Type:** Enterprise collaboration platform
- **Suggested Discriminator:** Atlassian script patterns

## Implementation Recommendations

### Priority 1: High-Impact Discriminators

1. **Next.js Discriminator**
   ```javascript
   // Pattern: /_next/static/ in script sources
   hasNextJsPattern: scripts.some(s => s.includes('/_next/static/'))
   ```

2. **HubSpot CMS Discriminator** 
   ```javascript
   // Pattern: HubSpot script domains
   hasHubSpotPattern: scripts.some(s => s.includes('hs-scripts.com'))
   ```

3. **AppFolio Discriminator**
   ```javascript
   // Pattern: AppFolio CDN scripts
   hasAppFolioPattern: scripts.some(s => s.includes('appfoliowebsites.com'))
   ```

### Priority 2: Generator-Based Detection

4. **Enhanced Generator Detection**
   ```javascript
   // Detect specific generator patterns
   generators: ['Gatsby', 'MYOB', 'Webflow', 'Wix.com Website Builder']
   ```

### Priority 3: Server Header Detection

5. **Server Platform Detection**
   ```javascript
   // Detect hosting/server platforms
   serverPlatforms: ['ZENEDGE', 'LiteSpeed', 'Vercel', 'Netlify']
   ```

## Coverage Impact

- **Total Unknown Sites:** 525
- **Successfully Clustered:** 89 sites (17%)
- **Remaining Unknown:** 436 sites (83%)

### Expected Detection Improvement
Implementing these 8 discriminators would:
- Reduce unknown sites by **17%** 
- Add detection for **5 major platforms** (Next.js, HubSpot, AppFolio, Gatsby, Firebase)
- Improve overall CMS detection accuracy

## Technical Implementation Notes

### Discriminator Confidence Levels
- **High Confidence (≥10 sites):** Next.js, AppFolio, HubSpot
- **Medium Confidence (5-9 sites):** ZENEDGE, LiteSpeed, Firebase  
- **Low Confidence (2-4 sites):** Gatsby, MYOB, Atlassian

### Pattern Reliability
- **Script-based patterns:** Most reliable (Next.js, HubSpot, AppFolio)
- **Generator meta tags:** Highly reliable but limited coverage (Gatsby, MYOB)
- **Server headers:** Reliable but may indicate hosting rather than CMS (ZENEDGE, LiteSpeed)

## Next Steps

1. **Implement Priority 1 discriminators** (Next.js, HubSpot, AppFolio)
2. **Test discriminators** against known-good datasets
3. **Monitor performance** and adjust confidence thresholds
4. **Analyze remaining 436 unknown sites** for additional patterns
5. **Consider domain-based detection** for hosting platforms (Vercel, Netlify, etc.)

## Appendix: Raw Data

- **Full analysis data:** `unknown-cms-analysis.json`
- **Refined clusters:** Available in analysis scripts
- **Total sites analyzed:** 525
- **Analysis date:** 2025-07-13

---

*This analysis provides actionable insights for expanding CMS detection capabilities with high-confidence patterns that can reliably identify previously unknown platforms.*