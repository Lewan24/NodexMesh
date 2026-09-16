# NodexMesh

NodexMesh is a visual workspace for notes, rich documents, tasks, timelines, diagrams, code, media and drawings on an interactive canvas.

The application is designed around flexible project boards where users can freely position content, group related items, build structured columns, connect elements with lines, and organize information without being limited to a fixed document layout.

## Demo

Live demo:

https://nodexmesh.lewanmordor.workers.dev

---

## Features

### Canvas and editing

- Pan, zoom, grid snapping (16 px), resizing and multi-selection.
- Context menu and shortcuts: Ctrl/Cmd+C to copy, Ctrl/Cmd+V to paste, Ctrl/Cmd+D to duplicate, Ctrl/Cmd+Z to undo board changes.
- Typography, handwriting fonts, alignment, card colors and top strips through the edit bar.
- Default white cards follow the light/dark theme; custom colors remain unchanged.
- Locked items display a yellow lock. A frame with a locked member cannot move.
- Content-driven growth pushes lower items in the same frame down; manual resizing preserves deliberate overlaps.
- Click a connection handle to create an empty sibling for supported block types, or drag it to connect existing items.
- Categorized tool menu, search, comments and tags.

### Supported blocks

| Block            | Capabilities                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Note             | Editable text, horizontal/vertical alignment, auto fit                                                                     |
| Text             | Multiline text and typography                                                                                              |
| Image            | Image with optional caption                                                                                                |
| Link             | Website link card                                                                                                          |
| Checklist        | Reorderable tasks, completion count and percentage                                                                         |
| Kanban           | Reorderable columns/cards, task completion count and percentage, column settings dialog for name, title color and width    |
| Column           | Nested blocks, reorder and eject to canvas                                                                                 |
| Frame            | Persistent membership, fit to contents, explicit reassignment                                                              |
| Line / arrow     | Colors, thickness, filled arrowheads, endpoint attachments, labels, adjustable curve and round/flat/square ends            |
| Divider          | Grid-snapped line without item attachments                                                                                 |
| Note dispenser   | Drag out centered flashcards in the selected color                                                                         |
| Document         | Rich text, headings and inline formatting, auto fit/automatic height                                                       |
| Embed            | Interactive websites and YouTube; hover controls outside the video, optional full player interaction                       |
| Code             | Language selection, syntax highlighting, copy code and auto fit                                                            |
| Timeline         | Milestones and schedule modes, task dialog, dates/checklists, task reordering and draggable/resizable schedule bars        |
| Database diagram | Tables, typed fields, PK/FK, nullable/unique/default values, field relations and cardinalities, grid-based editor          |
| Diagram          | Process/decision/database and other shapes, editable connections, grid snapping, multi-node alignment and automatic layout |
| Drawing          | Smoothed pressure-like freehand strokes, resize/move, bulk color/thickness changes and joining strokes                     |

The pencil stays active until Escape or selecting another tool. Joined drawings retain separate strokes, colors and geometry.

The Timeline schedule has a **Task column** width control for longer task names.

### Tasks and Kanban columns

Checklist tasks and Kanban cards can be moved between blocks without losing completion state. Dropping a task onto empty canvas creates a checklist containing it. Cards can be added above or below existing cards.

Click a column title or its settings button to edit the name, title color and width in a dialog. Save commits the changes; Cancel leaves the column unchanged. Column drag handles and left/right controls reorder columns.

### Frames

Each root item belongs to at most one frame. Overlapping frames do not steal members when moved or resized. The edit bar's **Frame** selector assigns selected items or detaches them with **No frame**. **Take over enclosed items** explicitly transfers enclosed unlocked items.

Existing boards initialize membership on load, choosing the smallest containing frame when several overlap. Frame deletion detaches its members without deleting them; copying a frame remaps membership to the copy.

### Diagrams and connections

Open **Edit diagram** for the dedicated editor. Drag nodes on the grid, Shift-click or drag a selection rectangle to select several, then use **Align left** or **Align top**. **Snap to grid** toggles snapping; **Auto layout** arranges the graph vertically or horizontally using the direction selector. Right/middle-button dragging pans the editor.

Drag a port to connect nodes; drag an existing connection endpoint to reconnect it. Selected connections support labels, deletion and rounded-elbow, curved or straight routing. Nodes can disconnect all their connections.

Canvas lines and arrows have a separate **Curve** slider: bend in either direction or use **Straight** to reset. Arrowheads follow the curve tangent, and labels follow the curve midpoint.

### Database schema planning

