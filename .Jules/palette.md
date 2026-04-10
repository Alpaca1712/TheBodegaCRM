## 2025-10-10 - [Accessible Notification Badges]
**Learning:** For notification buttons with visual badges, use a dynamic `aria-label` (e.g., `aria-label={count > 0 ? \`Notifications, ${count} unread\` : 'Notifications'}`) instead of just hiding the badge from screen readers. This provides the same context to screen reader users that visual users get from the badge.
**Action:** Always implement dynamic `aria-label` attributes on components with notification badges or similar indicators.
