## 2026-04-07 - [Missing ARIA labels on mobile icon-only buttons]
**Learning:** Layout components like `Header` often contain responsive buttons that switch between text+icon (on desktop) and icon-only (on mobile). While the desktop version might be naturally accessible through its text content, the mobile version is frequently overlooked and lacks necessary ARIA labels.
**Action:** Always check the `md:hidden` or similar responsive variants of buttons to ensure they have descriptive `aria-label` attributes when they collapse into icon-only states.
