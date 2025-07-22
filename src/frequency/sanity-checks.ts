import { createModuleLogger } from '../utils/logger.js';
import type { HeaderCMSCorrelation, CMSDistribution } from './bias-detector.js';

const logger = createModuleLogger('frequency-sanity-checks');

export interface SanityCheckResult {
  passed: boolean;
  message: string;
  details?: any;
}

export interface ValidationWarning {
  severity: 'low' | 'medium' | 'high';
  message: string;
  headerName?: string;
  cmsName?: string;
  details: any;
}

export interface SanityChecksReport {
  passed: boolean;
  warnings: ValidationWarning[];
  errors: ValidationWarning[];
  summary: {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    warningsCount: number;
  };
}

/**
 * Comprehensive sanity checks for frequency analysis correlation calculations
 */
export class SanityChecker {
  private warnings: ValidationWarning[] = [];
  private errors: ValidationWarning[] = [];

  /**
   * Run all sanity checks on correlation data
   */
  runAllChecks(
    correlations: Map<string, HeaderCMSCorrelation>,
    cmsDistribution: CMSDistribution
  ): SanityChecksReport {
    this.warnings = [];
    this.errors = [];

    const checks = [
      this.correlationSumCheck.bind(this),
      this.correlationRangeCheck.bind(this),
      this.supportCheck.bind(this),
      this.bayesianConsistencyCheck.bind(this),
      this.probabilityConservationCheck.bind(this),
      this.mathematicalImpossibilityCheck.bind(this)
    ];

    let passedChecks = 0;
    const totalChecks = checks.length;

    for (const check of checks) {
      try {
        const result = check(correlations, cmsDistribution);
        if (result.passed) {
          passedChecks++;
        } else {
          logger.warn('Sanity check failed', { check: check.name, message: result.message });
        }
      } catch (error) {
        this.errors.push({
          severity: 'high',
          message: `Sanity check ${check.name} threw error: ${error}`,
          details: { error: String(error) }
        });
        logger.error('Sanity check error', { check: check.name, error });
      }
    }

    const passed = this.errors.length === 0 && passedChecks === totalChecks;

    return {
      passed,
      warnings: this.warnings,
      errors: this.errors,
      summary: {
        totalChecks,
        passedChecks,
        failedChecks: totalChecks - passedChecks,
        warningsCount: this.warnings.length
      }
    };
  }

  /**
   * Check that correlations for each header sum to approximately 100%
   * Sum of P(CMS|header) across all CMS should ≈ 100%
   */
  private correlationSumCheck(
    correlations: Map<string, HeaderCMSCorrelation>,
    cmsDistribution: CMSDistribution
  ): SanityCheckResult {
    for (const [headerName, correlation] of correlations) {
      const cmsGivenHeaderSum = Object.values(correlation.cmsGivenHeader)
        .reduce((sum, data) => sum + data.probability, 0);

      // Allow 1% tolerance for rounding errors
      if (Math.abs(cmsGivenHeaderSum - 1.0) > 0.01) {
        const error = {
          severity: 'high' as const,
          message: `Header ${headerName} has correlation sum ${(cmsGivenHeaderSum * 100).toFixed(2)}% (should be ~100%)`,
          headerName,
          details: {
            correlationSum: cmsGivenHeaderSum,
            correlations: correlation.cmsGivenHeader,
            expectedSum: 1.0,
            tolerance: 0.01
          }
        };
        this.errors.push(error);
        return {
          passed: false,
          message: error.message,
          details: error.details
        };
      }
    }

    return {
      passed: true,
      message: 'All header correlations sum to approximately 100%'
    };
  }

