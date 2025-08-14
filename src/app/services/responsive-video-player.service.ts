import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ResponsiveSizingService, ResponsiveDimensions } from './responsive-sizing.service';

export interface VideoPlayerConfig {
  width: string;
  height: string;
  maxWidth: string;
  maxHeight: string;
  aspectRatio: string;
  controlsHeight: string;
  sidebarWidth: string;
  isFullscreen: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTV: boolean;
}

export interface PlayerBreakpoint {
  minWidth: number;
  maxWidth: number;
  name: string;
  config: Partial<VideoPlayerConfig>;
}

@Injectable({
  providedIn: 'root'
})
export class ResponsiveVideoPlayerService {
  private playerConfigSubject = new BehaviorSubject<VideoPlayerConfig>(this.getDefaultConfig());
  public playerConfig$: Observable<VideoPlayerConfig> = this.playerConfigSubject.asObservable();

  private readonly breakpoints: PlayerBreakpoint[] = [
    {
      minWidth: 1920,
      maxWidth: Infinity,
      name: 'tv',
      config: {
        width: '100%',
        height: '70vh',
        maxHeight: '70vh',
        controlsHeight: '60px',
        sidebarWidth: '350px',
        aspectRatio: '16:9'
      }
    },
    {
      minWidth: 1024,
      maxWidth: 1919,
      name: 'desktop',
      config: {
        width: '100%',
        height: '65vh',
        maxHeight: '65vh',
        controlsHeight: '50px',
        sidebarWidth: '300px',
        aspectRatio: '16:9'
      }
    },
    {
      minWidth: 768,
      maxWidth: 1023,
      name: 'tablet',
      config: {
        width: '100%',
        height: '60vh',
        maxHeight: '60vh',
        controlsHeight: '45px',
        sidebarWidth: '250px',
        aspectRatio: '16:9'
      }
    },
    {
      minWidth: 480,
      maxWidth: 767,
      name: 'mobile',
      config: {
        width: '100%',
        height: '50vh',
        maxHeight: '50vh',
        controlsHeight: '40px',
        sidebarWidth: '100%',
        aspectRatio: '16:9'
      }
    },
    {
      minWidth: 0,
      maxWidth: 479,
      name: 'small-mobile',
      config: {
        width: '100%',
        height: '45vh',
        maxHeight: '45vh',
        controlsHeight: '40px',
        sidebarWidth: '100%',
        aspectRatio: '16:9'
      }
    }
  ];

  constructor(private responsiveSizingService: ResponsiveSizingService) {
    this.initializeService();
  }

