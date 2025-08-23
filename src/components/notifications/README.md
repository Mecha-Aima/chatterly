# Badge Notification System

A responsive, accessible notification system for celebrating badge achievements with proper spacing and grid layouts.

## Features

- **Responsive Grid Layout**: Automatically adjusts from 1-4 columns based on screen size and number of badges
- **Proper Spacing**: Generous whitespace and padding following UI best practices
- **Rarity-Based Styling**: Visual indicators and colors based on badge rarity
- **Smooth Animations**: Staggered entrance animations and hover effects
- **Accessibility**: Proper contrast, focus states, and semantic markup

## Usage

### Basic Setup

1. Wrap your app with the NotificationProvider:

```tsx
import { NotificationProvider } from '@/context/NotificationContext';

function App() {
  return (
    <NotificationProvider onViewProfile={() => router.push('/profile')}>
      {/* Your app content */}
    </NotificationProvider>
  );
}
```

### Triggering Notifications

```tsx
import { useBadgeNotifications } from '@/hooks/useBadgeNotifications';
import { useSessionNotifications } from '@/hooks/useSessionNotifications';

function SessionComponent() {
  const { handleSessionComplete } = useSessionNotifications();

  const onSessionComplete = async (sessionData) => {
    // This will show both progress updates and badge notifications
    await handleSessionComplete(sessionData.summary);
  };
}
```

### Manual Badge Notifications

```tsx
import { useNotifications } from '@/context/NotificationContext';

function Component() {
  const { showBadgeNotification } = useNotifications();

  const celebrateBadges = (badges) => {
    showBadgeNotification(badges);
  };
}
```

## Layout Behavior

- **1 Badge**: Centered, max-width 384px
- **2 Badges**: 1 column on mobile, 2 columns on tablet+
- **3 Badges**: 1 column mobile, 2 columns tablet, 3 columns desktop
- **4+ Badges**: 1 column mobile, 2 columns tablet, 3 columns desktop, 4 columns xl screens

## Styling

The component uses:
- Tailwind CSS for responsive design
- CSS Grid for flexible layouts
- Custom animations with staggered delays
- Proper contrast ratios for accessibility
- Hover effects and focus states

## Customization

Badge rarity affects:
- Border colors
- Glow effects
- Rarity indicators (★ ◆ ● ○)
- Gradient backgrounds