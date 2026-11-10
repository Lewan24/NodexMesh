# Illustrated user guide

The application includes an illustrated Polish and English user guide. Open **User guide / Instrukcja obsługi** at the bottom of the Tools sidebar, or from the profile or administration page. On mobile, open Tools first. A first-session introduction highlights the entry point; “Do not show again” remembers dismissal per user in that browser. “Maybe later” dismisses it for the current browser session.

The guide contains 21 searchable chapters: getting started, navigation and selection, editbar styling, inspector/tags/statuses/comments/locks, context menus and arrangement, notes/documents/code, checklists/Kanban and filters, columns/frames/linked boards, arrows/icons/drawing, planning tools, media, library, projects, sharing/roles, JSON transfer, profile/MFA, appearance, and administration (users/projects/email, audit, IP protection and branding). Administrative chapters explicitly identify the required privileges. The guide distinguishes browser-local demo features from API-backed features.

## Sources and maintenance

- Guide content: `Frontend/src/features/user-guide/content/{pl,en}.json`.
- Viewer, search and first-visit introduction: `Frontend/src/features/user-guide/`.
- Images: `Frontend/public/user-guide/`, served locally with the application (no external image service).
- Shared button explanations: `Frontend/src/shared/components/TooltipLayer.tsx`. Existing HTML `title` descriptions are progressively enhanced on hover/focus; native titles are restored on exit. New rich explanations use `data-tooltip` and `data-tooltip-description` (newline-separated paragraphs). Use explicit `aria-label` for icon controls. Only informational badges should opt into `data-tooltip-on-click`, so ordinary button actions remain unchanged.

Screenshots use **actual application components with fictional training data**, including `.invalid` email addresses and documentation-only IP addresses. They do not use live user accounts, projects or production audit events. Polish screenshots are shared between language versions; the instructions and captions are translated.

When changing a feature, update the relevant chapter in both languages. Confirm descriptions against the implementation rather than treating older overview documentation as a guarantee of current behaviour. Keep limitations such as JSON library references, public-link permissions and security-panel scope explicit.

## Recreate illustrations

From `Frontend`, with installed dependencies and Playwright Chromium:

```bash
npm run guide:screenshots:workspace
npm run guide:screenshots
```

The first command builds the isolated browser-local workspace fixture and captures the canvas, editbar, inspector, context menu, notes, planning, arrows, filters, project menu, appearance and profile. The second builds an isolated HTTP-adapter fixture and captures library, sharing, users, audit, IP protection and branding. Playwright intercepts API requests with training data; a live API or account is not required. These commands replace the checked-in guide PNGs deliberately. Normal browser tests do not regenerate them.

Validate guide content/search/assets with `npm test`, and interactions with:

```bash
npm run test:browser -- user-guide kanban-filters-locks
npm run typecheck:browser
npm run build
```
