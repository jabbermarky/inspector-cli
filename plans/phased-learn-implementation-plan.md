# Phased Learn Prompting Implementation Plan

## Executive Summary

This plan implements a multi-Step approach to improve pattern naming consistency in the learn command. The strategy separates pattern discovery from standardization, uses different temperature settings for each phase, and includes comprehensive testing across multiple models.

## Success Metrics

### Primary Success Metrics
1. **Pattern Name Consistency**: >95% of identical patterns should have identical names across same-CMS sites
2. **Pattern Recognition Accuracy**: Known patterns (especially those with CMS names) should be detected consistently
3. **Confidence Score Variance**: <0.1 variance for identical patterns across similar sites

### Secondary Success Metrics
1. **Pattern Completeness**: Number of unique discriminative patterns identified
2. **Cross-Model Consistency**: Comparison of pattern consistency across different LLM models
3. **Processing Time**: Acceptable performance with 2x API calls

## Step 1: Baseline Collection & Setup

### 1.1 Pre-Implementation Commit
- [ ] Create git commit of current state for rollback capability
- [ ] Tag commit as `pre-phased-prompting-baseline`

### 1.2 Baseline Data Collection
- [ ] Run current learn command on all 4 test CSV files (40 sites total)
- [ ] Store results in `data/baseline-results/`
- [ ] Generate baseline consistency report
- [ ] Create analysis script to measure pattern naming consistency

### 1.3 Infrastructure Setup
- [ ] Create `tmp/` folder for intermediate storage
- [ ] Create `data/phased-results/` folder for new results
- [ ] Create `reports/consistency-analysis/` folder for reports
- [ ] Set up progress indication system for multi-Step processing

### 1.4 Test Data Organization
```
data/
├── baseline-results/
│   ├── wordpress-baseline.json
│   ├── drupal-baseline.json
│   ├── joomla-baseline.json
│   └── other-cms-baseline.json
├── phased-results/
│   └── [model]/
│       ├── phase1-outputs/
│       ├── phase2-outputs/
│       └── final-results/
└── test-csvs/
    ├── good-wordpress.csv
    ├── good-drupal.csv
    ├── good-joomla.csv
    └── good-other.csv
```

## Step 2: Two-Step Prompt Development

### 2.1 Step 1 Prompt: Pattern Discovery
**Objective**: Raw pattern identification and confidence assignment
**Temperature**: 0.2 (allows creative pattern recognition)

#### Key Changes:
- Remove all formatting and cross-referencing requirements
- Focus purely on pattern identification
- Simplified output structure
- No pattern ID generation requirements

#### Output Format:
```json
{
  "raw_patterns": [
    {
      "pattern_text": "exact pattern found",
      "pattern_type": "meta_tag|http_header|etc",
      "confidence": 0.85,
      "description": "what this pattern indicates",
      "data_source": "where pattern was found"
    }
  ],
  "technology_assessment": {
    "detected_technology": "WordPress",
    "overall_confidence": 0.92,
    "supporting_evidence": ["pattern_text_1", "pattern_text_2"]
  }
}
```

### 2.2 Step 2 Prompt: Standardization & Formatting
**Objective**: Pattern normalization and consistent naming
**Temperature**: 0.0 (maximum consistency)

#### Key Changes:
- Take Step 1 output as input
- Apply strict pattern naming conventions
- Generate consistent pattern IDs
- Create proper cross-references
- Apply confidence standardization rules

#### Tasks:
1. Normalize pattern names (strip versions, URLs, etc.)
2. Generate snake_case pattern IDs
3. Group similar patterns
4. Apply confidence standardization
5. Create final structured output

### 2.3 Prompt Development Process
- [ ] Draft Step 1 prompt focusing on discovery
- [ ] Draft Step 2 prompt focusing on standardization
- [ ] Create prompt validation tests
- [ ] Test prompts with sample data
- [ ] Refine based on initial results

## Step 3: Implementation

### 3.1 Core Implementation
- [ ] Create `src/learn/phased-analysis.ts` module
- [ ] Implement Step 1 analysis function
- [ ] Implement Step 2 standardization function
- [ ] Add intermediate storage handling
- [ ] Add progress indication
- [ ] Update main learn command to use phased approach

