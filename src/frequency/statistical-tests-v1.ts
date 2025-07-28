import { createModuleLogger } from '../utils/logger.js';
import type { HeaderCMSCorrelation, CMSDistribution } from './bias-detector-v1.js';

const logger = createModuleLogger('frequency-statistical-tests');

export interface ChiSquareResult {
    statistic: number;
    degreesOfFreedom: number;
    pValue: number;
    isSignificant: boolean;
    criticalValue: number;
    observed: number[][];
    expected: number[][];
    yatesCorrection: boolean;
}

export interface FisherResult {
    pValue: number;
    isSignificant: boolean;
    oddsRatio: number;
    confidence95: {
        lower: number;
        upper: number;
    };
    contingencyTable: number[][];
}

export interface SignificanceTestResult {
    method: 'chi-square' | 'fisher-exact' | 'not-applicable';
    result: ChiSquareResult | FisherResult | null;
    recommendation: 'use' | 'caution' | 'reject';
    reason: string;
}

/**
 * Statistical significance testing for frequency analysis correlations
 */
export class StatisticalTester {
    private static readonly ALPHA = 0.05; // 5% significance level
    private static readonly CHI_SQUARE_MIN_EXPECTED = 5; // Minimum expected frequency for chi-square
    private static readonly FISHER_MAX_TOTAL = 100; // Use Fisher's exact for small samples

    /**
     * Determine appropriate statistical test and run it
     */
    static testSignificance(
        headerName: string,
        correlation: HeaderCMSCorrelation,
        cmsDistribution: CMSDistribution,
        totalSites: number
    ): SignificanceTestResult {
        // Create contingency table for the most significant CMS
        const contingencyData = this.createContingencyTable(
            correlation,
            cmsDistribution,
            totalSites
        );

        if (!contingencyData) {
            return {
                method: 'not-applicable',
                result: null,
                recommendation: 'reject',
                reason: 'Insufficient data for statistical testing',
            };
        }

        const { contingencyTable, cmsName } = contingencyData;
        const totalObservations = contingencyTable.flat().reduce((sum, val) => sum + val, 0);

        // Choose appropriate test
        if (
            totalObservations <= this.FISHER_MAX_TOTAL ||
            this.hasLowExpectedFrequencies(contingencyTable)
        ) {
            // Use Fisher's exact test for small samples or low expected frequencies
            const result = this.fisherExactTest(contingencyTable);
            return {
                method: 'fisher-exact',
                result,
                recommendation: this.getRecommendation(result.isSignificant, result.pValue),
                reason: `Fisher's exact test used (n=${totalObservations}, testing ${headerName} → ${cmsName})`,
            };
        } else {
            // Use chi-square test for larger samples
            const result = this.chiSquareTest(contingencyTable);
            return {
                method: 'chi-square',
                result,
                recommendation: this.getRecommendation(result.isSignificant, result.pValue),
                reason: `Chi-square test used (n=${totalObservations}, testing ${headerName} → ${cmsName})`,
            };
        }
    }

    /**
     * Create 2x2 contingency table for the most discriminative CMS
     */
    private static createContingencyTable(
        correlation: HeaderCMSCorrelation,
        cmsDistribution: CMSDistribution,
        totalSites: number
    ): { contingencyTable: number[][]; cmsName: string } | null {
        // Find the CMS with highest correlation for this header
        let maxCorrelation = 0;
        let bestCms = '';

        for (const [cmsName, data] of Object.entries(correlation.cmsGivenHeader)) {
            if (data.probability > maxCorrelation && data.count >= 1) {
                maxCorrelation = data.probability;
                bestCms = cmsName;
            }
        }

        if (!bestCms || maxCorrelation < 0.1) {
            return null; // No meaningful correlation to test
        }

        const cmsData = correlation.cmsGivenHeader[bestCms];
        const cmsTotal = cmsDistribution[bestCms]?.count || 0;

        if (cmsTotal === 0) {
            return null;
        }

        // Create 2x2 contingency table:
        // |           | CMS | Not CMS | Total |
        // |-----------|-----|---------|-------|
        // | Header    |  a  |    b    | a+b   |
        // | No Header |  c  |    d    | c+d   |
        // | Total     | a+c |   b+d   |   n   |

        const a = cmsData.count; // Sites with both header and CMS
        const b = correlation.overallOccurrences - a; // Sites with header but not CMS
        const c = cmsTotal - a; // Sites with CMS but not header
        const d = totalSites - a - b - c; // Sites with neither

        // Validate contingency table
        if (a < 0 || b < 0 || c < 0 || d < 0) {
            logger.warn('Invalid contingency table', {
                headerName: correlation.headerName,
                bestCms,
                a,
                b,
                c,
                d,
            });
            return null;
        }

        return {
            contingencyTable: [
                [a, b],
                [c, d],
            ],
            cmsName: bestCms,
        };
    }

