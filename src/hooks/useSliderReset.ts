import { useRef, useCallback } from 'react';

/**
 * DAW-style double-click-to-reset for sliders. Returns an onDoubleClick handler
 * that restores the slider to its default - an explicit `defaultValue` if given,
 * otherwise the value the slider first rendered with.
 */
export function useSliderReset(
  value: number,
  onChange: (v: number) => void,
  defaultValue?: number,
) {
  const initialRef = useRef(value);
  const target = defaultValue !== undefined ? defaultValue : initialRef.current;
  return useCallback(() => onChange(target), [onChange, target]);
}