### 3.2 Model Provider Support
- [ ] Ensure phased approach works with all model providers
- [ ] Add model-specific optimizations if needed
- [ ] Handle different response formats across providers

### 3.3 Error Handling
- [ ] Step 1 failure handling
- [ ] Step 2 failure handling
- [ ] Intermediate storage cleanup
- [ ] Graceful degradation options

## Step 4: Multi-Model Testing

### 4.1 Mixed Model Test Matrix
Test mixed model combinations for optimal phase-specific performance:

#### Single Model Baseline Tests:
| Model | Test Files | Consistency Score | Notes |
|-------|------------|-------------------|--------|
| gpt-4o | All 4 CSVs | 96.8% | Current baseline |
| gpt-4-turbo | All 4 CSVs | 100% | High accuracy, expensive |
| gemini-2.0-flash-exp | All 4 CSVs | 75% | Creative discovery |

#### Mixed Model Combination Tests:
| Step 1 Model | Step 2 Model | Strategy | Expected Benefit |
|---------------|---------------|----------|------------------|
| gemini-2.0-flash-exp | gpt-4o | Cost-Optimized | Lower cost, good consistency |
| gpt-4o | gpt-4-turbo | Performance-Optimized | Maximum accuracy |
| gpt-4o | gpt-4o | Balanced Baseline | Current approach |
| gemini-2.0-flash-exp | gpt-4-turbo | Creative-Strict | Best discovery + standardization |
| gpt-4-turbo | gpt-4o | Accuracy-Efficiency | High discovery + cost-effective standardization |

### 4.2 Mixed Model Testing Process
For each model combination:
1. **Step 1 Testing**: Run pattern discovery with Step 1 model
2. **Step 2 Testing**: Run standardization with Step 2 model on Step 1 output
3. **Consistency Analysis**: Measure pattern naming consistency and confidence variance
4. **Cost Analysis**: Calculate combined cost per analysis
5. **Latency Analysis**: Measure total time including both phases
6. **Comparison**: Compare against single-model baselines

### 4.3 Mixed Model Implementation Requirements
1. **Phased Analysis Updates**:
   - Support different models for Step 1 and Step 2
   - Pass Step 1 model config and Step 2 model config separately
   - Store both model selections in analysis metadata

2. **Configuration Structure**:
   ```typescript
   interface MixedModelConfig {
     phase1: {
       model: string;
       temperature: number;
       maxTokens: number;
     };
     phase2: {
       model: string;
       temperature: number;
       maxTokens: number;
     };
   }
   ```

3. **Cost Calculation**:
   - Track Step 1 and Step 2 costs separately
   - Calculate total cost per analysis
   - Compare cost efficiency across combinations

### 4.4 Mixed Model Consistency Measurement
Create automated script to measure:
- **Pattern Consistency**: Compare mixed model vs single model consistency
- **Cost Efficiency**: Cost per successful analysis for each combination
- **Latency Performance**: Total time for both phases combined
- **Phase-Specific Metrics**: Individual Step performance analysis
- **Optimal Combination Identification**: Best performing model pairs

### 4.5 Expected Mixed Model Benefits
1. **Cost Optimization**: Use cheaper models for discovery, expensive models for standardization
2. **Latency Optimization**: Match model speed to Step requirements
3. **Quality Optimization**: Use creative models for discovery, rule-following models for standardization
4. **Flexibility**: Different combinations for different use cases (cost vs quality vs speed)

### 4.4 API Latency Instrumentation
**Objective**: Capture accurate LLM API call durations for model comparison

**Implementation Approach**:
1. **Performance Wrapper for LLM Calls**:
   - Instrument `src/services/llm.ts` with high-resolution timing
   - Use `performance.now()` for microsecond precision
   - Handle async operations correctly
   - Account for retry attempts and error handling

2. **Phased Analysis Timing**:
   - Measure individual Step durations:
     - Step 1: Pattern discovery timing
     - Step 2: Pattern standardization timing
   - Track total analysis duration
   - Store timing metadata in analysis results

