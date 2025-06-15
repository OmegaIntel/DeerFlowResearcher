# Research Flow Fixes Summary

## Issues Fixed

### 1. Investigation Toggle Not Triggering Research Flow
**Problem**: When Investigation toggle was ON, it wasn't triggering the research flow.
**Fix**: Modified `store.ts` to check `settings.enableBackgroundInvestigation` when deciding whether to use research flow or simple chat.

### 2. @research Not Executing Actual Research
**Problem**: Planner was setting `has_enough_context: true` when background investigation provided results, causing the flow to skip research tools.
**Fix**: Updated `planner.md` prompt to explicitly state that background investigation is preliminary only and should never be considered sufficient for research.

### 3. "Great! What would you like to discuss..." Error
**Problem**: When accepting a research plan, the frontend was sending a greeting message instead of continuing the research flow.
**Fix**: Modified `PlanCard` component to send an empty message with `interruptFeedback: "accepted"` instead of a greeting.

### 4. "It seems like you haven't entered any text..." Error
**Problem**: Backend was treating empty messages as new chat requests even when `interrupt_feedback` was present.
**Fix**: 
- Updated `_handle_research_query` to not create new messages when `interrupt_feedback` is present
- Fixed `_astream_workflow_generator` to handle empty content properly
- Updated TypeScript types to include `toolId` and `toolType` in `onSendMessage`

## Files Modified

1. **web/src/core/store/store.ts**
   - Added logic to trigger research flow when Investigation toggle is ON
   - Fixed to not create user messages for empty strings

2. **src/prompts/planner.md**
   - Added explicit instructions about background investigation being preliminary only
   - Ensured planner never sets `has_enough_context: true` for research tasks

3. **web/src/app/chat/components/message-list-view.tsx**
   - Fixed `PlanCard` to send empty message with interrupt feedback
   - Updated TypeScript types for `onSendMessage`

4. **src/server/app.py**
   - Fixed `_handle_research_query` to handle interrupt feedback properly
   - Fixed `_astream_workflow_generator` to handle empty messages

## Test Results
- ✅ Investigation toggle correctly triggers research flow
- ✅ @research queries execute actual research with tools (web_search, etc.)
- ✅ Plan acceptance continues research flow without errors
- ✅ Complete research flow executes successfully with multiple agents and tools