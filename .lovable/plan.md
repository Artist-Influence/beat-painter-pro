

# Fix: Visualizer Gets Wider & Background Disappears During Recording

## Root Cause

The `RecordingController` calls `gl.setSize(width, height, false)` and `camera.aspect = width/height` during recording. This resizes the **live WebGL canvas** to export dimensions (e.g., 3840x2160), which:

1. **Changes the aspect ratio** of the live preview (visualizer appears wider/distorted)
2. **Overrides the clear color** to solid black (`gl.setClearColor(0x000000, 1)`), hiding the background
3. The user sees these changes because the WebGL canvas is the same element displayed in the UI

## Fix

**Stop resizing the WebGL source canvas entirely.** The 2D export canvas (`exportCanvas`) in `useWebMRecorder` already handles compositing at the target resolution. The `ctx.drawImage(srcCanvas, ...)` call scales the source to fit the export canvas. The source canvas should remain at its UI container size.

### File: `src/components/visualizer/VisualizerCanvas.tsx`

**RecordingController changes:**
- Remove `gl.setSize(width, height, false)` 
- Remove `gl.setPixelRatio(1)`
- Remove `camera.aspect = width / height` and `camera.updateProjectionMatrix()`
- Remove `gl.setClearColor(0x000000, 1)` (the background is handled by the 2D export canvas compositor, not the WebGL clear color)
- Remove the restore logic in `handleRecordingStop` (nothing to restore)
- Keep the event listeners so `onReady` callback still fires (just call it immediately after a couple frames)

The `RecordingController` becomes a simple frame-counter for the `renderReady` gate + a pass-through that calls `onReady`.

### File: `src/hooks/useWebMRecorder.ts`

No changes needed - the render loop already:
- Draws background (color/image/video) on the 2D export canvas
- Draws the WebGL canvas on top with aspect-ratio-aware cropping
- Draws logo overlay
- This pipeline is correct and resolution-independent

### Trade-off

Upscaling from ~800px source to 1080p/4K export loses some sharpness, but the framing, background, and composition will be correct. This is the right surgical fix; high-res export can be revisited later without breaking the user experience.

