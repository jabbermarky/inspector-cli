# Frequency Analysis Report

## Summary

- **Total Sites Analyzed**: 1539
- **Valid Sites**: 999
- **Filtered Out**: 540
- **Analysis Date**: 7/20/2025, 11:21:33 AM
- **Min Occurrences Threshold**: 5

## Data Quality Filtering

Sites filtered out: 540

**Filter Reasons:**
- **bot-detection**: 23 sites
- **error-page**: 149 sites
- **insufficient-data**: 35 sites
- **invalid-url**: 333 sites

## Dataset Quality Assessment

### CMS Distribution

| CMS | Sites | Percentage |
|-----|-------|------------|
| Duda | 294 | 29% |
| Joomla | 228 | 23% |
| Unknown | 193 | 19% |
| WordPress | 162 | 16% |
| Drupal | 122 | 12% |

**Dataset Concentration Score:** 22%  
*(0% = perfectly balanced across platforms, 100% = single platform dominance)*

## HTTP Headers

Total headers analyzed: **62**

| Header | Frequency | Sites Using | Unique Values | Top Value | Top Value Usage | Page Distribution |
|--------|-----------|-------------|---------------|-----------|-----------------|-------------------|
| `cache-control` | 10% | 96/999 | 32 | `no-cache, must-revalidate` | 83% | 68% main, 32% robots |
| `content-length` | 6% | 57/999 | 19 | `107` | 3% | 0% main, 100% robots |
| `server` | 6% | 57/999 | 19 | `nginx` | 104% | 61% main, 39% robots |
| `strict-transport-security` | 6% | 57/999 | 19 | `max-age=31536000; preload` | 57% | 85% main, 15% robots |
| `vary` | 3% | 30/999 | 10 | `user-agent,accept-encoding` | 57% | 79% main, 21% robots |
| `content-type` | 3% | 27/999 | 9 | `text/html;charset=utf-8` | 59% | 60% main, 40% robots |
| `expires` | 2% | 21/999 | 7 | `Thu, 01 Jan 1970 00` | 59% | 97% main, 3% robots |
| `referrer-policy` | 2% | 18/999 | 6 | `strict-origin-when-cross-origin` | 7% | 62% main, 38% robots |
| `x-cache` | 2% | 18/999 | 6 | `HIT` | 4% | 52% main, 48% robots |
| `content-security-policy` | 2% | 18/999 | 6 | `frame-ancestors 'self'` | 52% | 95% main, 5% robots |
| `x-frame-options` | 2% | 15/999 | 5 | `SAMEORIGIN` | 77% | 86% main, 14% robots |
| `cf-cache-status` | 2% | 15/999 | 5 | `DYNAMIC` | 6% | 54% main, 46% robots |
| `via` | 2% | 15/999 | 5 | `varnish` | 1% | 51% main, 49% robots |
| `alt-svc` | 1% | 12/999 | 4 | `h3="` | 9% | 53% main, 47% robots |
| `connection` | 1% | 12/999 | 4 | `keep-alive` | 36% | 29% main, 71% robots |
| `keep-alive` | 1% | 12/999 | 4 | `timeout=5, max=100` | 12% | 39% main, 61% robots |
| `x-powered-by` | 1% | 12/999 | 4 | `PHP/7.4.33` | 1% | 76% main, 24% robots |
| `content-language` | 1% | 12/999 | 4 | `en` | 5% | 81% main, 19% robots |
| `content-encoding` | 1% | 9/999 | 3 | `gzip` | 135% | 63% main, 37% robots |
| `x-content-type-options` | 1% | 9/999 | 3 | `nosniff` | 96% | 81% main, 19% robots |
| `x-xss-protection` | 1% | 9/999 | 3 | `1; mode=block` | 16% | 55% main, 45% robots |
| `x-drupal-dynamic-cache` | 1% | 9/999 | 3 | `MISS` | 1% | 78% main, 22% robots |
| `x-generator` | 1% | 9/999 | 3 | `Drupal 10 (https` | 1% | 92% main, 8% robots |
| `nel` | 1% | 9/999 | 3 | `{"success_fraction"` | 3% | 54% main, 46% robots |
| `speculation-rules` | 1% | 9/999 | 3 | `https` | 55% | 100% main, 0% robots |
| `x-ua-compatible` | 1% | 9/999 | 3 | `IE=edge` | 1% | 85% main, 15% robots |
| `pragma` | 1% | 6/999 | 2 | `no-cache` | 23% | 95% main, 5% robots |
| `cross-origin-opener-policy` | 1% | 6/999 | 2 | `same-origin` | 5% | 83% main, 17% robots |
| `x-cache-hits` | 1% | 6/999 | 2 | `0` | 1% | 42% main, 58% robots |
| `x-drupal-cache` | 1% | 6/999 | 2 | `HIT` | 4% | 90% main, 10% robots |
| `p3p` | 1% | 6/999 | 2 | `CP="NOI ADM DEV PSAi COM NAV OUR OTRo STP IND DEM"` | 6% | 100% main, 0% robots |
| `upgrade` | 1% | 6/999 | 2 | `h2` | 1% | 25% main, 75% robots |
| `x-permitted-cross-domain-policies` | 1% | 6/999 | 2 | `none` | 3% | 53% main, 47% robots |
| `host-header` | 1% | 6/999 | 2 | `WordPress.com` | 1% | 50% main, 50% robots |
| `permissions-policy` | 1% | 6/999 | 2 | `interest-cohort=()` | 2% | 68% main, 32% robots |
| `d-geo` | 1% | 6/999 | 2 | `US` | 80% | 67% main, 33% robots |
| `accept-ranges` | 0% | 3/999 | 1 | `bytes` | 31% | 21% main, 79% robots |
| `access-control-allow-origin` | 0% | 3/999 | 1 | `*` | 3% | 48% main, 52% robots |
| `transfer-encoding` | 0% | 3/999 | 1 | `chunked` | 24% | 48% main, 52% robots |
| `x-content-encoded-by` | 0% | 3/999 | 1 | `Joomla` | 1% | 93% main, 7% robots |
| `age` | 0% | 3/999 | 1 | `0` | 2% | 50% main, 50% robots |
| `x-robots-tag` | 0% | 3/999 | 1 | `noindex, follow` | 1% | 0% main, 100% robots |
| `x-amz-cf-pop` | 0% | 3/999 | 1 | `ATL58-P7` | 1% | 60% main, 40% robots |
| `x-varnish-cache` | 0% | 3/999 | 1 | `HIT` | 1% | 67% main, 33% robots |
| `access-control-allow-credentials` | 0% | 3/999 | 1 | `true` | 1% | 50% main, 50% robots |
| `x-cache-status` | 0% | 3/999 | 1 | `MISS` | 3% | 66% main, 34% robots |
| `x-sucuri-cache` | 0% | 3/999 | 1 | `MISS` | 1% | 38% main, 63% robots |
| `access-control-allow-headers` | 0% | 3/999 | 1 | `Content-Type, X-CSRF-TOKEN` | 1% | 50% main, 50% robots |
| `priority` | 0% | 3/999 | 1 | `u=0,i` | 1% | 100% main, 0% robots |
| `x-download-options` | 0% | 3/999 | 1 | `noopen` | 2% | 55% main, 45% robots |
| `x-cdn` | 0% | 3/999 | 1 | `Served-By-Zenedge` | 2% | 70% main, 30% robots |
| `x-ah-environment` | 0% | 3/999 | 1 | `prod` | 1% | 54% main, 46% robots |
| `x-turbo-charged-by` | 0% | 3/999 | 1 | `LiteSpeed` | 1% | 50% main, 50% robots |
| `x-content-powered-by` | 0% | 3/999 | 1 | `K2 v2.10.3 (by JoomlaWorks)` | 1% | 100% main, 0% robots |
| `x-logged-in` | 0% | 3/999 | 1 | `False` | 2% | 100% main, 0% robots |
| `d-cache` | 0% | 3/999 | 1 | `from-cache` | 75% | 62% main, 38% robots |
| `x-ws-ratelimit-limit` | 0% | 3/999 | 1 | `1000` | 3% | 73% main, 27% robots |
| `x-ws-ratelimit-remaining` | 0% | 3/999 | 1 | `999` | 3% | 73% main, 27% robots |
| `powered-by` | 0% | 3/999 | 1 | `Shopify` | 1% | 57% main, 43% robots |
| `shopify-complexity-score` | 0% | 3/999 | 1 | `0` | 1% | 57% main, 43% robots |
| `x-dc` | 0% | 3/999 | 1 | `gcp-us-east1,gcp-us-east1,gcp-us-east1` | 1% | 50% main, 50% robots |
| `x-storefront-renderer-rendered` | 0% | 3/999 | 1 | `1` | 1% | 57% main, 43% robots |


