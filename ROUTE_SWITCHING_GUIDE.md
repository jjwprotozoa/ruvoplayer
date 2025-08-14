# Ruvo Player Route Switching System

This document explains the new route switching system implemented in Ruvo Player for handling multiple connection routes with automatic fallback and health monitoring.

## Overview

The route switching system provides:

-   **Automatic fallback** from primary to secure routes when ISP blocks or buffering occurs
-   **Manual route selection** for power users
-   **Health monitoring** with real-time status indicators
-   **EPG auto-binding** to ensure guide data matches the active route
-   **Background health checks** with smart switching recommendations

## How It Works

### Route Types

| Route Type             | Description                                        | Use Case                  |
| ---------------------- | -------------------------------------------------- | ------------------------- |
| **Auto (Recommended)** | Automatically selects the best route               | Default for most users    |
| **Primary**            | Direct connection via `http://ruvoplay.online/`    | Fastest when available    |
| **Secure (VPN/CF)**    | CloudFlare-routed via `http://cf.ruvoplay.online/` | Bypasses ISP restrictions |

### URL Structure

The system automatically generates paired URLs:

```typescript
{
  playlist: {
    primary: "http://ruvoplay.online/get.php?username=user&password=pass",
    secure:  "http://cf.ruvoplay.online/get.php?username=user&password=pass"
  },
  epg: {
    primary: "http://ruvoplay.online/xmltv.php?username=user&password=pass",
    secure:  "http://cf.ruvoplay.online/xmltv.php?username=user&password=pass"
  }
}
```

## User Experience

### Automatic Fallback Flow

1. **Primary Route Attempt**: System tries primary route with 3.5s timeout
2. **Health Check**: Validates response contains `#EXTM3U` header
3. **Automatic Fallback**: Switches to secure route if primary fails
4. **User Notification**: Shows "Network optimized (secure route enabled)" toast
5. **EPG Sync**: Automatically updates EPG to match active route

### Settings Interface

Users can access route settings via **Settings → Connection Route**:

-   **Route Selection Dropdown**: Auto/Primary/Secure options with icons
-   **Test Connection Button**: Manual health check with spinner
-   **Health Status Grid**: Real-time status for both routes showing:
    -   Health indicator (✓/✗/?)
    -   Latency in milliseconds
    -   Last checked timestamp
    -   Error messages if any

### Home Screen Health Badge

The home screen displays a connection health badge showing:

-   **Overall status** with color-coded indicators
-   **Route-specific health** (Primary ✓ 45ms, Secure ✗)
-   **Fallback count** for troubleshooting
-   **Hover tooltip** with detailed information

## Technical Implementation

### Core Services

1. **RouteManagerService**: Handles route resolution, probing, and health monitoring
2. **EnhancedPlaylistService**: Integrates route management with playlist loading
3. **RouteSwitcherComponent**: UI for manual route selection and testing
4. **HealthBadgeComponent**: Home screen status indicator

### Auto-Detection Logic

```typescript
async resolveRoute(preference: RouteType): Promise<'primary' | 'secure'> {
  if (preference === 'primary') return 'primary';
  if (preference === 'secure') return 'secure';

  // Auto mode - probe primary first
  const isPrimaryHealthy = await this.probeRoute(primaryUrl);
  return isPrimaryHealthy ? 'primary' : 'secure';
}
```

### Health Monitoring

-   **Probe Method**: HEAD request with 3.5s timeout
-   **Success Criteria**: HTTP 2xx response
-   **Background Checks**: Every 24 hours for route health
-   **Smart Notifications**: Suggests switching back when primary recovers

### Telemetry (Local Only)

The system tracks:

-   `fallbackCount`: Number of automatic fallbacks
-   `primaryFailures`: Primary route failure count
-   `secureUsage`: Secure route usage count
-   `lastFallback`: Timestamp of last fallback

## Integration Points

### Playlist Loading

When a Ruvo Play playlist is loaded:

1. **URL Detection**: Checks if URL contains `ruvoplay.online` or `cf.ruvoplay.online`
2. **Route Config Creation**: Generates primary/secure URL pairs
3. **Route Resolution**: Applies user preference with auto-fallback
4. **EPG Binding**: Loads matching EPG source
5. **Playlist Update**: Updates stored playlist with resolved URL if changed

### Settings Integration

Route preference is stored in user settings:

```typescript
interface Settings {
    // ... existing settings
    routePreference?: RouteType; // 'auto' | 'primary' | 'secure'
}
```

### Translation Support

All UI text is internationalized with keys under `ROUTE.*`:

-   Connection status messages
-   Route type labels
-   Health indicators
-   Notification texts

## Benefits

### For Users

-   **Seamless Experience**: Automatic fallback prevents playlist loading failures
-   **Transparency**: Clear health status and route information
-   **Control**: Manual override for specific network preferences
-   **Reliability**: Background monitoring ensures optimal performance

### For Developers

-   **Modular Design**: Clean separation of concerns
-   **Extensible**: Easy to add new route types or health checks
-   **Observable**: RxJS-based reactive architecture
-   **Type-Safe**: Full TypeScript support with proper interfaces

### For Support

-   **Telemetry**: Local usage statistics for troubleshooting
-   **Health History**: Route performance tracking
-   **User Feedback**: Clear status indicators reduce support tickets
-   **Diagnostics**: Built-in connection testing tools

## Future Enhancements

-   **Geographic routing**: Route selection based on user location
-   **Load balancing**: Distribute traffic across multiple endpoints
-   **Custom endpoints**: Allow users to add their own CDN endpoints
-   **Performance analytics**: Detailed latency and success rate tracking
-   **Predictive switching**: Machine learning for optimal route prediction
