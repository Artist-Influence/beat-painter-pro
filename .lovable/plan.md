

## Remove Debug Overlay from Export

The yellow debug text ("canvas id:", "src:", "export:", "ready:") is rendered onto every exported frame in `useWebMRecorder.ts` (dev-only block). The user wants it removed.

### Change

**File: `src/hooks/useWebMRecorder.ts`**

Remove the debug overlay block (lines ~267-278) that draws `ctx.fillText` with canvas ID, dimensions, and ready state onto the export canvas during the render loop.