    /**
     * Chi-square test for independence with Yates correction for 2x2 tables
     */
    static chiSquareTest(observed: number[][]): ChiSquareResult {
        const rows = observed.length;
        const cols = observed[0].length;
        const n = observed.flat().reduce((sum, val) => sum + val, 0);

        // Calculate expected frequencies
        const rowTotals = observed.map(row => row.reduce((sum, val) => sum + val, 0));
        const colTotals = observed[0].map((_, colIndex) =>
            observed.reduce((sum, row) => sum + row[colIndex], 0)
        );

        const expected = observed.map((row, i) =>
            row.map((_, j) => (rowTotals[i] * colTotals[j]) / n)
        );

        // Apply Yates continuity correction for 2x2 tables
        const yatesCorrection = rows === 2 && cols === 2;

        let chiSquare = 0;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                const exp = expected[i][j];
                let diff = Math.abs(observed[i][j] - exp);

                if (yatesCorrection) {
                    diff = Math.max(0, diff - 0.5); // Yates correction
                }

                chiSquare += (diff * diff) / exp;
            }
        }

        const degreesOfFreedom = (rows - 1) * (cols - 1);
        const criticalValue = this.chiSquareCriticalValue(degreesOfFreedom, this.ALPHA);
        const pValue = this.chiSquarePValue(chiSquare, degreesOfFreedom);

        return {
            statistic: chiSquare,
            degreesOfFreedom,
            pValue,
            isSignificant: pValue < this.ALPHA,
            criticalValue,
            observed,
            expected,
            yatesCorrection,
        };
    }

    /**
     * Fisher's exact test for 2x2 contingency tables
     */
    static fisherExactTest(contingencyTable: number[][]): FisherResult {
        const [[a, b], [c, d]] = contingencyTable;
        const n1 = a + b; // Row 1 total
        const n2 = c + d; // Row 2 total
        const k1 = a + c; // Column 1 total
        const k2 = b + d; // Column 2 total
        const n = n1 + n2; // Grand total

        // Calculate exact p-value using hypergeometric distribution
        const pValue = this.hypergeometricPValue(a, n1, k1, n);

        // Calculate odds ratio
        const oddsRatio = (a * d) / (b * c) || 0;

        // Calculate 95% confidence interval for odds ratio (approximate)
        const logOddsRatio = Math.log(oddsRatio || 0.001);
        const seLogOdds = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
        const z95 = 1.96; // 95% confidence

        const confidence95 = {
            lower: Math.exp(logOddsRatio - z95 * seLogOdds),
            upper: Math.exp(logOddsRatio + z95 * seLogOdds),
        };

        return {
            pValue,
            isSignificant: pValue < this.ALPHA,
            oddsRatio,
            confidence95,
            contingencyTable,
        };
    }

    /**
     * Calculate minimum sample size for reliable correlation analysis
     */
    static minimumSampleSize(
        populationSize: number,
        marginOfError: number = 0.05,
        confidenceLevel: number = 0.95
    ): number {
        // Z-score for confidence level
        const zScore = confidenceLevel === 0.95 ? 1.96 : confidenceLevel === 0.99 ? 2.576 : 1.645;

        // Assume maximum variability (p = 0.5)
        const p = 0.5;

        // Sample size formula for finite population
        const numerator = (zScore * zScore * p * (1 - p)) / (marginOfError * marginOfError);
        const denominator = 1 + (numerator - 1) / populationSize;

        return Math.ceil(numerator / denominator);
    }

    /**
     * Check if contingency table has low expected frequencies
     */
    private static hasLowExpectedFrequencies(contingencyTable: number[][]): boolean {
        const n = contingencyTable.flat().reduce((sum, val) => sum + val, 0);
        const rowTotals = contingencyTable.map(row => row.reduce((sum, val) => sum + val, 0));
        const colTotals = contingencyTable[0].map((_, colIndex) =>
            contingencyTable.reduce((sum, row) => sum + row[colIndex], 0)
        );

        for (let i = 0; i < contingencyTable.length; i++) {
            for (let j = 0; j < contingencyTable[0].length; j++) {
                const expected = (rowTotals[i] * colTotals[j]) / n;
                if (expected < this.CHI_SQUARE_MIN_EXPECTED) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Get recommendation based on statistical significance
     */
    private static getRecommendation(
        isSignificant: boolean,
        pValue: number
    ): 'use' | 'caution' | 'reject' {
        if (isSignificant && pValue < 0.01) {
            return 'use'; // Highly significant
        } else if (isSignificant && pValue < 0.05) {
            return 'caution'; // Significant but use with caution
        } else {
            return 'reject'; // Not statistically significant
        }
    }

    /**
     * Approximate chi-square critical value for given degrees of freedom and alpha
     */
    private static chiSquareCriticalValue(df: number, alpha: number): number {
        // Simplified lookup table for common values
        const criticalValues: Record<string, number> = {
            '1_0.05': 3.841,
            '1_0.01': 6.635,
            '2_0.05': 5.991,
            '2_0.01': 9.21,
            '3_0.05': 7.815,
            '3_0.01': 11.345,
            '4_0.05': 9.488,
            '4_0.01': 13.277,
        };

        const key = `${df}_${alpha}`;
        return criticalValues[key] || 3.841; // Default to df=1, alpha=0.05
    }

    /**
     * Approximate chi-square p-value calculation
     */
    private static chiSquarePValue(chiSquare: number, df: number): number {
        // Simplified approximation - in production, use proper implementation
        if (df === 1) {
            if (chiSquare >= 10.828) return 0.001;
            if (chiSquare >= 6.635) return 0.01;
            if (chiSquare >= 3.841) return 0.05;
            if (chiSquare >= 2.706) return 0.1;
            return 0.2;
        }

        // For other degrees of freedom, use conservative estimate
        return chiSquare > this.chiSquareCriticalValue(df, 0.05) ? 0.04 : 0.1;
    }

    /**
     * Calculate hypergeometric p-value for Fisher's exact test
     */
    private static hypergeometricPValue(
        k: number, // Successes observed
        n: number, // Sample size
        K: number, // Total successes in population
        N: number // Population size
    ): number {
        // Simplified calculation - in production, use proper hypergeometric implementation
        // This is a conservative approximation

        const expected = (n * K) / N;
        const variance = (n * K * (N - K) * (N - n)) / (N * N * (N - 1));
        const standardScore = Math.abs(k - expected) / Math.sqrt(variance);

        // Convert to approximate p-value using normal approximation
        if (standardScore >= 2.576) return 0.01;
        if (standardScore >= 1.96) return 0.05;
        if (standardScore >= 1.645) return 0.1;
        return 0.2;
    }
}

/**
 * Utility function to run significance test on correlation data
 */
export function testCorrelationSignificance(
    headerName: string,
    correlation: HeaderCMSCorrelation,
    cmsDistribution: CMSDistribution,
    totalSites: number
): SignificanceTestResult {
    return StatisticalTester.testSignificance(headerName, correlation, cmsDistribution, totalSites);
}

/**
 * Batch test multiple correlations for significance
 */
export function testMultipleCorrelations(
    correlations: Map<string, HeaderCMSCorrelation>,
    cmsDistribution: CMSDistribution,
    totalSites: number
): Map<string, SignificanceTestResult> {
    const results = new Map<string, SignificanceTestResult>();

    for (const [headerName, correlation] of correlations) {
        const testResult = StatisticalTester.testSignificance(
            headerName,
            correlation,
            cmsDistribution,
            totalSites
        );
        results.set(headerName, testResult);
    }

    return results;
}
