# Ruvo Player - Responsive Design System

This document describes the comprehensive responsive design system imported from [IPTVnator](https://github.com/4gray/iptvnator) and integrated into Ruvo Player.

## 🎯 Overview

The responsive system provides automatic sizing and layout adjustments for:
- **Dialogs and Modals** - Responsive sizing based on screen dimensions
- **Video Players** - Adaptive video container sizing and controls
- **Layouts** - Responsive grids, sidebars, and navigation
- **Components** - Buttons, forms, and interactive elements
- **Typography** - Responsive font sizes and spacing

## 🚀 Quick Start

### 1. Import Responsive Services

```typescript
import { ResponsiveSizingService } from './services/responsive-sizing.service';
import { ResponsiveVideoPlayerService } from './services/responsive-video-player.service';

constructor(
  private responsiveSizingService: ResponsiveSizingService,
  private responsiveVideoPlayerService: ResponsiveVideoPlayerService
) {}
```

### 2. Subscribe to Responsive Changes

```typescript
ngOnInit() {
  // Subscribe to device info changes
  this.responsiveSizingService.deviceInfo$.subscribe(deviceInfo => {
    console.log('Device:', deviceInfo);
  });
  
  // Subscribe to player config changes
  this.responsiveVideoPlayerService.playerConfig$.subscribe(config => {
    console.log('Player config:', config);
  });
}
```

### 3. Use Responsive CSS Classes

```html
<div class="responsive-container">
  <div class="responsive-grid grid-4">
    <div class="responsive-card">Content</div>
  </div>
</div>
```

## 📱 Responsive Breakpoints

| Breakpoint | Screen Width | Device Type | Use Case |
|------------|--------------|-------------|----------|
| `xs` | ≤480px | Small Mobile | Compact layouts |
| `sm` | ≤768px | Mobile | Touch-optimized |
| `md` | ≤1024px | Tablet | Balanced layouts |
| `lg` | ≤1200px | Small Desktop | Standard desktop |
| `xl` | ≤1440px | Large Desktop | Enhanced desktop |
| `tv` | ≥1920px | TV/Large Display | TV navigation |

## 🎮 Device Detection

### Device Information

```typescript
interface DeviceInfo {
  isMobile: boolean;      // ≤768px
  isTablet: boolean;      // 769px - 1024px
  isDesktop: boolean;     // 1025px - 1919px
  isTV: boolean;          // ≥1920px
  isPortrait: boolean;    // Height > Width
  isLandscape: boolean;   // Width > Height
  screenWidth: number;    // Current screen width
  screenHeight: number;   // Current screen height
  devicePixelRatio: number; // Device pixel ratio
}
```

### Usage Examples

```typescript
// Check device type
if (this.deviceInfo.isMobile) {
  // Mobile-specific logic
}

// Check orientation
if (this.deviceInfo.isPortrait) {
  // Portrait layout
}

// Get screen dimensions
const width = this.deviceInfo.screenWidth;
const height = this.deviceInfo.screenHeight;
```

## 🎬 Video Player Responsiveness

### Player Configuration

```typescript
interface VideoPlayerConfig {
  width: string;           // e.g., '100%'
  height: string;          // e.g., '70vh'
  maxWidth: string;        // e.g., '100%'
  maxHeight: string;       // e.g., '70vh'
  aspectRatio: string;     // e.g., '16:9'
  controlsHeight: string;  // e.g., '60px'
  sidebarWidth: string;    // e.g., '350px'
  isFullscreen: boolean;   // Fullscreen state
  isMobile: boolean;       // Mobile device
  isTablet: boolean;       // Tablet device
  isDesktop: boolean;      // Desktop device
  isTV: boolean;           // TV device
}
```

### Responsive Video Container

```html
<div class="responsive-video-container" [ngStyle]="getVideoContainerStyles()">
  <app-video-player [streamUrl]="streamUrl"></app-video-player>
</div>
```

```typescript
getVideoContainerStyles(): { [key: string]: string } {
  const config = this.responsiveVideoPlayerService.getCurrentConfig();
  
  return {
    width: config.width,
    height: config.height,
    maxWidth: config.maxWidth,
    maxHeight: config.maxHeight,
    aspectRatio: config.aspectRatio
  };
}
```

## 🎨 Responsive CSS Classes

### Grid System

```html
<!-- Responsive grid with automatic column adjustment -->
<div class="responsive-grid grid-6">
  <div class="responsive-card">Item 1</div>
  <div class="responsive-card">Item 2</div>
  <!-- Automatically adjusts columns based on screen size -->
</div>
```

### Layout Utilities

```html
<!-- Responsive container with max-width and padding -->
<div class="responsive-container">
  <h1 class="responsive-heading">Title</h1>
  <p class="responsive-text">Content</p>
</div>

<!-- Responsive sidebar -->
<aside class="responsive-sidebar">
  <!-- Sidebar content -->
</aside>

<!-- Responsive header -->
<header class="responsive-header">
  <!-- Header content -->
</header>
```

### Component Utilities

```html
<!-- Responsive button with touch-friendly sizing -->
<button class="responsive-button">
  <mat-icon>play</mat-icon>
  <span class="responsive-text">Play</span>
</button>

<!-- Responsive input field -->
<input class="responsive-input" type="text" placeholder="Enter text">

<!-- Responsive card with hover effects -->
<div class="responsive-card responsive-hover">
  <h3 class="responsive-heading">Card Title</h3>
  <p class="responsive-text">Card content</p>
</div>
```

### Navigation Utilities

```html
<!-- Responsive navigation -->
<nav class="responsive-nav">
  <a href="#" class="responsive-button">Home</a>
  <a href="#" class="responsive-button">About</a>
  <a href="#" class="responsive-button">Contact</a>
</nav>

<!-- Mobile menu toggle -->
<button class="responsive-menu-toggle" (click)="toggleMenu()">
  <mat-icon>menu</mat-icon>
</button>
```

## 🎯 Responsive Services

### ResponsiveSizingService

Provides responsive dimensions and device information.

```typescript
// Get dialog dimensions
const dialogDims = this.responsiveSizingService.getDialogDimensions();

// Get video player dimensions
const videoDims = this.responsiveSizingService.getVideoPlayerDimensions();

// Get live stream dimensions
const liveDims = this.responsiveSizingService.getLiveStreamDimensions();

// Get grid columns
const columns = this.responsiveSizingService.getGridColumns();

// Get spacing
const spacing = this.responsiveSizingService.getSpacing();

// Get font size
const fontSize = this.responsiveSizingService.getFontSize();

// Get dialog panel class
const panelClass = this.responsiveSizingService.getDialogPanelClass();

// Check breakpoint
const isMobile = this.responsiveSizingService.isBreakpoint('sm');

// Apply CSS custom properties
this.responsiveSizingService.applyResponsiveProperties();
```

### ResponsiveVideoPlayerService

Provides responsive video player configuration and utilities.

```typescript
// Get current player configuration
const config = this.responsiveVideoPlayerService.getCurrentConfig();

// Get player dimensions for specific type
const dims = this.responsiveVideoPlayerService.getPlayerDimensions('videojs');

// Get responsive CSS
const css = this.responsiveVideoPlayerService.getVideoPlayerCSS();

// Get sidebar configuration
const sidebarConfig = this.responsiveVideoPlayerService.getSidebarConfig();

// Get grid configuration
const gridConfig = this.responsiveVideoPlayerService.getGridConfig();

// Get typography configuration
const typographyConfig = this.responsiveVideoPlayerService.getTypographyConfig();

// Get spacing configuration
const spacingConfig = this.responsiveVideoPlayerService.getSpacingConfig();

// Get control configuration
const controlConfig = this.responsiveVideoPlayerService.getControlConfig();

// Apply configuration to element
this.responsiveVideoPlayerService.applyToElement(element);

// Get breakpoint information
const breakpointInfo = this.responsiveVideoPlayerService.getBreakpointInfo();

// Check specific breakpoint
const isTV = this.responsiveVideoPlayerService.isBreakpoint('tv');

// Get use case configuration
const dialogConfig = this.responsiveVideoPlayerService.getUseCaseConfig('dialog');
```

## 🎨 SCSS Mixins and Utilities

### Responsive Mixins

```scss
// Responsive breakpoint mixin
@include respond-to("mobile") {
  .mobile-only {
    display: block;
  }
}

// Responsive text mixin
.responsive-title {
  @include responsive-text(18, 32);
}

// Responsive spacing mixin
.responsive-section {
  @include responsive-spacing(padding, 20, 40);
}

// Touch-friendly target mixin
.touch-button {
  @include touch-target(44px);
}
```

### CSS Custom Properties

The system automatically sets CSS custom properties based on screen size:

```css
:root {
  --grid-gap: 20px;
  --card-min-width: 200px;
  --card-max-width: 300px;
  --sidebar-width: 300px;
  --header-height: 100px;
  --focus-ring-color: #3f51b5;
  --focus-ring-width: 3px;
  --transition-speed: 0.2s;
  --video-height: 65vh;
  --controls-height: 50px;
}
```

## 🔧 Integration Examples

### Dialog Component

```typescript
@Component({
  selector: 'app-responsive-dialog',
  template: `
    <div [class]="getResponsiveClasses()">
      <h2 mat-dialog-title class="responsive-heading">{{ title }}</h2>
      <mat-dialog-content class="responsive-spacing">
        <div class="responsive-video-container" [ngStyle]="getVideoStyles()">
          <app-video-player [streamUrl]="streamUrl"></app-video-player>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions class="responsive-nav">
        <button class="responsive-button" (click)="close()">
          <span class="responsive-text">Close</span>
        </button>
      </mat-dialog-actions>
    </div>
  `
})
export class ResponsiveDialogComponent implements OnInit {
  deviceInfo: DeviceInfo;
  playerConfig: VideoPlayerConfig;

  constructor(
    private responsiveSizingService: ResponsiveSizingService,
    private responsiveVideoPlayerService: ResponsiveVideoPlayerService
  ) {}

  ngOnInit() {
    // Subscribe to responsive changes
    this.responsiveSizingService.deviceInfo$.subscribe(
      deviceInfo => this.deviceInfo = deviceInfo
    );
    
    this.responsiveVideoPlayerService.playerConfig$.subscribe(
      config => this.playerConfig = config
    );
  }

  getResponsiveClasses(): string {
    const classes = ['responsive-dialog'];
    
    if (this.deviceInfo?.isTV) classes.push('tv-layout');
    else if (this.deviceInfo?.isMobile) classes.push('mobile-layout');
    
    return classes.join(' ');
  }

  getVideoStyles(): { [key: string]: string } {
    if (!this.playerConfig) return {};
    
    return {
      width: this.playerConfig.width,
      height: this.playerConfig.height,
      maxHeight: this.playerConfig.maxHeight
    };
  }
}
```

### Layout Component

```typescript
@Component({
  selector: 'app-responsive-layout',
  template: `
    <div class="responsive-container">
      <header class="responsive-header">
        <h1 class="responsive-heading">{{ title }}</h1>
      </header>
      
      <div class="responsive-flex flex-row">
        <aside class="responsive-sidebar">
          <nav class="responsive-nav">
            <a href="#" class="responsive-button">Menu Item</a>
          </nav>
        </aside>
        
        <main class="responsive-content">
          <div class="responsive-grid grid-4">
            <div class="responsive-card" *ngFor="let item of items">
              <h3 class="responsive-heading">{{ item.title }}</h3>
              <p class="responsive-text">{{ item.description }}</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  `
})
export class ResponsiveLayoutComponent {
  // Component logic
}
```

## 🎯 Best Practices

### 1. Mobile-First Design
- Start with mobile layouts and enhance for larger screens
- Use responsive utilities to scale up, not down

### 2. Touch-Friendly Targets
- Ensure all interactive elements meet minimum 44px touch target
- Use `responsive-button` and `responsive-input` classes

### 3. Progressive Enhancement
- Provide basic functionality for all devices
- Add advanced features for larger screens

### 4. Performance Considerations
- Use CSS transforms and opacity for animations
- Avoid layout-triggering properties in animations

### 5. Accessibility
- Maintain proper focus management
- Use semantic HTML elements
- Provide screen reader support

## 🧪 Testing

### Device Testing
- Test on various screen sizes and orientations
- Verify touch interactions on mobile devices
- Check TV navigation with remote controls

### Browser Testing
- Test across different browsers
- Verify responsive behavior in dev tools
- Check print styles

### Accessibility Testing
- Test keyboard navigation
- Verify screen reader compatibility
- Check high contrast mode support

## 📚 Additional Resources

- [IPTVnator Repository](https://github.com/4gray/iptvnator)
- [Material Design Responsive Guidelines](https://material.io/design/layout/responsive-layout-grid.html)
- [CSS Grid Layout Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout)
- [Responsive Images](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)

## 🤝 Contributing

When adding new responsive features:

1. Follow the existing breakpoint system
2. Use the provided mixins and utilities
3. Test across all device sizes
4. Maintain accessibility standards
5. Update this documentation

## 📄 License

This responsive system is based on IPTVnator's implementation and follows the same MIT license.
