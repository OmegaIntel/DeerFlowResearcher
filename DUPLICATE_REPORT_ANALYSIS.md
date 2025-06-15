# Duplicate Report Analysis

## Investigation Summary

After investigating the "duplicate report" issue, here's what I found:

### Key Findings

1. **Reporter is invoked only once**: The test confirms that the reporter node is called exactly once per research flow, as expected.

2. **Streaming behavior is normal**: What appears as "duplicate messages" in the logs are actually streaming chunks of the same message. Each chunk has the same message ID but contains progressive content as the report is being generated.

3. **Backend streaming configuration**: I changed the `stream_mode` from `["messages", "updates", "values"]` to `["messages"]` to reduce redundant events, but the streaming chunks are still normal and expected.

### Test Results

```
=== Testing Reporter Invocations ===
...
5. Final Analysis:
   - Total unique reporter starts: 1
   - Total unique reporter ends: 1

✅ SUCCESS: Reporter was invoked exactly once as expected.
```

### Possible Causes of Perceived Duplication

If users are still seeing duplicate reports in the UI, it could be due to:

1. **Frontend rendering issues**: The UI might be rendering the same report multiple times due to state management issues
2. **Multiple research triggers**: Users might be accidentally triggering multiple research flows
3. **UI refresh/re-render**: The report might appear to duplicate during UI updates

### Recommendations

1. **Monitor frontend state**: Check if the ResearchCard component is being rendered multiple times
2. **Add deduplication**: Ensure the frontend deduplicates messages by ID before rendering
3. **User feedback**: Get more specific details about when/how users see duplicate reports

The backend is working correctly - the reporter is only generating one report per research flow.