## Meta Tags

Total meta tag types analyzed: **31**

*Each meta tag type may have multiple values. Table shows frequency of each type across all sites.*

| Meta Tag | Frequency | Sites Using | Example Value |
|----------|-----------|-------------|---------------|
| `name:viewport` | 1% | 12/999 | `viewport:initial-scale=1, minimum-scale=1, maximum...` |
| `unknown` | 1% | 6/999 | `no-content` |
| `name:generator` | 1% | 5/999 | `generator:Joomla! - Open Source Content Management` |
| `name:robots` | 1% | 5/999 | `robots:index, follow` |
| `http-equiv:X-UA-Compatible` | 0% | 2/999 | `X-UA-Compatible:IE=edge` |
| `name:twitter:card` | 0% | 2/999 | `twitter:card:summary` |
| `property:og:type` | 0% | 2/999 | `og:type:website` |
| `name:msapplication-TileColor` | 0% | 2/999 | `msapplication-TileColor:#ffffff` |
| `name:Generator` | 0% | 2/999 | `Generator:Drupal 10 (https://www.drupal.org)` |
| `name:apple-mobile-web-app-capable` | 0% | 2/999 | `apple-mobile-web-app-capable:yes` |
| `property:og:image:height` | 0% | 2/999 | `og:image:height:630` |
| `property:og:image:type` | 0% | 2/999 | `og:image:type:image/jpeg` |
| `name:twitter:title` | 0% | 1/999 | `twitter:title:Home` |
| `property:og:title` | 0% | 1/999 | `og:title:Home` |
| `name:author` | 0% | 1/999 | `author:Super User` |
| `name:MobileOptimized` | 0% | 1/999 | `MobileOptimized:width` |
| `name:HandheldFriendly` | 0% | 1/999 | `HandheldFriendly:true` |
| `property:og:locale` | 0% | 1/999 | `og:locale:en_US` |
| `http-equiv:content-type` | 0% | 1/999 | `content-type:text/html; charset=utf-8` |
| `property:og:image:width` | 0% | 1/999 | `og:image:width:1200` |
| `name:theme-color` | 0% | 1/999 | `theme-color:#ffffff` |
| `http-equiv:Content-Type` | 0% | 1/999 | `Content-Type:text/html; charset=utf-8` |
| `name:format-detection` | 0% | 1/999 | `format-detection:telephone=no` |
| `property:og:image:alt` | 0% | 1/999 | `og:image:alt:no-content` |
| `name:mobile-web-app-capable` | 0% | 1/999 | `mobile-web-app-capable:yes` |
| `name:apple-mobile-web-app-status-bar-style` | 0% | 1/999 | `apple-mobile-web-app-status-bar-style:black-transl...` |
| `http-equiv:x-ua-compatible` | 0% | 1/999 | `x-ua-compatible:ie=edge` |
| `http-equiv:content-language` | 0% | 1/999 | `content-language:en` |
| `name:siteType` | 0% | 1/999 | `siteType:no-content` |
| `http-equiv:cleartype` | 0% | 1/999 | `cleartype:on` |
| `http-equiv:x-dns-prefetch-control` | 0% | 1/999 | `x-dns-prefetch-control:on` |


