## 2025-05-14 - [A11y: Missing Label Associations]
**Learning:** Many form components in the codebase (e.g., LeadForm, AuthForm) use labels but lack explicit 'id' and 'htmlFor' associations, which hinders screen reader accessibility and reduces clickable area.
**Action:** When working on forms, always ensure every input has a unique 'id' and its corresponding label has a matching 'htmlFor'. Use 'aria-describedby' for associated helper text.

## 2025-05-15 - [Reusable Pattern: Sequential Sequential Shortcuts]
**Learning:** Sequential keyboard shortcuts (e.g., 'G' then 'C') provide a powerful way to add many shortcuts without conflicting with standard browser or OS keys. Decoupling the shortcut logic (in a hook) from the action (in a component) using CustomEvents keeps components clean and focused.
**Action:** Use `dispatch(new CustomEvent('toggle-feature'))` in `useGlobalShortcuts` and listen for it in the target component to implement global shortcuts for specific UI elements.

## 2025-05-16 - [UX: Contextual Tooltips for Condensed Tables]
**Learning:** In condensed data tables (like LeadsTable), native 'title' attributes provide a zero-dependency, highly accessible way to surface detailed metadata (e.g., full timestamps, stage descriptions, field definitions) without cluttering the UI or requiring complex popover logic.
**Action:** Use 'title' attributes on status badges and truncated text fields in tables to provide "glanceable" details on hover. Always combine with 'cursor-help' for visual affordance.

## 2025-05-17 - [UX: Context-Aware Empty States]
**Learning:** Generic empty states ("No results") can be frustrating if a user has active filters. Differentiating between "database is empty" and "filters are too restrictive" helps users understand why they see no data and how to fix it.
**Action:** Always pass filter/search state to table components to provide tailored empty state messages.

## 2025-05-18 - [Reusable Pattern: Search Experience]
**Learning:** A great search experience includes a quick focus shortcut (`/`), a visual hint for that shortcut, and an immediate clear button. This reduces friction for the most common navigation and filtering tasks.
**Action:** Implement search inputs with `useRef` for programmatic focus, a `kbd` hint, and a conditional `X` button for rapid reset.

## 2026-05-04 - [A11y: Visible Focus for Hidden Actions]
**Learning:** UX patterns that hide actions until hover (using opacity-0) are inaccessible to keyboard users unless they also include focus:opacity-100. Without this, users tabbing through the interface will encounter invisible focus stops, which is confusing and frustrating.
**Action:** When using hover-to-reveal patterns, always pair 'group-hover:opacity-100' with 'focus:opacity-100' (and proper focus rings) to ensure parity for keyboard and screen reader users.

## 2025-05-19 - [Reusable Pattern: Centralized Copy Functionality]
**Learning:** Consolidating repeated "copy to clipboard" logic into a single, accessible `CopyButton` component ensures consistent styling, keyboard accessibility, and feedback across the app. Using `stopPropagation` and `preventDefault` in the shared component prevents conflicts when nested inside other interactive elements like links or cards.
**Action:** Always reach for the shared `CopyButton` instead of reimplementing clipboard logic. Ensure `focus:opacity-100` is used when the button is hidden by default to maintain keyboard accessibility.

## 2025-05-19 - [Reusable Pattern: Just-in-Time Copy Actions]
**Learning:** A reusable 'CopyButton' component that appears only on hover or focus reduces visual clutter while maintaining high utility. Combining it with 'stopPropagation' prevents accidental navigation when the button is nested in clickable elements like table rows or cards.
**Action:** Implement clipboard actions using a shared 'CopyButton' with icon feedback, sonner toasts, and 'focus:opacity-100' to ensure keyboard accessibility for hidden-by-default elements.

## 2025-05-19 - [Reusable Pattern: Auto-resizing Textareas]
**Learning:** For forms where users enter variable-length content (notes, transcripts, descriptions), static textareas often lead to frustrating scroll-within-scroll experiences. Auto-resizing textareas that grow with content provide a more "document-like" and fluid experience.
**Action:** Use the `autoResize` prop on the shared `Textarea` component for any multi-line input where the content length is unpredictable.

## 2025-05-20 - [A11y: Standardized Form Error Handling]
**Learning:** Combining 'aria-invalid', 'aria-required', and 'aria-describedby' with unique IDs for error messages significantly improves the experience for screen reader users by providing immediate and clear context for form validation failures.
**Action:** When adding validation to forms, always associate inputs with their error message elements using 'aria-describedby' and 'id'.

## 2025-05-20 - [UX: Discoverable Search Shortcuts]
**Learning:** Adding the standard '/' shortcut in addition to 'Cmd+K' and displaying it visually in the UI increases search discoverability for power users. It's critical to exclude shortcut triggers when focus is in input fields.
**Action:** Implement '/' as a secondary search trigger and update UI hints to reflect it. Use 'e.target' checks to prevent interference with typing.

## 2025-05-21 - [A11y: Semantic Active States]
**Learning:** Visual-only active states (e.g. red text for current route) are invisible to screen readers. Using 'aria-current="page"' provides the necessary semantic context to assistive technologies.
**Action:** Always add 'aria-current="page"' to active navigation links in sidebars and bottom bars.

## 2025-05-21 - [A11y: Programmatic Helper Text]
**Learning:** Helper text placed below an input is not automatically read by screen readers when the input is focused. Linking them via 'aria-describedby' ensures the context is available.
**Action:** Use 'aria-describedby' to link inputs to their associated helper text or validation hints.

## 2025-05-21 - [UX: Dynamic Feedback for Async Actions]
**Learning:** Replacing static button text with active progressive labels (e.g., "Draft" to "Drafting...") during background AI processes provides immediate feedback and reduces double-click frustration. Pairing this with a specific 'aria-label' update ensures screen reader users are aware of the state transition.
**Action:** Use an 'isProcessing' state to dynamically update both the button text and its 'aria-label' during long-running tasks.

## 2026-06-11 - [A11y: Robust Dialog Patterns]
**Learning:** For global dialogs (like Keyboard Shortcuts), toggling the open state via a single custom event is more intuitive than having separate 'show'/'hide' events. Pairing this with conditional 'Escape' key listeners and proper ARIA labeling (`aria-labelledby`) ensures a standard-compliant and accessible experience.
**Action:** Implement modal dialogs with `role="dialog"`, `aria-modal="true"`, and `aria-labelledby`. Conditionally register 'Escape' listeners only when the modal is active.
