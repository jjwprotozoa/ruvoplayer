import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ResponsiveBreakpoints {
  xs: number;   // 480px - Small mobile
  sm: number;   // 768px - Mobile
  md: number;   // 1024px - Tablet
  lg: number;   // 1200px - Desktop
  xl: number;   // 1440px - Large desktop
  tv: number;   // 1920px - TV and large displays
}

export interface ResponsiveDimensions {
  width: string;
  maxWidth: string;
  height: string;
  maxHeight: string;
  sidebarWidth: string;
  videoHeight: string;
  controlsHeight: string;
  gridColumns: number;
  spacing: string;
  fontSize: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTV: boolean;
}

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTV: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  screenWidth: number;
  screenHeight: number;
  devicePixelRatio: number;
}

@Injectable({
  providedIn: 'root'
})
export class ResponsiveSizingService {
  private readonly breakpoints: ResponsiveBreakpoints = {
    xs: 480,
    sm: 768,
    md: 1024,
    lg: 1200,
    xl: 1440,
    tv: 1920
  };

  private deviceInfoSubject = new BehaviorSubject<DeviceInfo>(this.getCurrentDeviceInfo());
  public deviceInfo$: Observable<DeviceInfo> = this.deviceInfoSubject.asObservable();

  constructor() {
    this.initializeResponsiveService();
  }