## Script Patterns

### Path Patterns

*Script locations that indicate CMS structure, platform architecture, or organizational patterns.*

| Pattern | Frequency | Sites Using | Example |
|---------|-----------|-------------|---------|
| `js` | 56% | 561/999 | /media/plg_jchoptimize/cache/js/6b14b67a43198657a1... |
| `media` | 21% | 209/999 | /media/plg_jchoptimize/cache/js/6b14b67a43198657a1... |
| `assets` | 21% | 207/999 | /media/gantry5/assets/js/main.js |
| `templates` | 18% | 182/999 | /templates/yootheme_general/builder/hd-image-compa... |
| `modules` | 13% | 129/999 | /modules/mod_djmegamenu/assets/js/jquery.djmegamen... |
| `sites` | 12% | 123/999 | /sites/default/files/js/js__QRQa5bAeJYgz5XR7wzB347... |
| `components` | 6% | 61/999 | https://www.classificadosx.net/components/com_adsm... |
| `wp-content` | 3% | 33/999 | //www.usr.sicilia.it/wp-content/cache/wpfc-minifie... |
| `wp-includes` | 2% | 21/999 | https://www.harvard.edu/wp-includes/js/dist/hooks.... |
| `javascript` | 1% | 11/999 | https://tripla.jp/sdk/javascript/tripla.min.js |

### JavaScript Libraries

*Popular JavaScript libraries and frameworks detected across sites.*