Choose **Planning → Database diagram** and open **Edit database**. Add tables, select a table to edit its name and fields, and use suggested or custom data types. Multiple PK fields can describe a composite primary key.

Drag a port of a foreign-key field onto a port of its referenced field. Connections route between facing table sides. Relationships display cardinality (1:1, 1:N, N:1 or conceptual N:N). A physical many-to-many design can use an explicit junction table. Use the up/down controls to reorder fields. The canvas preview uses SVG geometry independent of canvas zoom. Deleting fields/tables removes related connections, and board undo restores them. This is a schema planning tool; it does not connect to a live database or execute migrations.

Code blocks use a dark background when the default/white color is selected so syntax highlighting remains readable in either application theme.

### Personal appearance and gradients

**Appearance** in the app bar configures your view of the current project or your defaults for all projects. Preferences are stored separately for each user and project, including light/dark palettes, primary/secondary colors, canvas background and Default/Accent 1–5 card colors. **Use my defaults** removes a project override.

The default board font applies to items without an explicit font override. Interface font is a separate account-wide preference. These preferences are local to the current browser until backend synchronization is implemented.

The edit bar supports semantic palette colors, fixed custom colors, linear gradients with an angle, and radial gradients from the center. Gradient stops can reference palette roles so they adapt when switching mode. Existing custom hex colors remain fixed. Top strips retain their existing controls. Code content uses a stable dark syntax surface while its header controls maintain independent readable colors.

### Projects and persistence

Create, rename and switch projects from the project menu. Deleted projects go to **Trash** and can be restored. **Empty trash** permanently removes all trashed projects after confirmation; it cannot be undone. There is no automatic expiry.

Project and demo authentication data are stored in browser local storage, not synchronized with a backend. Undo history is scoped to the current board session. Native text editing keeps its own undo behavior while focused.

### Authentication and themes

The frontend includes local demo authentication, user/admin roles and an administrator user-management UI. These are not server-side security controls. The planned backend remains described below.

Light and dark themes apply globally, including default card colors.

---

## Technical Overview

NodexMesh is currently implemented as a React single-page application written in TypeScript.

The application has been structured around feature boundaries rather than placing most behavior directly inside page components.

The frontend separates:

- domain entities,
- authentication,
- project management,
- canvas state,
- canvas interaction logic,
- individual block implementations,
- layout components,
- persistence concerns,
- reusable UI utilities.

This separation is intended to make the frontend suitable for replacing the current local persistence mechanisms with a remote API without requiring a major rewrite of the presentation layer.

### Main technologies

- React
- TypeScript
- Vite
- Tailwind CSS
- Tiptap for rich documents
- React Flow for diagrams
- highlight.js for code highlighting
- Browser local storage for the current local persistence layer

### Planned backend

The planned backend will use:

- C#
- ASP.NET Core Web API
- Entity Framework Core
- relational database storage
- JWT-based authentication
- refresh tokens
- role and policy-based authorization

SignalR may later be introduced for real-time collaboration.

---

## Project Structure

The frontend follows a feature-oriented structure.

```text
src/
├── app/
│   ├── App.tsx
│   ├── providers/
│   └── styles/
│
├── entities/
│   ├── board/
│   ├── project/
│   └── user/
│
├── features/
│   ├── auth/
│   ├── board/
│   ├── blocks/
│   ├── canvas/
│   └── projects/
│
├── layout/
│   ├── appbar/
│   └── sidebar/
│
├── shared/
│   └── components/
│
└── main.tsx
```

### Entities

The `entities` layer contains the main application data models.

Examples include:

- users,
- projects,
- board items,
- tool types.

Board items are represented as a TypeScript discriminated union, allowing each block type to have its own properties while still being handled through the common `BoardItem` type.

### Features

The `features` layer contains application behavior grouped by domain responsibility.

For example:

```text
features/canvas/
```

contains canvas interaction logic such as:

- dragging,
- resizing,
- selection,
- zooming,
- keyboard handling,
- line endpoint manipulation,
- history,
- frame actions,
- cross-item drag and drop.

Block-specific behavior is contained under:

```text
features/blocks/
```

rather than being implemented directly inside the canvas.

### Block rendering

`BlockRenderer` acts as the boundary between generic canvas items and individual block components.

Each `BoardItem` is narrowed by its `type` discriminator and rendered using the corresponding block implementation.

This allows individual blocks to receive only the callbacks and data they require.

---

## State and Persistence

At the current stage, project and authentication data are stored locally in the browser.

This approach is intended primarily for frontend development and demonstration.

The application architecture separates persistence logic from most UI components so the storage layer can later be replaced with API-backed services.