  /**
   * Check that no individual correlation exceeds 100% or is negative
   */
  private correlationRangeCheck(
    correlations: Map<string, HeaderCMSCorrelation>,
    cmsDistribution: CMSDistribution
  ): SanityCheckResult {
    for (const [headerName, correlation] of correlations) {
      for (const [cmsName, data] of Object.entries(correlation.cmsGivenHeader)) {
        if (data.probability < 0) {
          const error = {
            severity: 'high' as const,
            message: `Negative correlation: ${headerName} → ${cmsName} = ${(data.probability * 100).toFixed(2)}%`,
            headerName,
            cmsName,
            details: { correlation: data.probability, type: 'negative' }
          };
          this.errors.push(error);
          return {
            passed: false,
            message: error.message,
            details: error.details
          };
        }

        if (data.probability > 1.0) {
          const error = {
            severity: 'high' as const,
            message: `Correlation > 100%: ${headerName} → ${cmsName} = ${(data.probability * 100).toFixed(2)}%`,
            headerName,
            cmsName,
            details: { correlation: data.probability, type: 'overflow' }
          };
          this.errors.push(error);
          return {
            passed: false,
            message: error.message,
            details: error.details
          };
        }
      }
    }

    return {
      passed: true,
      message: 'All correlations within valid range [0%, 100%]'
    };
  }

  /**
   * Check for high correlations with insufficient statistical support
   */
  private supportCheck(
    correlations: Map<string, HeaderCMSCorrelation>,
    cmsDistribution: CMSDistribution
  ): SanityCheckResult {
    const minSampleSizeForHighCorr = 30;
    const highCorrelationThreshold = 0.7; // 70%

    for (const [headerName, correlation] of correlations) {
      for (const [cmsName, data] of Object.entries(correlation.cmsGivenHeader)) {
        if (data.probability > highCorrelationThreshold && data.count < minSampleSizeForHighCorr) {
          const warning = {
            severity: 'medium' as const,
            message: `High correlation (${(data.probability * 100).toFixed(1)}%) with low support: ${headerName} → ${cmsName} (${data.count} sites)`,
            headerName,
            cmsName,
            details: {
              correlation: data.probability,
              sampleSize: data.count,
              minRecommended: minSampleSizeForHighCorr,
              threshold: highCorrelationThreshold
            }
          };
          this.warnings.push(warning);
        }
      }
    }

    return {
      passed: true,
      message: 'Support check completed (warnings may exist)'
    };
  }

  /**
   * Check Bayesian consistency: P(A|B) × P(B) = P(B|A) × P(A)
   * Verify P(CMS|header) × P(header) ≈ P(header|CMS) × P(CMS)
   */
  private bayesianConsistencyCheck(
    correlations: Map<string, HeaderCMSCorrelation>,
    cmsDistribution: CMSDistribution
  ): SanityCheckResult {
    const totalSites = Object.values(cmsDistribution).reduce((sum, cms) => sum + cms.count, 0);

    for (const [headerName, correlation] of correlations) {
      const pHeader = correlation.overallFrequency; // P(header)

      for (const [cmsName, cmsGivenHeaderData] of Object.entries(correlation.cmsGivenHeader)) {
        const pCmsGivenHeader = cmsGivenHeaderData.probability; // P(CMS|header)
        const pCms = (cmsDistribution[cmsName]?.count || 0) / totalSites; // P(CMS)
        
        // Get P(header|CMS) from perCMSFrequency
        const headerGivenCmsData = correlation.perCMSFrequency[cmsName];
        if (!headerGivenCmsData) continue;
        
        const pHeaderGivenCms = headerGivenCmsData.frequency; // P(header|CMS)

        // Bayesian equation: P(CMS|header) × P(header) ≈ P(header|CMS) × P(CMS)
        const leftSide = pCmsGivenHeader * pHeader;
        const rightSide = pHeaderGivenCms * pCms;
        const relativeError = Math.abs(leftSide - rightSide) / Math.max(leftSide, rightSide, 0.001);

        // Allow 5% relative error for numerical precision
        if (relativeError > 0.05) {
          const warning = {
            severity: 'low' as const,
            message: `Bayesian inconsistency: ${headerName} → ${cmsName} (${(relativeError * 100).toFixed(1)}% error)`,
            headerName,
            cmsName,
            details: {
              leftSide: leftSide,
              rightSide: rightSide,
              relativeError,
              pCmsGivenHeader,
              pHeader,
              pHeaderGivenCms,
              pCms
            }
          };
          this.warnings.push(warning);
        }
      }
    }

    return {
      passed: true,
      message: 'Bayesian consistency check completed'
    };
  }

