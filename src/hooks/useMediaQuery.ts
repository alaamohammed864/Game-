import { useState, useEffect } from 'react';

/**
 * useMediaQuery hook: Evaluates a CSS media query and listens for changes
 * @param query CSS media query string, e.g. '(max-width: 767px)'
 * @returns boolean indicating whether the media query matches
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    const updateMatch = () => setMatches(mediaQueryList.matches);

    // Initial check
    updateMatch();

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', updateMatch);
      return () => mediaQueryList.removeEventListener('change', updateMatch);
    } else if (typeof (mediaQueryList as any).addListener === 'function') {
      // Fallback for older browsers
      (mediaQueryList as any).addListener(updateMatch);
      return () => (mediaQueryList as any).removeListener(updateMatch);
    }
  }, [query]);

  return matches;
}

export type DeviceCategory = 'mobile' | 'tablet' | 'desktop';

export interface DeviceCategoryInfo {
  category: DeviceCategory;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  isLandscape: boolean;
  prefersReducedMotion: boolean;
}

/**
 * useDeviceCategory hook: Dynamically detects device categories (Mobile, Tablet, Desktop)
 * using useMediaQuery based on responsive screen width breakpoints.
 */
export function useDeviceCategory(): DeviceCategoryInfo {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');
  const isLargeDesktop = useMediaQuery('(min-width: 1440px)');
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  let category: DeviceCategory = 'desktop';
  if (isMobile) {
    category = 'mobile';
  } else if (isTablet) {
    category = 'tablet';
  }

  return {
    category,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isLandscape,
    prefersReducedMotion
  };
}
