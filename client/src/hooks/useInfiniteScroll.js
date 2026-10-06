import { useRef, useCallback } from "react";

/**
 * Returns a ref-callback to attach to a sentinel element.
 * When that element becomes visible the `onIntersect` callback fires.
 */
export default function useInfiniteScroll(
  onIntersect,
  { enabled = true, rootMargin = "300px" } = {},
) {
  const observer = useRef(null);

  const sentinelRef = useCallback(
    (node) => {
      if (observer.current) observer.current.disconnect();
      if (!enabled || !node) return;

      observer.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) onIntersect();
        },
        { rootMargin },
      );
      observer.current.observe(node);
    },
    [onIntersect, enabled, rootMargin],
  );

  return sentinelRef;
}
