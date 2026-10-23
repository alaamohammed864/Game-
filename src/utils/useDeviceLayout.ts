export { useMediaQuery, useDeviceCategory } from '../hooks/useMediaQuery';
export type { DeviceCategory, DeviceCategoryInfo } from '../hooks/useMediaQuery';

import { useDeviceCategory } from '../hooks/useMediaQuery';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface DeviceLayoutInfo {
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  isLandscape: boolean;
  prefersReducedMotion: boolean;
}

export function useDeviceLayout(): DeviceLayoutInfo {
  const { category, isMobile, isTablet, isDesktop, isLargeDesktop, isLandscape, prefersReducedMotion } = useDeviceCategory();

  return {
    deviceType: category,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isLandscape,
    prefersReducedMotion
  };
}
