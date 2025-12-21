import { useState, useEffect, useRef } from "react";

interface UseViewportVisibilityOptions {
  threshold?: number | number[];
  rootMargin?: string;
}

function useViewportVisibility<T extends HTMLElement>(
  options: UseViewportVisibilityOptions = {}
) {
  const [isVisible, setIsVisible] = useState(true);
  const elementRef = useRef<T>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: options.threshold || 0,
        rootMargin: options.rootMargin || "0px",
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [options.threshold, options.rootMargin]);

  return { elementRef, isVisible };
}

export default useViewportVisibility;