| Pattern | Frequency | Sites Using | Example |
|---------|-----------|-------------|---------|
| `jquery` | 80% | 799/999 | /media/jui/js/jquery.min.js?3a320733840a61cc9a785e... |
| `bootstrap` | 15% | 148/999 | /media/jui/js/bootstrap.min.js?3a320733840a61cc9a7... |
| `react` | 7% | 67/999 | https://ms-cdn.multiscreensite.com/runtime-react/3... |

### Analytics & Tracking

*Analytics platforms, marketing pixels, and user tracking technologies.*

| Pattern | Frequency | Sites Using | Example |
|---------|-----------|-------------|---------|
| `google-tag-manager` | 52% | 515/999 | https://www.googletagmanager.com/gtag/js?id=G-WFH6... |
| `google-analytics` | 43% | 428/999 | https://www.googletagmanager.com/gtag/js?id=G-WFH6... |
| `facebook` | 12% | 119/999 | //connect.facebook.net/en_US/sdk.js#xfbml=1&versio... |
| `hotjar` | 1% | 9/999 | https://static.hotjar.com/c/hotjar-5284946.js?sv=6 |

### Script Characteristics

*Technical attributes and optimization patterns of JavaScript files.*

| Pattern | Frequency | Sites Using | Example |
|---------|-----------|-------------|---------|
| `minified` | 91% | 911/999 | /templates/yootheme/vendor/yootheme/theme-analytic... |
| `bundled` | 5% | 48/999 | /static/js/ppfaHomepageMinimal.bundle.954d12c32895... |
| `polyfill` | 3% | 27/999 | /_next/static/chunks/polyfills-42372ed130431b0a.js |
| `drupal` | 2% | 24/999 | https://www.un.org/misc/drupal.js?sxozar |
| `joomla` | 1% | 9/999 | https://www.generalosgb.com/plugins/content/powrsh... |
| `wordpress` | 1% | 8/999 | https://www.harvard.edu/wp-content/plugins/duracel... |

### Inline Script Patterns

*Common patterns found in inline JavaScript code embedded in HTML.*

