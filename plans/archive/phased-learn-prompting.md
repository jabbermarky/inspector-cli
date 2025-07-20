Clarifying Questions

1. Current Testing Setup

- Are you currently testing with specific model(s)? Which ones?
  **answer**: I believe all testing has been done with the default model. I tried overriding the learn command on the command line.

- Do you have a standardized test dataset (like the good-drupal.csv) for consistency testing?
  **answer**: I have 4 csv files with known good sites, separated by known CMS.

- How do you want to measure/validate improvements between phases?
  **answer**: pattern naming consistency is most important for clustering; confidence is secondary.

2. Implementation Scope

- Should I focus only on the individual learn command, or also include cross-site analysis and meta-analysis modes?
  **answer**: focus on individual to start.

- Do you want to maintain backward compatibility with existing learn command outputs?
  **answer**: it's not necessary.

- Should the multi-phase approach be transparent to users or involve multiple command invocations?
  **answer**: should be transparent to users; it may be desirable to give progress indication if the prompt is taking a long time.

3. Testing Strategy

- What's your preference for A/B testing between approaches (old vs new prompts)?
  **answer**: we should collect data for existing design and save it, and then compare against it.

- Should we test with multiple models in parallel (GPT-4o, Gemini, etc.) to compare consistency?
  **answer**: yes.

- How many test runs per configuration would be sufficient for consistency measurement?
  **answer**: let's start with the test files I have which is 4 groups of 10. we need don't need every individual one, but we have a good starting base.

4. Success Metrics

- How should we quantify "consistency improvement"? (e.g., % of identical pattern names across same sites, confidence score
  variance, etc.)
  **answer**: suggest something.

- What's an acceptable confidence score variance for the same pattern across different sites?
  **answer**: for known patterns especially where the CMS name is included in the pattern, these should have extremely low variance if any.

- Should we prioritize pattern name consistency or confidence score consistency first?
  **answer**: focus on pattern name consistency first.

5. Rollback Strategy

- If the multi-phase approach doesn't improve consistency, should we have fallback options ready?
  **answer**: we can use git for fallback. may want to do a commit before we start the plan.

- Do you want to preserve the current single-phase approach as a backup option?
  **answer**: it's in git.

Key Assumptions to Confirm

Technical Assumptions

1. API Cost Tolerance: Multi-phase approach will increase API costs (2x calls per analysis) - is this acceptable?
   **answer**: yes. we will optimize later.

2. Response Time: Multi-phase will be slower - what's the maximum acceptable increase?
   **answer**: time increase is acceptable for now. we will optimize later.

3. Intermediate Storage: Pattern Discovery Phase output needs to be stored/passed to Pattern Standardization Phase - temporary storage is acceptable?
   **answer**: yes, temp storage is fine. create a tmp folder

Scope Assumptions

1. Focus on Individual Learn Command: Plan primarily targets single-URL learn analysis first, then extend to batch modes?
   **answer**: I think that we can read a batch of URLs which are individually analyzed first. we dont' need cross-site analysis or meta-analysis yet.

2. Pattern Standardization Priority: Focus on the pattern naming consistency issue before tackling confidence score
   variance?
   **answer**: yes.

3. Model Selection Testing: Plan should include testing multiple models to find the most consistent performer?
   **answer**: yes.

Success Criteria Assumptions

1. Target Consistency: Same pattern should have identical names across 90%+ of detections?
   **answer**: higher.
2. Confidence Variance: Same pattern confidence should vary by <0.1 across similar sites?
   **answer**: yes.
3. Backward Compatibility: Existing analysis storage and display systems should continue working?
   **answer**: not needed.

## Implementation Plan

### Step 1: Baseline Collection and Analysis ✅
1. Collect baseline data from current single-phase implementation
2. Analyze pattern naming inconsistencies and confidence variance
3. Create baseline metrics for comparison

### Step 2: Two-Phase Prompting Implementation ✅
1. Create Pattern Discovery Phase prompt for pattern discovery (temperature 0.2)
2. Create Pattern Standardization Phase prompt for pattern standardization (temperature 0.0)
3. Implement phased analysis workflow
4. Add --phased-analysis flag to learn command

### Step 3: Initial Validation ✅
1. Test phased approach against baseline data
2. Validate pattern consistency improvements
3. Fix pattern naming issues (forbidden suffixes)

### Step 4: Multi-Model Testing ✅
1. Test with multiple models (GPT-4o, GPT-4-turbo, Gemini variants)
2. Compare consistency across models
3. Analyze cost efficiency and success rates
4. **Add accurate API latency measurement**

### Step 4.5: API Latency Instrumentation 🔄
**Objective**: Capture accurate LLM API call durations for model comparison

**Implementation Approach**:
1. **Performance Wrapper for LLM Calls**:
   - Instrument `src/services/llm.ts` with high-resolution timing
   - Use `performance.now()` for microsecond precision
   - Handle async operations correctly
   - Account for retry attempts and error handling

2. **Phased Analysis Timing**:
   - Measure individual phase durations:
     - 1: Pattern discovery timing
     - 2: Pattern standardization timing
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

### Step 5: Analysis & Optimization
1. Fine-tune temperature settings based on results
2. Optimize prompt language for better compliance
3. Implement pattern caching for common patterns
4. Add pattern validation rules

### Step 6: Production Rollout
1. Replace single-phase implementation with phased approach
2. Update configuration and documentation
3. Monitor production performance
4. Implement feedback loop for continuous improvement
