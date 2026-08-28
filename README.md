# NodexMesh

NodexMesh is a visual workspace for organizing notes, text, links, images, checklists, kanban boards, columns, frames, and connections on an interactive canvas.

The application is designed around flexible project boards where users can freely position content, group related items, build structured columns, connect elements with lines, and organize information without being limited to a fixed document layout.

## Demo

Live demo:

https://nodexmesh.lewanmordor.workers.dev

---

## Features

### Interactive canvas

NodexMesh provides a zoomable and pannable workspace with support for:

* free positioning of items,
* drag and drop,
* grid snapping,
* zoom controls,
* multi-selection,
* grouping selected items into frames,
* undo support,
* automatic z-index management,
* resizing supported elements,
* item selection and editing,
* automatic tool switching when selecting existing content.

### Supported blocks

The canvas currently supports:

* Sticky notes
* Text
* Images
* Link cards
* Checklists
* Kanban boards
* Columns
* Frames
* Lines and arrows

Each block type has its own editing behavior and visual controls.

### Columns

Columns can contain nested items such as:

* notes,
* text,
* images,
* links,
* checklists.

Nested items automatically adapt to the available column width.

Items can be reordered inside a column and moved back onto the main canvas.

### Checklists

Checklist blocks support:

* adding entries,
* editing entries,
* marking entries as completed,
* deleting entries,
* reordering entries,
* dragging entries outside of supported parent containers.

### Kanban boards

Kanban boards provide:

* multiple columns,
* editable column titles,
* cards,
* card completion state,
* card editing,
* reordering,
* moving cards between columns,
* dragging cards outside the board.

### Frames

Frames can be used to visually group canvas content.

They support:

* custom colors,
* manual resizing,
* automatic fitting to contained items,
* visual grouping without changing the underlying item structure.

### Lines and arrows

Canvas elements can be connected using lines.

Lines support:

* configurable colors,
* multiple stroke widths,
* optional arrow heads,
* draggable endpoints,
* attachment to canvas items.

Attached endpoints follow their target items when those items move.

### Editing controls

Selected elements can be edited through a contextual edit bar.

Depending on the selected block type, available controls include:

* background colors,
* accent colors,
* text alignment,
* font size,
* bold and italic formatting,
* line thickness,
* arrow direction,
* frame fitting,
* grouping,
* deletion.

### Projects

The application supports multiple projects with independent canvas state.

Users can:

* switch between projects,
* create new projects,
* maintain separate board content for each project.

### Authentication and roles

The current frontend includes an authentication layer with user and administrator roles.

Administrator-specific UI includes user management functionality.

The current authentication and persistence implementation is intended to be replaced by the planned server-side API described in the roadmap below.

### Themes

NodexMesh supports light and dark themes.

The selected theme is managed globally through the application theme provider.

---

## Technical Overview

NodexMesh is currently implemented as a React single-page application written in TypeScript.

The application has been structured around feature boundaries rather than placing most behavior directly inside page components.

The frontend separates:

* domain entities,
* authentication,
* project management,
* canvas state,
* canvas interaction logic,
* individual block implementations,
* layout components,
* persistence concerns,
* reusable UI utilities.

This separation is intended to make the frontend suitable for replacing the current local persistence mechanisms with a remote API without requiring a major rewrite of the presentation layer.

### Main technologies

* React
* TypeScript
* Vite
* Tailwind CSS
* Browser local storage for the current local persistence layer

### Planned backend

The planned backend will use:

* C#
* ASP.NET Core Web API
* Entity Framework Core
* relational database storage
* JWT-based authentication
* refresh tokens
* role and policy-based authorization

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
│   ├── app-bar/
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

* users,
* projects,
* board items,
* tool types.

Board items are represented as a TypeScript discriminated union, allowing each block type to have its own properties while still being handled through the common `BoardItem` type.

### Features

The `features` layer contains application behavior grouped by domain responsibility.

For example:

```text
features/canvas/
```

contains canvas interaction logic such as:

* dragging,
* resizing,
* selection,
* zooming,
* keyboard handling,
* line endpoint manipulation,
* history,
* frame actions,
* cross-item drag and drop.

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

* authentication,
* authorization,
* user management,
* role management,
* project ownership,
* project persistence,
* board item persistence,
* validation,
* security enforcement,
* refresh token handling,
* centralized error responses,
* audit and security logging.

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

* `400 Bad Request`
* `401 Unauthorized`
* `403 Forbidden`
* `404 Not Found`
* `409 Conflict`
* `422 Unprocessable Entity`, where appropriate
* `429 Too Many Requests`
* `500 Internal Server Error`

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

