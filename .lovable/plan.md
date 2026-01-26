

# Fix: Custom Visualizer Loading Shows Fallback Sphere

## Problem Summary

When a custom visualizer is saved and then loaded in the main view, it shows a fallback sphere instead of the correct visualizer. The preview modal works correctly.

## Root Cause

**Data Mismatch Between Save and Load:**

1. **When Saving** (`useCustomVisualizers.ts`):
   - Only saves `{ seed, abstractForm, savedStyle }` to `jsx_code` field
   - Does NOT save the `proceduralConfig` that contains shape/layout/motion info

2. **When Loading** (`CustomVisualizerLoader.tsx`):
   - Parses the JSON and checks: `if (parsed.seed !== undefined && parsed.baseShape)`
   - Since `baseShape` is NOT saved, this check fails
   - Falls through to legacy path: treats JSON as JSX code
   - `DynamicVisualizer` receives JSON like `{"seed":818031383,...}`, fails to compile it as JSX
   - Shows fallback sphere

**Why Preview Works:**
- The preview modal uses `RandomVisualizerTemplate` directly with full `currentParams` (including `proceduralConfig`)
- It never goes through the save/load cycle

## Solution: Regenerate Config from Seed on Load

Since `generateRandomParams(seed)` is **deterministic**, we can regenerate the full config from just the seed. This is more storage-efficient than saving the entire config.

### Changes Required

**File 1: `src/components/visualizers/CustomVisualizerLoader.tsx`**

Update the JSON parsing logic (lines 144-161):

```typescript
// Try to parse jsx_code as config JSON (new system) or use as code (legacy)
if (data.jsx_code) {
  try {
    const parsed = JSON.parse(data.jsx_code);
    
    // NEW: Check for seed-only format (current save format)
    if (parsed.seed !== undefined && !parsed.baseShape) {
      // Regenerate full config from seed (deterministic)
      const regeneratedParams = generateRandomParams(parsed.seed);
      
      // Merge saved style colors if present
      if (parsed.savedStyle) {
        regeneratedParams.savedStyle = parsed.savedStyle;
      }
      
      setConfig(regeneratedParams);
      sessionCache.set(visualizerId, { config: regeneratedParams });
    }
    // EXISTING: Check for full config format (legacy saves)
    else if (parsed.seed !== undefined && parsed.baseShape) {
      setConfig(parsed as RandomVisualizerParams);
      sessionCache.set(visualizerId, { config: parsed });
    } 
    else {
      throw new Error('Not a config object');
    }
  } catch {
    // Legacy system: jsx_code contains actual JSX
    setLegacyCode(data.jsx_code);
    sessionCache.set(visualizerId, { code: data.jsx_code });
  }
}
```

**File 2: Add import** at top of `CustomVisualizerLoader.tsx`:

```typescript
import { generateRandomParams } from '@/lib/randomVisualizerGenerator';
```

### Why This Works

1. The saved data `{"seed":818031383,"savedStyle":{...}}` contains the seed
2. `generateRandomParams(818031383)` regenerates the exact same visualizer config (deterministic)
3. We merge in the `savedStyle` to preserve the user's color choices
4. `RandomVisualizerTemplate` renders the correct visualizer with correct colors

### Verification Steps

After implementing:
1. Generate a custom visualizer in the modal (should preview correctly)
2. Save it
3. Close the modal - main view should show the saved visualizer (not a sphere)
4. Reload the page - visualizer should still load correctly from database
5. The colors should match what was saved

### Optional Enhancement

To further ensure consistency, we could also update the save logic to include a version marker:

```typescript
// In useCustomVisualizers.ts
const minimalParams = {
  version: 2,  // Add version marker
  seed: params.seed,
  savedStyle: params.savedStyle,
};
```

This allows future changes to the save format to be handled gracefully.