  /**
   * Initialize the service with event listeners
   */
  private initializeService(): void {
    // Update config on window resize
    window.addEventListener('resize', () => {
      this.updatePlayerConfig();
    });

    // Update config on orientation change
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.updatePlayerConfig();
      }, 100);
    });

    // Initial config
    this.updatePlayerConfig();
  }

  /**
   * Get default player configuration
   */
  private getDefaultConfig(): VideoPlayerConfig {
    return {
      width: '100%',
      height: '60vh',
      maxWidth: '100%',
      maxHeight: '60vh',
      aspectRatio: '16:9',
      controlsHeight: '50px',
      sidebarWidth: '300px',
      isFullscreen: false,
      isMobile: false,
      isTablet: false,
      isDesktop: false,
      isTV: false
    };
  }

  /**
   * Update player configuration based on current screen size
   */
  private updatePlayerConfig(): void {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const isPortrait = screenHeight > screenWidth;
    
    // Find matching breakpoint
    const breakpoint = this.breakpoints.find(bp => 
      screenWidth >= bp.minWidth && screenWidth <= bp.maxWidth
    ) || this.breakpoints[2]; // Default to tablet

    // Get responsive dimensions
    const responsiveDims = this.responsiveSizingService.getVideoPlayerDimensions();
    
    // Create new config
    const newConfig: VideoPlayerConfig = {
      ...this.getDefaultConfig(),
      ...breakpoint.config,
      maxWidth: '100%',
      isMobile: screenWidth <= 768,
      isTablet: screenWidth > 768 && screenWidth <= 1024,
      isDesktop: screenWidth > 1024 && screenWidth < 1920,
      isTV: screenWidth >= 1920
    };

    // Adjust for orientation
    if (isPortrait && newConfig.isMobile) {
      newConfig.height = '50vh';
      newConfig.maxHeight = '50vh';
      newConfig.sidebarWidth = '100%';
    }

    this.playerConfigSubject.next(newConfig);
  }

  /**
   * Get current player configuration
   */
  getCurrentConfig(): VideoPlayerConfig {
    return this.playerConfigSubject.value;
  }

  /**
   * Get responsive dimensions for specific player type
   */
  getPlayerDimensions(playerType: 'videojs' | 'html5' | 'artplayer' | 'dplayer'): ResponsiveDimensions {
    const config = this.getCurrentConfig();
    const responsiveDims = this.responsiveSizingService.getVideoPlayerDimensions();
    
    return {
      ...responsiveDims,
      width: config.width,
      height: config.height,
      maxWidth: config.maxWidth,
      maxHeight: config.maxHeight
    };
  }

  /**
   * Get responsive CSS for video players
   */
  getVideoPlayerCSS(): string {
    const config = this.getCurrentConfig();
    
    return `
      .responsive-video-player {
        width: ${config.width};
        height: ${config.height};
        max-width: ${config.maxWidth};
        max-height: ${config.maxHeight};
        aspect-ratio: ${config.aspectRatio};
      }
      
      .responsive-video-player video,
      .responsive-video-player .video-js,
      .responsive-video-player .art-video-player {
        width: 100% !important;
        height: 100% !important;
        max-height: ${config.maxHeight} !important;
        object-fit: contain;
      }
      
      .responsive-video-player .vjs-control-bar {
        height: ${config.controlsHeight};
      }
      
      .responsive-video-player .art-controls {
        height: ${config.controlsHeight};
      }
      
      .responsive-video-player .dplayer-controller {
        height: ${config.controlsHeight};
      }
    `;
  }

  /**
   * Get responsive sidebar configuration
   */
  getSidebarConfig(): { width: string; isCollapsible: boolean; isOverlay: boolean } {
    const config = this.getCurrentConfig();
    
    if (config.isMobile) {
      return {
        width: '100%',
        isCollapsible: true,
        isOverlay: true
      };
    }
    
    if (config.isTablet) {
      return {
        width: config.sidebarWidth,
        isCollapsible: true,
        isOverlay: false
      };
    }
    
    return {
      width: config.sidebarWidth,
      isCollapsible: false,
      isOverlay: false
    };
  }

  /**
   * Get responsive grid configuration
   */
  getGridConfig(): { columns: number; gap: string; itemMinWidth: string } {
    const config = this.getCurrentConfig();
    
    if (config.isTV) {
      return {
        columns: 6,
        gap: '30px',
        itemMinWidth: '250px'
      };
    }
    
    if (config.isDesktop) {
      return {
        columns: 4,
        gap: '20px',
        itemMinWidth: '200px'
      };
    }
    
    if (config.isTablet) {
      return {
        columns: 3,
        gap: '15px',
        itemMinWidth: '180px'
      };
    }
    
    if (config.isMobile) {
      return {
        columns: 1,
        gap: '10px',
        itemMinWidth: '150px'
      };
    }
    
    return {
      columns: 2,
      gap: '10px',
      itemMinWidth: '150px'
    };
  }

  /**
   * Get responsive typography configuration
   */
  getTypographyConfig(): { fontSize: string; lineHeight: string; fontWeight: string } {
    const config = this.getCurrentConfig();
    
    if (config.isTV) {
      return {
        fontSize: '18px',
        lineHeight: '1.6',
        fontWeight: '500'
      };
    }
    
    if (config.isDesktop) {
      return {
        fontSize: '16px',
        lineHeight: '1.5',
        fontWeight: '400'
      };
    }
    
    if (config.isTablet) {
      return {
        fontSize: '15px',
        lineHeight: '1.4',
        fontWeight: '400'
      };
    }
    
    return {
      fontSize: '14px',
      lineHeight: '1.3',
      fontWeight: '400'
    };
  }

  /**
   * Get responsive spacing configuration
   */
  getSpacingConfig(): { padding: string; margin: string; gap: string } {
    const config = this.getCurrentConfig();
    
    if (config.isTV) {
      return {
        padding: '30px',
        margin: '30px',
        gap: '30px'
      };
    }
    
    if (config.isDesktop) {
      return {
        padding: '20px',
        margin: '20px',
        gap: '20px'
      };
    }
    
    if (config.isTablet) {
      return {
        padding: '15px',
        margin: '15px',
        gap: '15px'
      };
    }
    
    return {
      padding: '10px',
      margin: '10px',
      gap: '10px'
    };
  }

  /**
   * Get responsive control configuration
   */
  getControlConfig(): { 
    buttonSize: string; 
    iconSize: string; 
    touchTarget: string;
    focusRing: string;
  } {
    const config = this.getCurrentConfig();
    
    if (config.isTV) {
      return {
        buttonSize: '50px',
        iconSize: '28px',
        touchTarget: '60px',
        focusRing: '3px solid #3f51b5'
      };
    }
    
    if (config.isDesktop) {
      return {
        buttonSize: '45px',
        iconSize: '24px',
        touchTarget: '50px',
        focusRing: '3px solid #3f51b5'
      };
    }
    
    if (config.isTablet) {
      return {
        buttonSize: '42px',
        iconSize: '22px',
        touchTarget: '44px',
        focusRing: '2px solid #3f51b5'
      };
    }
    
    return {
      buttonSize: '44px',
      iconSize: '20px',
      touchTarget: '44px',
      focusRing: '2px solid #3f51b5'
    };
  }

  /**
   * Apply responsive configuration to a video player element
   */
  applyToElement(element: HTMLElement): void {
    const config = this.getCurrentConfig();
    const controlConfig = this.getControlConfig();
    
    // Apply basic sizing
    element.style.width = config.width;
    element.style.height = config.height;
    element.style.maxWidth = config.maxWidth;
    element.style.maxHeight = config.maxHeight;
    
    // Apply aspect ratio
    element.style.aspectRatio = config.aspectRatio;
    
    // Apply responsive classes
    element.classList.remove('tv-player', 'desktop-player', 'tablet-player', 'mobile-player');
    
    if (config.isTV) {
      element.classList.add('tv-player');
    } else if (config.isDesktop) {
      element.classList.add('desktop-player');
    } else if (config.isTablet) {
      element.classList.add('tablet-player');
    } else {
      element.classList.add('mobile-player');
    }
    
    // Apply CSS custom properties
    element.style.setProperty('--controls-height', config.controlsHeight);
    element.style.setProperty('--sidebar-width', config.sidebarWidth);
    element.style.setProperty('--button-size', controlConfig.buttonSize);
    element.style.setProperty('--icon-size', controlConfig.iconSize);
    element.style.setProperty('--touch-target', controlConfig.touchTarget);
    element.style.setProperty('--focus-ring', controlConfig.focusRing);
  }

  /**
   * Get responsive breakpoint information
   */
  getBreakpointInfo(): { current: string; all: PlayerBreakpoint[] } {
    const config = this.getCurrentConfig();
    let current = 'unknown';
    
    if (config.isTV) current = 'tv';
    else if (config.isDesktop) current = 'desktop';
    else if (config.isTablet) current = 'tablet';
    else if (config.isMobile) current = 'mobile';
    
    return {
      current,
      all: this.breakpoints
    };
  }

  /**
   * Check if current configuration matches a specific breakpoint
   */
  isBreakpoint(breakpointName: string): boolean {
    const breakpointInfo = this.getBreakpointInfo();
    return breakpointInfo.current === breakpointName;
  }

  /**
   * Get responsive configuration for a specific use case
   */
  getUseCaseConfig(useCase: 'dialog' | 'fullscreen' | 'embedded' | 'sidebar'): VideoPlayerConfig {
    const baseConfig = this.getCurrentConfig();
    
    switch (useCase) {
      case 'dialog':
        return {
          ...baseConfig,
          height: '60vh',
          maxHeight: '70vh',
          isFullscreen: false
        };
        
      case 'fullscreen':
        return {
          ...baseConfig,
          width: '100vw',
          height: '100vh',
          maxWidth: '100vw',
          maxHeight: '100vh',
          isFullscreen: true
        };
        
      case 'embedded':
        return {
          ...baseConfig,
          height: '40vh',
          maxHeight: '50vh',
          isFullscreen: false
        };
        
      case 'sidebar':
        return {
          ...baseConfig,
          width: '100%',
          height: '30vh',
          maxHeight: '40vh',
          isFullscreen: false
        };
        
      default:
        return baseConfig;
    }
  }
}