3. **Timing Data Structure**:
   ```json
   {
     "timing": {
       "phase1DurationMs": 1234,
       "phase2DurationMs": 567,
       "totalDurationMs": 1801,
       "retryCount": 0,
       "networkLatencyMs": 89,
       "processingLatencyMs": 1712
     }
   }
   ```

4. **Enhanced Model Comparison**:
   - Average API latency per model
   - Latency consistency (variance)
   - Latency vs accuracy trade-offs
   - Cost per second analysis

**Success Metrics**:
- Accurate timing data for all API calls
- Latency comparison across models
- Performance regression detection
- Proper handling of retries and failures

## Step 5: Analysis & Optimization

### 5.1 Results Analysis
- [ ] Generate comprehensive consistency reports
- [ ] Compare phased vs single-Step approaches
- [ ] Identify best-performing model combinations
- [ ] Document pattern naming improvements

### 5.2 Optimization Opportunities
- [ ] Fine-tune temperature settings based on results
- [ ] Optimize prompt language for better compliance
- [ ] Implement pattern caching for common patterns
- [ ] Add pattern validation rules

### 5.3 Success Validation
- [ ] Verify >95% pattern name consistency achieved
- [ ] Confirm <0.1 confidence variance for identical patterns
- [ ] Validate pattern recognition accuracy
- [ ] Document performance improvements

## Step 6: Production Rollout

### 6.1 Integration
- [ ] Replace single-Step implementation with phased approach
- [ ] Update configuration for optimal model selection
- [ ] Add user documentation for new approach
- [ ] Update CLI help text if needed

### 6.2 Monitoring
- [ ] Add consistency monitoring to regular operations
- [ ] Create alerts for pattern consistency degradation
- [ ] Track API cost impact
- [ ] Monitor response time increases

## Implementation Timeline

### Week 1: Setup & Baseline
- Days 1-2: Baseline collection and infrastructure setup
- Days 3-5: Prompt development and initial testing

### Week 2: Implementation & Testing
- Days 6-8: Core implementation and basic testing
- Days 9-10: Multi-model testing and analysis

### Week 3: Optimization & Rollout
- Days 11-12: Analysis and optimization
- Days 13-15: Production rollout and monitoring setup

## Risk Mitigation

### Technical Risks
1. **API Cost Increase**: Monitor and optimize, consider selective phasing
2. **Response Time**: Implement parallel processing where possible
3. **Model Availability**: Test multiple models, have fallbacks ready

### Quality Risks
1. **Consistency Degradation**: Comprehensive testing before rollout
2. **Pattern Loss**: Validate pattern completeness in each phase
3. **Confidence Miscalibration**: Implement confidence validation rules

## Success Criteria

### Step 1 Success
- [ ] Baseline data collected and analyzed
- [ ] Current consistency issues quantified
- [ ] Infrastructure and tooling in place

### Step 2 Success
- [ ] Two-Step prompts developed and tested
- [ ] Pattern naming consistency improved in test scenarios
- [ ] Confidence score variance reduced

### Step 3 Success
- [ ] Phased approach implemented and working
- [ ] Multi-model testing completed
- [ ] Optimal model configuration identified

### Overall Success
- [ ] >95% pattern name consistency achieved
- [ ] <0.1 confidence variance for identical patterns
- [ ] Pattern recognition accuracy maintained or improved
- [ ] Solution ready for production use

## Deliverables

1. **Baseline Analysis Report**: Current consistency issues and metrics
2. **Phased Prompts**: Two-Step prompt system with documentation
3. **Implementation**: Working phased analysis system
4. **Testing Results**: Comprehensive multi-model consistency analysis
5. **Production System**: Optimized learn command with improved consistency
6. **Documentation**: User and developer documentation for new approach

## Next Steps

1. **Immediate**: Commit current state and begin baseline collection
2. **Short-term**: Develop and test two-Step prompt system
3. **Medium-term**: Implement and test across multiple models
4. **Long-term**: Optimize and roll out to production

This plan provides a systematic approach to improving pattern consistency while maintaining thorough testing and validation throughout the process.