The target flow will be:

```text
React components
        |
        v
Feature hooks
        |
        v
API services
        |
        v
HTTP client
        |
        v
ASP.NET Core API
        |
        v
Application / Domain layer
        |
        v
Entity Framework Core
        |
        v
Database
```

Canvas components should not need to know whether data originates from local storage or a remote database.

---

## Planned API Architecture

The backend is planned as a separate ASP.NET Core application.

Its responsibilities will include:

- authentication,
- authorization,
- user management,
- role management,
- project ownership,
- project persistence,
- board item persistence,
- validation,
- security enforcement,
- refresh token handling,
- centralized error responses,
- audit and security logging.

The frontend will introduce dedicated API modules such as:

```text
src/
├── shared/
│   └── api/
│       ├── apiClient.ts
│       ├── apiError.ts
│       └── types.ts
│
├── features/
│   ├── auth/
│   │   └── api/
│   │       └── authApi.ts
│   │
│   └── projects/
│       └── api/
│           └── projectsApi.ts
```

UI components will continue to work through feature hooks rather than calling HTTP endpoints directly.

---

## Authentication Plan

The planned authentication flow uses short-lived access tokens and refresh tokens.

A possible flow is:

```text
Login
  |
  v
POST /api/auth/login
  |
  +-- access token returned to the client
  |
  +-- refresh token stored in a secure HttpOnly cookie
```

The access token should preferably remain in application memory instead of browser local storage.

The refresh token should not be exposed to frontend JavaScript.

Planned authentication endpoints include:

```text
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/me
```

On application startup, the frontend will attempt to restore the authenticated session through the refresh endpoint.

The authentication state will distinguish between:

```text
loading
authenticated
anonymous
```

to prevent the login screen from briefly appearing while an existing session is being restored.

---

## Authorization

Frontend role checks are used only to control the interface.

They must not be treated as a security boundary.

For example, hiding an administrator button in React does not prevent a client from manually sending a request to the corresponding API endpoint.

All protected operations will therefore be authorized by the ASP.NET Core backend using roles or authorization policies.

Example:

```csharp
[Authorize(Policy = "ManageUsers")]
```

Resource access must also be validated server-side.

A user requesting:

```text
/projects/{projectId}
```

must only receive the project if the authenticated user has access to that project.

User or owner identifiers supplied by the browser will not be trusted as proof of ownership.

---

## API Error Handling

The frontend will use centralized API error handling.

ASP.NET Core `ProblemDetails` or an equivalent consistent response format is planned for errors.

Typical responses will include:

- `400 Bad Request`
- `401 Unauthorized`
- `403 Forbidden`
- `404 Not Found`
- `409 Conflict`
- `422 Unprocessable Entity`, where appropriate
- `429 Too Many Requests`
- `500 Internal Server Error`

The frontend HTTP client will distinguish authentication failures from authorization failures.

In particular:

```text
401
→ access token may need refreshing

403
→ authenticated user does not have permission
```

A `403` response must not trigger token refresh.

---

## Refresh Token Handling

The planned refresh implementation will include:

- secure cookies,
- `HttpOnly`,
- `Secure`,
- appropriate `SameSite` configuration,
- refresh token rotation,
- server-side token revocation,
- logout invalidation,
- refresh token hashing before database storage,
- protection against refresh token reuse.

The frontend HTTP client will coordinate refresh requests so multiple simultaneous `401` responses do not result in multiple refresh operations.

---

## API Synchronization

Canvas interaction is highly dynamic, so not every local state change should result in an HTTP request.

For operations such as dragging or resizing, the intended approach is:

```text
Mouse down
    |
    v
Local interaction
    |
    v
Multiple visual state updates
    |
    v
Mouse up
    |
    v
Single API update
```

This prevents sending a request for every mouse movement.

Text-based changes may use either:

- save on blur,
- debounced updates.

The interface should remain responsive through optimistic updates.

If a server operation fails, the frontend can either restore the previous state or reload the authoritative server representation.

---

## Data Model Considerations

The frontend represents canvas objects using the `BoardItem` union.

The backend will need an equivalent API representation for item types such as:

```text
note
text
image
link
checklist
kanban
column
frame
line
```

API DTOs should remain separate from Entity Framework entities.

The intended architecture is:

```text
Request DTO
    |
    v
Application layer
    |
    v
Domain / persistence model
```

and for responses:

```text
Database entity
    |
    v
Response DTO
    |
    v
Frontend API model
```

Frontend models may also be mapped from API DTOs instead of coupling React directly to the backend persistence representation.