| Pattern | Frequency | Sites Using | Example |
|---------|-----------|-------------|---------|
| `jquery` | 90% | 899/999 | var $theme={"google_analytics":"UA-166263006-1","g... |
| `ajax` | 79% | 793/999 | {"csrf.token":"8bbee2e0114c7f82bdabd86f62d4219a","... |
| `dom-ready` | 73% | 726/999 | (function(d){var js,id='powr-js',ref=d.getElements... |
| `duda` | 59% | 590/999 |      window._currentDevice = 'desktop';     window... |
| `google-tag-manager` | 57% | 568/999 |    window.dataLayer = window.dataLayer \|\| [];   ... |
| `google-analytics` | 45% | 453/999 |    window.dataLayer = window.dataLayer \|\| [];   ... |
| `angular` | 16% | 157/999 |      window.pageConfig = {              staticURL:... |
| `facebook-pixel` | 9% | 92/999 |  !function(f,b,e,v,n,t,s) {if(f.fbq)return;n=f.fbq... |
| `drupal` | 6% | 64/999 | jQuery.extend(Drupal.settings, {"basePath":"\/","p... |
| `wordpress` | 4% | 35/999 |  {"prefetch":[{"source":"document","where":{"and":... |
| `window-load` | 3% | 29/999 | (function(){const t="dark:only";function e(e,t,n){... |
| `matomo` | 2% | 24/999 |  var _paq = window._paq = window._paq \|\| []; /* ... |
| `joomla` | 2% | 18/999 | document.addEventListener('DOMContentLoaded', func... |

### CDN & External Domains

*Content delivery networks and external script hosting services.*

| Pattern | Frequency | Sites Using | Example |
|---------|-----------|-------------|---------|
| `cdn` | 70% | 696/999 | //cdnjs.cloudflare.com/ajax/libs/headroom/0.9.3/he... |
| `cloudfront` | 59% | 591/999 | https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.... |
| `duda-cdn` | 55% | 549/999 | https://static.cdn-website.com/mnlt/production/563... |
| `cdnjs` | 3% | 33/999 | //cdnjs.cloudflare.com/ajax/libs/headroom/0.9.3/he... |
| `jsdelivr` | 3% | 28/999 | https://cdn.jsdelivr.net/npm/sweetalert2@11 |
| `unpkg` | 2% | 15/999 | https://unpkg.com/aos@2.3.1/dist/aos.js |

**Summary:** 42 total patterns across 6 categories analyzed.

## Recommendations

### Learn Command Filter Recommendations

#### Currently Filtered Headers (66):
- `server`
- `content-type`
- `cache-control`
- `cdn-cache-control`
- `expires`
- `date`
- `connection`
- `keep-alive`
- `accept-ranges`
- `content-language`
- `cache-tags`
- `access-control-allow-origin`
- `access-control-allow-credentials`
- `vary`
- `etag`
- `last-modified`
- `content-length`
- `content-encoding`
- `transfer-encoding`
- `pragma`
- `age`
- `via`
- `x-cache`
- `x-cache-hits`
- `x-served-by`
- `x-timer`
- `cf-ray`
- `cf-cache-status`
- `cache-status`
- `x-vercel-cache`
- `x-vercel-id`
- `fly-request-id`
- `x-amz-cf-id`
- `x-amz-cf-pop`
- `x-turbo-charged-by`
- `alt-svc`
- `strict-transport-security`
- `x-content-type-options`
- `x-frame-options`
- `x-xss-protection`
- `referrer-policy`
- `content-security-policy`
- `x-content-security-policy`
- `x-webkit-csp`
- `feature-policy`
- `permissions-policy`
- `cross-origin-embedder-policy`
- `cross-origin-opener-policy`
- `cross-origin-resource-policy`
- `nel`
- `report-to`
- `server-timing`
- `panel`
- `platform`
- `onsuccess`
- `p3p`
- `x-download-options`
- `x-permitted-cross-domain-policies`
- `expect-ct`
- `x-akamai-transformed`
- `x-edgeconnect-midmile-rtt`
- `x-edgeconnect-origin-mex-latency`
- `speculation-rules`
- `surrogate-control`
- `x-request-id`
- `x-dc`

#### Recommend to Filter:

| Header | Frequency | Sites Using | Unique Values | Top Value | Page Distribution | Recommendation |
|--------|-----------|-------------|---------------|-----------|------------------|----------------|


#### Recommend to Keep:

| Header | Frequency | Sites Using | Unique Values | Top Value | Page Distribution | Recommendation |
|--------|-----------|-------------|---------------|-----------|------------------|----------------|
| `pragma` | 23% | 6/999 | 2 | `no-cache` | 95% main, 5% robots | High platform specificity (100%) |
| `keep-alive` | 14% | 12/999 | 4 | `timeout=5, max=100` | 39% main, 61% robots | High platform specificity (100%) |
| `x-content-encoded-by` | 1% | 3/999 | 1 | `Joomla` | 93% main, 7% robots | High platform specificity (100%) |
| `age` | 2% | 3/999 | 1 | `0` | 50% main, 50% robots | High platform specificity (100%) |
| `content-language` | 7% | 12/999 | 4 | `en` | 81% main, 19% robots | High platform specificity (100%) |
| `cross-origin-opener-policy` | 5% | 6/999 | 2 | `same-origin` | 83% main, 17% robots | High platform specificity (100%) |
| `via` | 6% | 15/999 | 5 | `varnish` | 51% main, 49% robots | High platform specificity (100%) |
| `x-cache` | 10% | 18/999 | 6 | `HIT` | 52% main, 48% robots | High platform specificity (100%) |
| `x-cache-hits` | 1% | 6/999 | 2 | `0` | 42% main, 58% robots | High platform specificity (100%) |
| `x-drupal-cache` | 6% | 6/999 | 2 | `HIT` | 90% main, 10% robots | High platform specificity (100%) |

### Detect-CMS Recommendations

#### New Pattern Opportunities:
- **`p3p:CP="NOI ADM DEV PSAi COM NAV OUR OTRo STP IND DEM"`**: 6% frequency, 100% correlation with Joomla

#### Patterns to Refine:
- **`content-encoding:gzip`**: Too generic - appears in most sites (135% frequency)
- **`server:nginx`**: Too generic - appears in most sites (104% frequency)
- **`x-content-type-options:nosniff`**: Too generic - appears in most sites (96% frequency)
- **`cache-control:no-cache, must-revalidate`**: Too generic - appears in most sites (83% frequency)
- **`d-geo:US`**: Too generic - appears in most sites (80% frequency)

### Ground-Truth Recommendations

#### Potential New Rules:
- Sites with "cache-control:no-store, no-cache, must-revalidate, post-check=0, pre-check=0, no-cache" are likely Joomla (100% confidence)
- Sites with "cache-control:max-age=300, must-revalidate" are likely WordPress (100% confidence)
- Sites with "cache-control:max-age=31622400" are likely Drupal (100% confidence)
- Sites with "cache-control:private, max-age=0" are likely Joomla (100% confidence)
- Sites with "cache-control:no-transform" are likely Joomla (100% confidence)
