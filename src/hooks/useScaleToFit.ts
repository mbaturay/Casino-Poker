import { useEffect, useMemo, useRef, useState } from "react";

export function useScaleToFit(baseWidth: number, baseHeight: number) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let ro: ResizeObserver | null = null;
    const update = () => {
      // Use client sizes (exclude scrollbars)
      setSize({ w: el.clientWidth, h: el.clientHeight });
    };
    update();
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => update());
      ro.observe(el);
    } else {
      // Fallback in older browsers
      const onResize = () => update();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }
    return () => { ro?.disconnect(); };
  }, []);

  const scale = useMemo(() => {
    if (size.w <= 0 || size.h <= 0) return 1;
    const sx = size.w / baseWidth;
    const sy = size.h / baseHeight;
    return Math.min(sx, sy);
  }, [size, baseWidth, baseHeight]);

  // Outer dimensions to reserve the scaled footprint in layout to avoid scrollbars/overflow
  const outer = useMemo(() => ({
    width: Math.max(0, Math.floor(baseWidth * scale)),
    height: Math.max(0, Math.floor(baseHeight * scale)),
  }), [baseWidth, baseHeight, scale]);

  return { containerRef, scale, outer } as const;
}

export default useScaleToFit;
