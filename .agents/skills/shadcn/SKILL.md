---
name: shadcn
description: Instructions and guidelines for installing and using shadcn/ui components in this workspace.
---

# Shadcn UI Guidelines

When the user requests to add or modify a shadcn/ui component, follow these rules:

1. **Adding Components**: Always use the official CLI command to add a new component.
   - Run: `npx shadcn-ui@latest add [component]` or `npx shadcn@latest add [component]`.
   - Never write a shadcn component manually from scratch unless the CLI fails.

2. **File Placement**:
   - The CLI will place components in `src/components/ui/`.
   - Do not move them unless specifically requested by the user.

3. **Styling and Theming**:
   - The project uses standard Tailwind CSS. 
   - Components will utilize CSS variables defined in `src/index.css` (e.g. `var(--border)`, `var(--bg)`).
   - If a component requires customization, modify the downloaded component directly in `src/components/ui/` or pass Tailwind classes via `className`.

4. **Dependencies**:
   - If the shadcn CLI warns about missing dependencies (like `lucide-react`, `clsx`, `tailwind-merge`), ensure they are installed or the `cn()` utility is correctly mapped in `src/lib/utils.js`.
