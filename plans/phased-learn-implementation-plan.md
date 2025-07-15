# Phased Learn Prompting Implementation Plan

## Executive Summary

This plan implements a multi-phase approach to improve pattern naming consistency in the learn command. The strategy separates pattern discovery from standardization, uses different temperature settings for each phase, and includes comprehensive testing across multiple models.

## Success Metrics

### Primary Success Metrics
1. **Pattern Name Consistency**: >95% of identical patterns should have identical names across same-CMS sites
2. **Pattern Recognition Accuracy**: Known patterns (especially those with CMS names) should be detected consistently
3. **Confidence Score Variance**: <0.1 variance for identical patterns across similar sites

### Secondary Success Metrics
1. **Pattern Completeness**: Number of unique discriminative patterns identified
2. **Cross-Model Consistency**: Comparison of pattern consistency across different LLM models
3. **Processing Time**: Acceptable performance with 2x API calls

## Phase 1: Baseline Collection & Setup

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
- [ ] Set up progress indication system for multi-phase processing

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

## Phase 2: Two-Phase Prompt Development

### 2.1 Phase 1 Prompt: Pattern Discovery
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

### 2.2 Phase 2 Prompt: Standardization & Formatting
**Objective**: Pattern normalization and consistent naming
**Temperature**: 0.0 (maximum consistency)

#### Key Changes:
- Take Phase 1 output as input
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
- [ ] Draft Phase 1 prompt focusing on discovery
- [ ] Draft Phase 2 prompt focusing on standardization
- [ ] Create prompt validation tests
- [ ] Test prompts with sample data
- [ ] Refine based on initial results

## Phase 3: Implementation

### 3.1 Core Implementation
- [ ] Create `src/learn/phased-analysis.ts` module
- [ ] Implement Phase 1 analysis function
- [ ] Implement Phase 2 standardization function
- [ ] Add intermediate storage handling
- [ ] Add progress indication
- [ ] Update main learn command to use phased approach

### 3.2 Model Provider Support
- [ ] Ensure phased approach works with all model providers
- [ ] Add model-specific optimizations if needed
- [ ] Handle different response formats across providers

### 3.3 Error Handling
- [ ] Phase 1 failure handling
- [ ] Phase 2 failure handling
- [ ] Intermediate storage cleanup
- [ ] Graceful degradation options

## Phase 4: Multi-Model Testing

### 4.1 Model Test Matrix
Test each model with the 4 test CSV files:

| Model | Test Files | Consistency Score | Notes |
|-------|------------|-------------------|--------|
| gpt-4o | All 4 CSVs | TBD | Baseline comparison |
| gpt-4-turbo | All 4 CSVs | TBD | Alternative OpenAI |
| gemini-2.5-flash | All 4 CSVs | TBD | Google option |
| gemini-2.5-pro | All 4 CSVs | TBD | Google premium |

### 4.2 Testing Process
For each model:
1. Run phased analysis on all test sites
2. Generate consistency report
3. Compare against baseline
4. Identify optimal model for consistency

### 4.3 Consistency Measurement Script
Create automated script to measure:
- Pattern name consistency within CMS groups
- Confidence score variance for identical patterns
- Pattern completeness and accuracy
- Cross-model comparison metrics

## Phase 5: Analysis & Optimization

### 5.1 Results Analysis
- [ ] Generate comprehensive consistency reports
- [ ] Compare phased vs single-phase approaches
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

## Phase 6: Production Rollout

### 6.1 Integration
- [ ] Replace single-phase implementation with phased approach
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

### Phase 1 Success
- [ ] Baseline data collected and analyzed
- [ ] Current consistency issues quantified
- [ ] Infrastructure and tooling in place

### Phase 2 Success
- [ ] Two-phase prompts developed and tested
- [ ] Pattern naming consistency improved in test scenarios
- [ ] Confidence score variance reduced

### Phase 3 Success
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
2. **Phased Prompts**: Two-phase prompt system with documentation
3. **Implementation**: Working phased analysis system
4. **Testing Results**: Comprehensive multi-model consistency analysis
5. **Production System**: Optimized learn command with improved consistency
6. **Documentation**: User and developer documentation for new approach

## Next Steps

1. **Immediate**: Commit current state and begin baseline collection
2. **Short-term**: Develop and test two-phase prompt system
3. **Medium-term**: Implement and test across multiple models
4. **Long-term**: Optimize and roll out to production

This plan provides a systematic approach to improving pattern consistency while maintaining thorough testing and validation throughout the process.