* secure cookies,
* `HttpOnly`,
* `Secure`,
* appropriate `SameSite` configuration,
* refresh token rotation,
* server-side token revocation,
* logout invalidation,
* refresh token hashing before database storage,
* protection against refresh token reuse.

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

* save on blur,
* debounced updates.

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

* server-side authorization for every protected resource,
* prevention of broken object-level authorization,
* strict request validation,
* secure password hashing,
* refresh token protection,
* rate limiting,
* secure CORS configuration,
* CSRF considerations for cookie-based endpoints,
* safe error responses,
* protection against excessive data exposure,
* logging of security-relevant events,
* avoiding sensitive information in application logs.

The backend will never trust client-side checks for:

* user identity,
* project ownership,
* roles,
* permissions,
* timestamps,
* resource ownership.

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

* [x] Project-based canvas
* [x] Notes
* [x] Text blocks
* [x] Images
* [x] Link cards
* [x] Checklists
* [x] Kanban boards
* [x] Columns
* [x] Frames
* [x] Lines and arrows
* [x] Drag and drop
* [x] Resizing
* [x] Multi-selection
* [x] Grouping
* [x] Canvas zoom and pan
* [x] Grid snapping
* [x] Contextual edit bar
* [x] Light and dark themes
* [x] Local project persistence
* [x] Frontend authentication prototype
* [x] User and administrator roles
* [x] Refactored feature-oriented frontend architecture

### API foundation

* [ ] Create ASP.NET Core Web API
* [ ] Configure application layers
* [ ] Configure Entity Framework Core
* [ ] Configure database
* [ ] Add migrations
* [ ] Define API DTOs
* [ ] Define consistent API error responses
* [ ] Add server-side validation

### Authentication

* [ ] Implement user accounts
* [ ] Implement password hashing
* [ ] Implement login endpoint
* [ ] Implement short-lived access tokens
* [ ] Implement refresh tokens
* [ ] Store refresh token hashes
* [ ] Implement refresh token rotation
* [ ] Implement session restoration
* [ ] Implement logout and token revocation
* [ ] Add rate limiting to authentication endpoints

### Authorization

* [ ] Implement roles
* [ ] Implement authorization policies
* [ ] Protect administrative endpoints
* [ ] Validate project ownership
* [ ] Validate item ownership through projects
* [ ] Prevent unauthorized object access

### Project API

* [ ] Load projects from API
* [ ] Create projects through API
* [ ] Update project metadata
* [ ] Delete projects
* [ ] Persist board items
* [ ] Persist nested column items
* [ ] Persist checklist entries
* [ ] Persist kanban cards and columns
* [ ] Persist frame state
* [ ] Persist line connections

### Frontend API integration

* [ ] Add centralized HTTP client
* [ ] Add centralized API error handling
* [ ] Add authentication bootstrap state
* [ ] Replace local auth storage
* [ ] Replace local project storage
* [ ] Implement automatic access token refresh
* [ ] Prevent duplicate simultaneous refresh requests
* [ ] Add optimistic API updates
* [ ] Add rollback or recovery for failed updates
* [ ] Add debounced text persistence
* [ ] Persist drag and resize state after interaction completion

### Security

* [ ] Apply OWASP Top 10 recommendations
* [ ] Configure secure CORS policy
* [ ] Configure secure cookies
* [ ] Review CSRF protection requirements
* [ ] Add request rate limiting
* [ ] Add security event logging
* [ ] Add centralized exception handling
* [ ] Prevent sensitive data exposure in logs and responses
* [ ] Add server-side request size and input limits
* [ ] Perform authorization tests for protected resources

### Future development

* [ ] Shared projects
* [ ] Project permissions
* [ ] Real-time updates with SignalR
* [ ] Concurrent update handling
* [ ] Activity history
* [ ] Improved undo/redo synchronization
* [ ] Additional board item types
* [ ] Import/export
* [ ] Improved mobile and touch support

---

## Running Locally

### Requirements

Install:

* Node.js
* npm

### Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/NodexMesh.git
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

The project follows several implementation principles:

* UI components should not directly depend on persistence technology.
* HTTP requests should not be scattered across presentation components.
* Authentication should be centralized.
* Authorization must always be enforced by the backend.
* API DTOs should remain separate from database entities.
* Canvas interactions should remain responsive independently of network latency.
* High-frequency interactions should not generate unnecessary API requests.
* Shared behavior should be extracted only when it provides a clear architectural benefit.
* TypeScript discriminated unions should be preferred over unsafe casting.
* Components should remain focused on a single responsibility.

---

## License

Check out the [MIT License](https://github.com/Lewan24/NodexMesh/blob/main/LICENSE)