  /**
   * Initialize the responsive service with event listeners
   */
  private initializeResponsiveService(): void {
    // Update device info on window resize
    window.addEventListener('resize', () => {
      this.deviceInfoSubject.next(this.getCurrentDeviceInfo());
    });

    // Update device info on orientation change
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.deviceInfoSubject.next(this.getCurrentDeviceInfo());
      }, 100);
    });

    // Initial device info
    this.deviceInfoSubject.next(this.getCurrentDeviceInfo());
  }

  /**
   * Get current device information
   */
  private getCurrentDeviceInfo(): DeviceInfo {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const isPortrait = screenHeight > screenWidth;
    const isLandscape = !isPortrait;

    return {
      isMobile: screenWidth <= this.breakpoints.sm,
      isTablet: screenWidth > this.breakpoints.sm && screenWidth <= this.breakpoints.md,
      isDesktop: screenWidth > this.breakpoints.md && screenWidth < this.breakpoints.tv,
      isTV: screenWidth >= this.breakpoints.tv,
      isPortrait,
      isLandscape,
      screenWidth,
      screenHeight,
      devicePixelRatio: window.devicePixelRatio || 1
    };
  }

  /**
   * Get responsive dimensions for dialogs/modals
   */
  getDialogDimensions(): ResponsiveDimensions {
    const deviceInfo = this.deviceInfoSubject.value;
    
    // Calculate safe height that won't exceed screen boundaries
    const safeHeight = Math.min(deviceInfo.screenHeight * 0.6, deviceInfo.screenHeight - 120); // 60% of screen height or screen height minus 120px padding
    const safeHeightVh = Math.min(60, (safeHeight / deviceInfo.screenHeight) * 100);
    
    if (deviceInfo.isTV) {
      return {
        width: 'auto',
        maxWidth: '1200px',
        height: `${safeHeightVh}vh`,
        maxHeight: `${safeHeightVh + 5}vh`,
        sidebarWidth: '350px',
        videoHeight: `${safeHeightVh - 10}vh`,
        controlsHeight: '60px',
        gridColumns: 6,
        spacing: '30px',
        fontSize: '18px',
        isMobile: false,
        isTablet: false,
        isDesktop: false,
        isTV: true
      };
    }
    
    if (deviceInfo.isDesktop) {
      return {
        width: 'auto',
        maxWidth: '1000px',
        height: `${safeHeightVh}vh`,
        maxHeight: `${safeHeightVh + 5}vh`,
        sidebarWidth: '300px',
        videoHeight: `${safeHeightVh - 10}vh`,
        controlsHeight: '50px',
        gridColumns: 4,
        spacing: '20px',
        fontSize: '16px',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTV: false
      };
    }
    
    if (deviceInfo.isTablet) {
      return {
        width: 'auto',
        maxWidth: '900px',
        height: `${safeHeightVh}vh`,
        maxHeight: `${safeHeightVh + 5}vh`,
        sidebarWidth: '250px',
        videoHeight: `${safeHeightVh - 10}vh`,
        controlsHeight: '45px',
        gridColumns: 3,
        spacing: '15px',
        fontSize: '15px',
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        isTV: false
      };
    }
    
    // Mobile - use more conservative heights
    if (deviceInfo.isPortrait) {
      return {
        width: '95%',
        maxWidth: '100%',
        height: '55vh', // Reduced from 80vh
        maxHeight: '60vh', // Reduced from 85vh
        sidebarWidth: '100%',
        videoHeight: '40vh', // Reduced from 50vh
        controlsHeight: '40px',
        gridColumns: 1,
        spacing: '10px',
        fontSize: '14px',
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isTV: false
      };
    } else {
      return {
        width: '90%',
        maxWidth: '100%',
        height: '60vh', // Reduced from 85vh
        maxHeight: '65vh', // Reduced from 90vh
        sidebarWidth: '100%',
        videoHeight: '50vh', // Reduced from 70vh
        controlsHeight: '40px',
        gridColumns: 2,
        spacing: '10px',
        fontSize: '14px',
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isTV: false
      };
    }
  }

  /**
   * Get responsive dimensions for video-optimized dialogs
   * This sizes the modal to fit the video content with minimal padding
   * and ensures it never exceeds screen boundaries
   */
  getVideoDialogDimensions(): ResponsiveDimensions {
    const deviceInfo = this.deviceInfoSubject.value;
    
    // Calculate safe height that won't exceed screen boundaries
    const safeHeight = Math.min(deviceInfo.screenHeight * 0.65, deviceInfo.screenHeight - 100); // 65% of screen height or screen height minus 100px padding
    const safeHeightVh = Math.min(65, (safeHeight / deviceInfo.screenHeight) * 100);
    
    if (deviceInfo.isTV) {
      return {
        width: 'auto',
        maxWidth: '1400px',
        height: `${safeHeightVh}vh`,
        maxHeight: `${safeHeightVh + 5}vh`,
        sidebarWidth: '350px',
        videoHeight: `${safeHeightVh - 10}vh`,
        controlsHeight: '60px',
        gridColumns: 6,
        spacing: '20px',
        fontSize: '18px',
        isMobile: false,
        isTablet: false,
        isDesktop: false,
        isTV: true
      };
    }
    
    if (deviceInfo.isDesktop) {
      return {
        width: 'auto',
        maxWidth: '1200px',
        height: `${safeHeightVh}vh`,
        maxHeight: `${safeHeightVh + 5}vh`,
        sidebarWidth: '300px',
        videoHeight: `${safeHeightVh - 10}vh`,
        controlsHeight: '50px',
        gridColumns: 4,
        spacing: '15px',
        fontSize: '16px',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTV: false
      };
    }
    
    if (deviceInfo.isTablet) {
      return {
        width: 'auto',
        maxWidth: '1000px',
        height: `${safeHeightVh}vh`,
        maxHeight: `${safeHeightVh + 5}vh`,
        sidebarWidth: '250px',
        videoHeight: `${safeHeightVh - 10}vh`,
        controlsHeight: '45px',
        gridColumns: 3,
        spacing: '12px',
        fontSize: '15px',
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        isTV: false
      };
    }
    
    // Mobile - use more conservative heights
    if (deviceInfo.isPortrait) {
      return {
        width: '98%',
        maxWidth: '100%',
        height: '60vh', // Reduced from 85vh
        maxHeight: '65vh', // Reduced from 90vh
        sidebarWidth: '100%',
        videoHeight: '45vh', // Reduced from 55vh
        controlsHeight: '40px',
        gridColumns: 1,
        spacing: '8px',
        fontSize: '14px',
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isTV: false
      };
    } else {
      return {
        width: '95%',
        maxWidth: '100%',
        height: '65vh', // Reduced from 90vh
        maxHeight: '70vh', // Reduced from 95vh
        sidebarWidth: '100%',
        videoHeight: '55vh', // Reduced from 75vh
        controlsHeight: '40px',
        gridColumns: 2,
        spacing: '8px',
        fontSize: '14px',
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isTV: false
      };
    }
  }

  /**
   * Get responsive dimensions for video players
   */
  getVideoPlayerDimensions(): ResponsiveDimensions {
    const deviceInfo = this.deviceInfoSubject.value;
    
    if (deviceInfo.isTV) {
      return {
        width: '100%',
        maxWidth: '100%',
        height: '70vh',
        maxHeight: '70vh',
        sidebarWidth: '350px',
        videoHeight: '70vh',
        controlsHeight: '60px',
        gridColumns: 6,
        spacing: '30px',
        fontSize: '18px',
        isMobile: false,
        isTablet: false,
        isDesktop: false,
        isTV: true
      };
    }
    
    if (deviceInfo.isDesktop) {
      return {
        width: '100%',
        maxWidth: '100%',
        height: '65vh',
        maxHeight: '65vh',
        sidebarWidth: '300px',
        videoHeight: '65vh',
        controlsHeight: '50px',
        gridColumns: 4,
        spacing: '20px',
        fontSize: '16px',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTV: false
      };
    }
    
    if (deviceInfo.isTablet) {
      return {
        width: '100%',
        maxWidth: '100%',
        height: '60vh',
        maxHeight: '60vh',
        sidebarWidth: '250px',
        videoHeight: '60vh',
        controlsHeight: '45px',
        gridColumns: 3,
        spacing: '15px',
        fontSize: '15px',
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        isTV: false
      };
    }
    
    // Mobile
    if (deviceInfo.isPortrait) {
      return {
        width: '100%',
        maxWidth: '100%',
        height: '50vh',
        maxHeight: '50vh',
        sidebarWidth: '100%',
        videoHeight: '50vh',
        controlsHeight: '40px',
        gridColumns: 1,
        spacing: '10px',
        fontSize: '14px',
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isTV: false
      };
    } else {
      return {
        width: '100%',
        maxWidth: '100%',
        height: '70vh',
        maxHeight: '70vh',
        sidebarWidth: '100%',
        videoHeight: '70vh',
        controlsHeight: '40px',
        gridColumns: 2,
        spacing: '10px',
        fontSize: '14px',
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isTV: false
      };
    }
  }

  /**
   * Get responsive dimensions for live stream layouts
   */
  getLiveStreamDimensions(): ResponsiveDimensions {
    const deviceInfo = this.deviceInfoSubject.value;
    
    if (deviceInfo.isTV) {
      return {
        width: '100%',
        maxWidth: '100%',
        height: '100vh',
        maxHeight: '100vh',
        sidebarWidth: '350px',
        videoHeight: '60vh',
        controlsHeight: '60px',
        gridColumns: 6,
        spacing: '30px',
        fontSize: '18px',
        isMobile: false,
        isTablet: false,
        isDesktop: false,
        isTV: true
      };
    }
    
    if (deviceInfo.isDesktop) {
      return {
        width: '100%',
        maxWidth: '100%',
        height: '100vh',
        maxHeight: '100vh',
        sidebarWidth: '300px',
        videoHeight: '55vh',
        controlsHeight: '50px',
        gridColumns: 4,
        spacing: '20px',
        fontSize: '16px',
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTV: false
      };
    }
    
    if (deviceInfo.isTablet) {
      return {
        width: '100%',
        maxWidth: '100%',
        height: '100vh',
        maxHeight: '100vh',
        sidebarWidth: '250px',
        videoHeight: '50vh',
        controlsHeight: '45px',
        gridColumns: 3,
        spacing: '15px',
        fontSize: '15px',
        isMobile: false,
        isTablet: true,
        isDesktop: false,
        isTV: false
      };
    }
    
    // Mobile
    if (deviceInfo.isPortrait) {
      return {
        width: '100%',
        maxWidth: '100%',
        height: '100vh',
        maxHeight: '100vh',
        sidebarWidth: '100%',
        videoHeight: '45vh',
        controlsHeight: '40px',
        gridColumns: 1,
        spacing: '10px',
        fontSize: '14px',
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isTV: false
      };
    } else {
      return {
        width: '100%',
        maxWidth: '100%',
        height: '100vh',
        maxHeight: '100vh',
        sidebarWidth: '100%',
        videoHeight: '65vh',
        controlsHeight: '40px',
        gridColumns: 2,
        spacing: '10px',
        fontSize: '14px',
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isTV: false
      };
    }
  }

  /**
   * Get responsive grid columns based on screen size
   */
  getGridColumns(): number {
    const deviceInfo = this.deviceInfoSubject.value;
    
    if (deviceInfo.isTV) return 6;
    if (deviceInfo.isDesktop) return 4;
    if (deviceInfo.isTablet) return 3;
    if (deviceInfo.isPortrait) return 1;
    return 2; // Mobile landscape
  }

  /**
   * Get responsive spacing based on screen size
   */
  getSpacing(): string {
    const deviceInfo = this.deviceInfoSubject.value;
    
    if (deviceInfo.isTV) return '30px';
    if (deviceInfo.isDesktop) return '20px';
    if (deviceInfo.isTablet) return '15px';
    return '10px'; // Mobile
  }

  /**
   * Get responsive font size based on screen size
   */
  getFontSize(): string {
    const deviceInfo = this.deviceInfoSubject.value;
    
    if (deviceInfo.isTV) return '18px';
    if (deviceInfo.isDesktop) return '16px';
    if (deviceInfo.isTablet) return '15px';
    return '14px'; // Mobile
  }

  /**
   * Get responsive panel class for dialogs
   */
  getDialogPanelClass(): string {
    const deviceInfo = this.deviceInfoSubject.value;
    
    if (deviceInfo.isTV) return 'tv-dialog';
    if (deviceInfo.isDesktop) return 'desktop-dialog';
    if (deviceInfo.isTablet) return 'tablet-dialog';
    return 'mobile-dialog';
  }

  /**
   * Check if current breakpoint matches the given size
   */
  isBreakpoint(size: keyof ResponsiveBreakpoints): boolean {
    const deviceInfo = this.deviceInfoSubject.value;
    const breakpoint = this.breakpoints[size];
    
    switch (size) {
      case 'xs':
        return deviceInfo.screenWidth <= breakpoint;
      case 'sm':
        return deviceInfo.screenWidth <= breakpoint;
      case 'md':
        return deviceInfo.screenWidth <= breakpoint;
      case 'lg':
        return deviceInfo.screenWidth <= breakpoint;
      case 'xl':
        return deviceInfo.screenWidth <= breakpoint;
      case 'tv':
        return deviceInfo.screenWidth >= breakpoint;
      default:
        return false;
    }
  }

  /**
   * Get CSS custom properties for responsive design
   */
  getCSSCustomProperties(): { [key: string]: string } {
    const dimensions = this.getDialogDimensions();
    
    return {
      '--grid-gap': dimensions.spacing,
      '--card-min-width': dimensions.isMobile ? '150px' : '200px',
      '--card-max-width': dimensions.isMobile ? '200px' : '300px',
      '--sidebar-width': dimensions.sidebarWidth,
      '--header-height': dimensions.isMobile ? '80px' : '100px',
      '--focus-ring-color': '#3f51b5',
      '--focus-ring-width': '3px',
      '--transition-speed': '0.2s',
      '--video-height': dimensions.videoHeight,
      '--controls-height': dimensions.controlsHeight
    };
  }

  /**
   * Get screen-safe dimensions that ensure modal fits within viewport
   */
  getScreenSafeDimensions(): { width: string; height: string; maxWidth: string; maxHeight: string } {
    const deviceInfo = this.deviceInfoSubject.value;
    
    // Calculate maximum safe dimensions
    const maxSafeWidth = Math.min(deviceInfo.screenWidth * 0.9, deviceInfo.screenWidth - 40); // 90% of screen width or screen width minus 40px padding
    const maxSafeHeight = Math.min(deviceInfo.screenHeight * 0.8, deviceInfo.screenHeight - 80); // 80% of screen height or screen height minus 80px padding
    
    // Convert to viewport units for responsive behavior
    const widthVw = Math.min(90, (maxSafeWidth / deviceInfo.screenWidth) * 100);
    const heightVh = Math.min(80, (maxSafeHeight / deviceInfo.screenHeight) * 100);
    
    return {
      width: `${widthVw}vw`,
      height: `${heightVh}vh`,
      maxWidth: `${maxSafeWidth}px`,
      maxHeight: `${maxSafeHeight}px`
    };
  }

  /**
   * Apply responsive CSS custom properties to document root
   */
  applyResponsiveProperties(): void {
    const properties = this.getCSSCustomProperties();
    const root = document.documentElement;
    
    Object.entries(properties).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }
}