  /**
   * Check probability conservation: counts should match across calculations
   */
  private probabilityConservationCheck(
    correlations: Map<string, HeaderCMSCorrelation>,
    cmsDistribution: CMSDistribution
  ): SanityCheckResult {
    for (const [headerName, correlation] of correlations) {
      // Sum of CMS-specific counts should equal overall occurrences
      const cmsCountSum = Object.values(correlation.cmsGivenHeader)
        .reduce((sum, data) => sum + data.count, 0);

      if (cmsCountSum !== correlation.overallOccurrences) {
        const error = {
          severity: 'high' as const,
          message: `Count mismatch for ${headerName}: CMS sum ${cmsCountSum} ≠ overall ${correlation.overallOccurrences}`,
          headerName,
          details: {
            cmsCountSum,
            overallOccurrences: correlation.overallOccurrences,
            difference: cmsCountSum - correlation.overallOccurrences,
            cmsBreakdown: correlation.cmsGivenHeader
          }
        };
        this.errors.push(error);
        return {
          passed: false,
          message: error.message,
          details: error.details
        };
      }
    }

    return {
      passed: true,
      message: 'Probability conservation verified'
    };
  }

  /**
   * Check for mathematical impossibilities in the data
   */
  private mathematicalImpossibilityCheck(
    correlations: Map<string, HeaderCMSCorrelation>,
    cmsDistribution: CMSDistribution
  ): SanityCheckResult {
    for (const [headerName, correlation] of correlations) {
      // Check: count for any CMS can't exceed overall occurrences
      for (const [cmsName, data] of Object.entries(correlation.cmsGivenHeader)) {
        if (data.count > correlation.overallOccurrences) {
          const error = {
            severity: 'high' as const,
            message: `Impossible count: ${headerName} → ${cmsName} has ${data.count} occurrences but header total is ${correlation.overallOccurrences}`,
            headerName,
            cmsName,
            details: {
              cmsCount: data.count,
              headerTotal: correlation.overallOccurrences,
              impossibility: 'cms_count_exceeds_header_total'
            }
          };
          this.errors.push(error);
          return {
            passed: false,
            message: error.message,
            details: error.details
          };
        }
      }

      // Check: frequency values should be consistent with counts
      if (correlation.overallFrequency < 0 || correlation.overallFrequency > 1) {
        const error = {
          severity: 'high' as const,
          message: `Invalid frequency for ${headerName}: ${(correlation.overallFrequency * 100).toFixed(2)}%`,
          headerName,
          details: {
            frequency: correlation.overallFrequency,
            impossibility: 'invalid_frequency_range'
          }
        };
        this.errors.push(error);
        return {
          passed: false,
          message: error.message,
          details: error.details
        };
      }
    }

    return {
      passed: true,
      message: 'No mathematical impossibilities detected'
    };
  }
}

/**
 * Quick validation function for individual correlation data
 */
export function validateCorrelation(
  headerName: string,
  correlation: HeaderCMSCorrelation
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Check correlation sum
  const cmsGivenHeaderSum = Object.values(correlation.cmsGivenHeader)
    .reduce((sum, data) => sum + data.probability, 0);
  
  if (Math.abs(cmsGivenHeaderSum - 1.0) > 0.01) {
    warnings.push({
      severity: 'high',
      message: `Correlation sum for ${headerName} is ${(cmsGivenHeaderSum * 100).toFixed(2)}% (should be ~100%)`,
      headerName,
      details: { correlationSum: cmsGivenHeaderSum }
    });
  }

  // Check for invalid ranges
  for (const [cmsName, data] of Object.entries(correlation.cmsGivenHeader)) {
    if (data.probability < 0 || data.probability > 1) {
      warnings.push({
        severity: 'high',
        message: `Invalid correlation range for ${headerName} → ${cmsName}: ${(data.probability * 100).toFixed(2)}%`,
        headerName,
        cmsName,
        details: { correlation: data.probability }
      });
    }
  }

  return warnings;
}

/**
 * Export utility function for easy integration
 */
export function runSanityChecks(
  correlations: Map<string, HeaderCMSCorrelation>,
  cmsDistribution: CMSDistribution
): SanityChecksReport {
  const checker = new SanityChecker();
  return checker.runAllChecks(correlations, cmsDistribution);
}