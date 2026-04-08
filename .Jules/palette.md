## 2025-05-14 - [Dynamic ARIA labels for badge buttons]
**Learning:** When adding an `aria-label` to a button that contains a visual badge (e.g., notification unread count), the label overrides the button's children in the accessibility tree. This means screen reader users lose the badge information unless it's explicitly included in the `aria-label`.
**Action:** Use dynamic templates for `aria-label` on buttons with badges, e.g., `aria-label={count > 0 ? \`Notifications, ${count} unread\` : 'Notifications'}`.
