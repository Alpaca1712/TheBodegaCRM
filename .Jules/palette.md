## 2025-05-14 - [A11y: Missing Label Associations]
**Learning:** Many form components in the codebase (e.g., LeadForm, AuthForm) use labels but lack explicit 'id' and 'htmlFor' associations, which hinders screen reader accessibility and reduces clickable area.
**Action:** When working on forms, always ensure every input has a unique 'id' and its corresponding label has a matching 'htmlFor'. Use 'aria-describedby' for associated helper text.