---

## Security

The planned API implementation will take the OWASP Top 10 into account.

Key areas include:

- server-side authorization for every protected resource,
- prevention of broken object-level authorization,
- strict request validation,
- secure password hashing,
- refresh token protection,
- rate limiting,
- secure CORS configuration,
- CSRF considerations for cookie-based endpoints,
- safe error responses,
- protection against excessive data exposure,
- logging of security-relevant events,
- avoiding sensitive information in application logs.

The backend will never trust client-side checks for:

- user identity,
- project ownership,
- roles,
- permissions,
- timestamps,
- resource ownership.

Sensitive values such as passwords, access tokens, and refresh tokens must not be written to logs.

---

## Future Real-Time Collaboration

Real-time collaboration is not part of the current implementation.

A future version may use ASP.NET Core SignalR to propagate project changes between connected users.

The intended separation would be:

```text
REST API
→ loading data
→ creating resources
→ updating resources
→ deleting resources

SignalR
→ live project events
→ remote item updates
→ collaboration notifications
```

Concurrency handling may also be introduced to prevent users from silently overwriting newer changes made by another client.

---

## Roadmap

### Frontend foundation

- [x] Project-based canvas
- [x] Notes
- [x] Text blocks
- [x] Images
- [x] Link cards
- [x] Checklists
- [x] Kanban boards
- [x] Columns
- [x] Frames
- [x] Lines and arrows
- [x] Drag and drop
- [x] Resizing
- [x] Multi-selection
- [x] Grouping
- [x] Canvas zoom and pan
- [x] Grid snapping
- [x] Contextual edit bar
- [x] Light and dark themes
- [x] Local project persistence
- [x] Frontend authentication prototype
- [x] User and administrator roles
- [x] Refactored feature-oriented frontend architecture

### API foundation

- [ ] Create ASP.NET Core Web API
- [ ] Configure application layers
- [ ] Configure Entity Framework Core
- [ ] Configure database
- [ ] Add migrations
- [ ] Define API DTOs
- [ ] Define consistent API error responses
- [ ] Add server-side validation

### Authentication

- [ ] Implement user accounts
- [ ] Implement password hashing
- [ ] Implement login endpoint
- [ ] Implement short-lived access tokens
- [ ] Implement refresh tokens
- [ ] Store refresh token hashes
- [ ] Implement refresh token rotation
- [ ] Implement session restoration
- [ ] Implement logout and token revocation
- [ ] Add rate limiting to authentication endpoints

### Authorization

- [ ] Implement roles
- [ ] Implement authorization policies
- [ ] Protect administrative endpoints
- [ ] Validate project ownership
- [ ] Validate item ownership through projects
- [ ] Prevent unauthorized object access

### Project API

- [ ] Load projects from API
- [ ] Create projects through API
- [ ] Update project metadata
- [ ] Delete projects
- [ ] Persist board items
- [ ] Persist nested column items
- [ ] Persist checklist entries
- [ ] Persist kanban cards and columns
- [ ] Persist frame state
- [ ] Persist line connections

### Frontend API integration

- [ ] Add centralized HTTP client
- [ ] Add centralized API error handling
- [ ] Add authentication bootstrap state
- [ ] Replace local auth storage
- [ ] Replace local project storage
- [ ] Implement automatic access token refresh
- [ ] Prevent duplicate simultaneous refresh requests
- [ ] Add optimistic API updates
- [ ] Add rollback or recovery for failed updates
- [ ] Add debounced text persistence
- [ ] Persist drag and resize state after interaction completion

### Security

- [ ] Apply OWASP Top 10 recommendations
- [ ] Configure secure CORS policy
- [ ] Configure secure cookies
- [ ] Review CSRF protection requirements
- [ ] Add request rate limiting
- [ ] Add security event logging
- [ ] Add centralized exception handling
- [ ] Prevent sensitive data exposure in logs and responses
- [ ] Add server-side request size and input limits
- [ ] Perform authorization tests for protected resources

### Future development

- [ ] Shared projects
- [ ] Project permissions
- [ ] Real-time updates with SignalR
- [ ] Concurrent update handling
- [ ] Activity history
- [ ] Improved undo/redo synchronization
- [ ] Additional board item types
- [ ] Import/export
- [ ] Improved mobile and touch support

---

## Running Locally

### Requirements

Install:

- Node.js
- npm

### Installation

Clone the repository:

```bash
git clone https://github.com/Lewan24/NodexMesh.git
cd NodexMesh
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Vite will display the local development URL in the terminal.

Open that URL (by default `http://localhost:8443`) for live updates. Production
builds and `npm run preview` do not provide hot module replacement. The dev
server fails if its port is occupied instead of silently switching ports.

If edits in a shared folder or WSL do not trigger updates, enable polling before
starting Vite. In PowerShell:

```powershell
$env:VITE_USE_POLLING = 'true'
npm run dev
```

Polling uses more CPU, so it is disabled by default. If using a reverse proxy,
make sure it forwards WebSocket connections for Vite HMR as well as HTTP requests.

### Verification

```bash
npm test
npm run build
```

Tests cover block data, history, frame membership, task transfers, diagram operations and line geometry.

### Production build

```bash
npm run build
```

The generated production files will be placed in:

```text
dist/
```

---

## Backend Status

The repository currently contains the frontend implementation.

The ASP.NET Core API described in this README is part of the planned development roadmap and is not yet required to run the current frontend version.

Until API integration is completed, authentication and project persistence use the application's local frontend implementation.

---

## Development Principles

### Code formatting

Run `npm run format` to format project files and `npm run format:check` to verify their style. Prettier and EditorConfig define a shared style with 2-space indentation and a preferred width of 120 characters. Keep short expressions and simple JSX on one line; split complex or longer code into readable blocks. Formatting must preserve application behavior and rendered appearance. Generated files, dependency lockfiles and binary assets are excluded. See [AGENTS.md](./AGENTS.md) for guidance when creating or editing code.

The project follows several implementation principles:

- UI components should not directly depend on persistence technology.
- HTTP requests should not be scattered across presentation components.
- Authentication should be centralized.
- Authorization must always be enforced by the backend.
- API DTOs should remain separate from database entities.
- Canvas interactions should remain responsive independently of network latency.
- High-frequency interactions should not generate unnecessary API requests.
- Shared behavior should be extracted only when it provides a clear architectural benefit.
- TypeScript discriminated unions should be preferred over unsafe casting.
- Components should remain focused on a single responsibility.

---

## License

Check out the [MIT License](https://github.com/Lewan24/NodexMesh/blob/main/LICENSE)

### Appearance scopes

Appearance settings separate **UI** (one personal app bar/sidebar palette and interface font across all projects and modes) from **Canvas**. Canvas defaults apply to new and uncustomized projects. Select any active project in the settings list to customize its light/dark palettes, cards, dialogs and board font. Project controls are disabled until **Use custom project theme** is checked. Unchecking it removes the override and restores live inheritance from general defaults. Switching light/dark mode never creates a project palette override. Save applies all pending changes; Cancel discards them. Preferences remain local and isolated by user.

Canvas palettes support solid, linear and radial fills for default cards, accents and the canvas background, independently for light and dark modes. Theme gradients are inherited by semantic card colors; explicit card fills take precedence. Primary/secondary UI action colors remain solid for controls and icons.

- Context menu: copy a single item's color, gradient, top strip and typography, then paste style onto a selection. Locked items are skipped; the operation supports Undo.
- Timeline Schedule: scroll within a compact viewport, move by week or jump to a date. Only tasks intersecting the visible date window (plus unscheduled tasks) appear; hidden tasks remain saved. Dragging and duration resizing still work in editing mode.
- Default palette: primary `#5500cc`, secondary `#ff00f7`, default card gradient at 120 degrees from Accent 1 to Accent 5 in both modes. Existing custom colors are preserved.

Pasting style opens a dialog to select all styles or only fill, top strip, or typography/alignment. Timeline Schedule respects manual height and Auto-fit expands to its visible task rows while retaining horizontal date scrolling.

Columns accept notes, checklists, links, text, images, documents, code and embeds, both through Add item and canvas drag/drop. New children use shared defaults; new document/code children auto-fit. Planning blocks and nested containers stay on the canvas. New columns are 416 px wide (320 px content plus padding and controls); existing widths are preserved. Column colors use semantic palette roles, including gradients, and top strips render consistently with other cards.

**Section title** (Organize tools) labels a canvas section without a frame. Double-click to edit; Shift+Enter adds a line. It uses frame-title zoom compensation (up to 3.2x), supports typography, search, duplication and undo, uses a contrasting colored label with a fixed bottom-left zoom anchor, and has no container ownership behavior. Its background color/gradient is configurable in the edit bar; text contrast is automatic.

Section Title now renders the exact shared frame-label component: rounded translucent surface, fine colored border, leading dot, and solid color/uppercase treatment at distant zoom. Label color is editable. New titles use the same 14 px default as frame labels; previously customized typography remains saved.
