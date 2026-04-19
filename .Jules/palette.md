## 2025-05-14 - [A11y: Missing Label Associations]
**Learning:** Many form components in the codebase (e.g., LeadForm, AuthForm) use labels but lack explicit 'id' and 'htmlFor' associations, which hinders screen reader accessibility and reduces clickable area.
**Action:** When working on forms, always ensure every input has a unique 'id' and its corresponding label has a matching 'htmlFor'. Use 'aria-describedby' for associated helper text.

## 2025-05-15 - [Reusable Pattern: Sequential Sequential Shortcuts]
**Learning:** Sequential keyboard shortcuts (e.g., 'G' then 'C') provide a powerful way to add many shortcuts without conflicting with standard browser or OS keys. Decoupling the shortcut logic (in a hook) from the action (in a component) using CustomEvents keeps components clean and focused.
**Action:** Use `dispatch(new CustomEvent('toggle-feature'))` in `useGlobalShortcuts` and listen for it in the target component to implement global shortcuts for specific UI elements.
