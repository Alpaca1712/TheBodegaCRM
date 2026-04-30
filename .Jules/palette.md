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
