# NodexMesh — Database & EF Core Design (PostgreSQL + .NET 10)

Based on your board-items JSON export and appearance JSON, plus `files-structure.md`.
This covers: table design, DDL, EF Core entities/DbContext, and OWASP-mapped security notes.

## 1. Design decisions (read this first)

- **IDs**: `uuid`, generated **client-side or app-side as UUIDv7** (`Guid.CreateVersion7()` in .NET 9+),
  never DB-sequential integers. Your frontend already creates item IDs optimistically before sync,
  so the DB should *accept* supplied IDs rather than generate them — keeps this consistent and avoids
  IDOR-by-enumeration (sequential ints let an attacker guess `/items/1235`).
- **`Type`, `Data`, `Appearance`**: your 18+ block types each have a wildly different `data` shape
  (kanban columns/cards vs. drawing strokes vs. diagram nodes/edges vs. database tables/relations).
  Trying to fully normalize all of that into relational columns is not worth it and will fight every
  new block type you add. Store `Data` and `Appearance` as **`jsonb`**, validate shape at the API
  boundary (DTOs + `schemaVersion`), not in the DB. `BoardItemType` stored as `text` (not a native PG
  enum) so adding a new block type is just an app-level enum + CHECK constraint update, no risky
  `ALTER TYPE`.
- **Concurrency / revisions**: your frontend already tracks `revision` per item/board/project and a
  `clientMutationId` for idempotent retries. Keep `Revision bigint` as an app-managed column
  (`UPDATE ... WHERE id=@id AND revision=@expected`, bump inside the transaction, return 409 on 0 rows
  affected). This matches your existing save-queue/debounce design in `workspaceController.ts` — the
  API layer is basically re-implementing that server-side. `records.ts` explicitly documents `Revision`
  as `string` on the wire ("decimal strings map to .NET Int64 without losing precision in JS") — your
  DTOs must serialize `long Revision` as a JSON string, not a number, or large revisions will silently
  truncate on the client. Easiest: a custom `JsonConverter<long>` on those DTO properties.
- **Batch mutation, not per-item REST**: `BoardMutation`/`ItemMutation` in `records.ts` show the real API
  shape is one transactional endpoint per board (`clientMutationId`, `expectedBoardRevision`, a list of
  `upserts` each with its own `expectedRevision` + replacement `links`/`comments`/`tags`, and a list of
  `deletes`), not individual `PUT /items/{id}` calls. Section 10 below designs that endpoint.
- **Soft delete everywhere**: `DeletedAt timestamptz NULL`. You already have this pattern (project
  trash, "global trash bin" on your TODO list). Use an EF Core global query filter so `DeletedAt IS NULL`
  is automatic and you can't forget it on a query and leak trashed data.
- **Per-user data**: appearance/theme is stored **per user**, with an optional **per (user, project)
  override** — matches your `defaults` + `projects: { <id>: {...} }` JSON exactly.
- I kept your own draft schema (`Users/Roles/UsersRoles/Projects/BoardItems/UsersProjectsSettings/ProjectSettings`)
  as the starting point and refined it — I collapsed `UsersProjectsSettings` + `ProjectSettings` into
  one `project_appearance_overrides` table keyed directly on `(UserId, ProjectId)`, since the indirection
  table wasn't adding anything.

**Updated against your actual `records.ts` / `boardValidation.ts` / `itemSchema.ts`** — this fixed several
guesses from the first draft:
- It's **20** item types, not 18 — I was missing `dispenser`.
- `comments` has **no `projectId` and no threading** — it's purely item-scoped and carries the full
  `AuditFields` (revision, createdBy/updatedBy, deletedAt), same as items. Fixed below.
- `item_links.kind` has a third value, `created_from` (dispenser → note provenance), and
  `boardValidation.ts` enforces at most one link per `(sourceItemId, kind)` — added as a unique index.
- `ItemAppearance` is a specific narrow shape (`color`, `colorRole`, `gradient`, `topColor`,
  `typography`, plus `textAlign`/`fontSize`/`bold`/`italic`), not arbitrary JSON — still stored as
  `jsonb`, but now typed properly in C# (section 8).
- Nesting is stricter than a generic self-FK: an item can only have a `parentItemId` if its schema says
  `canNest: true`, **and** the parent must be type `column` with no `parentItemId` of its own (one level
  deep only). This is app-level logic, not a DB constraint — see section 9.

Still open — your Future Plans checklist has "Read-only project sharing"; I kept a minimal
`project_members` table for that below. Drop it if that's not happening soon.

---

## 2. Entity overview

| Table | Purpose |
|---|---|
| `AspNetUsers` / `AspNetRoles` / `AspNetUserRoles` | ASP.NET Core Identity (built-in) |
| `refresh_tokens` | JWT refresh-token rotation (if you go JWT instead of pure cookie) |
| `idempotency_keys` | API-level replay protection using `clientMutationId` |
| `projects` | One row per project (owner, name, color, trash state) |
| `project_members` | *(optional, future)* sharing — user↔project role |
| `boards` | One row per board (you currently do 1 board/project, modeled as its own table anyway) |
| `board_items` | Every canvas item — frame, note, kanban, drawing, diagram, database block, etc. |
| `item_links` | Line/arrow attachment (`line_start`/`line_end`) **and** dispenser→note provenance (`created_from`) |
| `tags` | Per-project tag catalog |
| `item_tags` | Item↔tag join |
| `comments` | Item-scoped comments only (no project-level, no threading) — full audit fields + `status` |
| `appearance_profiles` | Per-user **global default** theme (`defaults` in your JSON) |
| `project_appearance_overrides` | Per-user **per-project** theme override (`projects: {...}`) |

---

## 3. PostgreSQL DDL

```sql
-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- only if you want gen_random_uuid() as a fallback

-- ============================================================
-- projects
-- ============================================================
CREATE TABLE projects (
    id             uuid PRIMARY KEY,
    owner_id       uuid NOT NULL REFERENCES "AspNetUsers"(id),
    name           varchar(200) NOT NULL,
    color          varchar(9),
    revision       bigint NOT NULL DEFAULT 1,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    created_by     uuid NOT NULL REFERENCES "AspNetUsers"(id),
    updated_by     uuid NOT NULL REFERENCES "AspNetUsers"(id),
    deleted_at     timestamptz
);
CREATE INDEX ix_projects_owner        ON projects (owner_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_projects_owner_trash  ON projects (owner_id) WHERE deleted_at IS NOT NULL;

-- ============================================================
-- project_members (optional — future sharing)
-- ============================================================
CREATE TABLE project_members (
    project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES "AspNetUsers"(id) ON DELETE CASCADE,
    role        varchar(20) NOT NULL, -- 'Owner' | 'Editor' | 'Viewer'
    created_at  timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, user_id)
);

-- ============================================================
-- boards
-- ============================================================
CREATE TABLE boards (
    id          uuid PRIMARY KEY,
    project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name        varchar(200) NOT NULL DEFAULT 'Board',
    sort_order  integer NOT NULL DEFAULT 0,
    revision    bigint NOT NULL DEFAULT 1,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    created_by  uuid NOT NULL REFERENCES "AspNetUsers"(id),
    updated_by  uuid NOT NULL REFERENCES "AspNetUsers"(id),
    deleted_at  timestamptz
);
CREATE INDEX ix_boards_project ON boards (project_id) WHERE deleted_at IS NULL;

-- ============================================================
-- board_items  (the big one)
-- ============================================================
CREATE TABLE board_items (
    id              uuid PRIMARY KEY,
    board_id        uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    parent_item_id  uuid REFERENCES board_items(id) ON DELETE CASCADE, -- nesting (columns etc.)
    frame_id        uuid REFERENCES board_items(id) ON DELETE SET NULL, -- containing frame
    type            varchar(32) NOT NULL, -- app-validated: frame|kanban|text|note|link|checklist|
                                           -- line|document|diagram|drawing|database|timeline|
                                           -- mindmap|code|embed|image|icon|section-title|column
    schema_version  smallint NOT NULL DEFAULT 1,
    sort_order      bigint NOT NULL,
    pos_x           double precision NOT NULL,
    pos_y           double precision NOT NULL,
    width           double precision,
    height          double precision,
    z_index         integer NOT NULL DEFAULT 0,
    locked          boolean NOT NULL DEFAULT false,
    appearance      jsonb NOT NULL DEFAULT '{}'::jsonb,
    data            jsonb NOT NULL DEFAULT '{}'::jsonb,
    revision        bigint NOT NULL DEFAULT 1,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    created_by      uuid NOT NULL REFERENCES "AspNetUsers"(id),
    updated_by      uuid NOT NULL REFERENCES "AspNetUsers"(id),
    deleted_at      timestamptz,
    -- exact 20 types, confirmed from itemSchema.ts
    CONSTRAINT ck_board_items_type CHECK (type IN (
        'section-title','note','text','document','code','icon','image','link','embed',
        'checklist','kanban','timeline','column','frame','dispenser','line','drawing',
        'mindmap','diagram','database'
    )),
    -- mirrors itemSchema.ts: width/height must be null or strictly positive
    CONSTRAINT ck_board_items_width  CHECK (width  IS NULL OR width  > 0),
    CONSTRAINT ck_board_items_height CHECK (height IS NULL OR height > 0),
    -- mirrors the 2MB per-item payload cap in validateItem()
    CONSTRAINT ck_board_items_size   CHECK (octet_length(data::text) + octet_length(appearance::text) < 2_000_000)
);
CREATE INDEX ix_board_items_board        ON board_items (board_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_board_items_frame        ON board_items (frame_id) WHERE deleted_at IS NULL;
CREATE INDEX ix_board_items_parent       ON board_items (parent_item_id) WHERE deleted_at IS NULL;
-- lets "search #todo" style queries hit the JSON without a full scan:
CREATE INDEX ix_board_items_data_gin     ON board_items USING gin (data jsonb_path_ops);

-- ============================================================
-- item_links  (arrow/line attachment, from your "links" array)
-- ============================================================
CREATE TABLE item_links (
    id               uuid PRIMARY KEY,
    source_item_id   uuid NOT NULL REFERENCES board_items(id) ON DELETE CASCADE,
    target_item_id   uuid NOT NULL REFERENCES board_items(id) ON DELETE CASCADE,
    kind             varchar(16) NOT NULL, -- 'line_start' | 'line_end' | 'created_from'
    CONSTRAINT ck_item_links_kind CHECK (kind IN ('line_start','line_end','created_from')),
    CONSTRAINT ck_item_links_no_self CHECK (source_item_id <> target_item_id)
);
CREATE INDEX ix_item_links_target ON item_links (target_item_id);
-- boardValidation.ts keys links as `${sourceItemId}:${kind}` and rejects duplicates:
-- a given source item can have at most one link of each kind (e.g. one line_start).
CREATE UNIQUE INDEX ux_item_links_source_kind ON item_links (source_item_id, kind);
-- NOTE: which (source.type, target.type) pairs are legal per `kind` is app logic,
-- not a DB constraint — see the BoardValidator port in section 9:
--   kind = 'line_start' | 'line_end'  -> source.type must be 'line'
--   kind = 'created_from'             -> source.type 'note', target.type 'dispenser'

-- ============================================================
-- tags / item_tags
-- ============================================================
CREATE TABLE tags (
    id              uuid PRIMARY KEY,
    project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name            varchar(64) NOT NULL,
    normalized_name varchar(64) NOT NULL,
    UNIQUE (project_id, normalized_name)
);

CREATE TABLE item_tags (
    item_id  uuid NOT NULL REFERENCES board_items(id) ON DELETE CASCADE,
    tag_id   uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, tag_id)
);

-- ============================================================
-- comments
-- ============================================================
-- CommentRecord has no projectId and no threading — it's purely item-scoped,
-- and (unlike my earlier guess) carries the full AuditFields, same as items.
CREATE TABLE comments (
    id           uuid PRIMARY KEY,
    item_id      uuid NOT NULL REFERENCES board_items(id) ON DELETE CASCADE,
    author_id    uuid NOT NULL REFERENCES "AspNetUsers"(id),
    text         text NOT NULL,
    status       varchar(16) NOT NULL, -- confirm exact values against ItemComment['status'] in types.ts
    revision     bigint NOT NULL DEFAULT 1,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    created_by   uuid NOT NULL REFERENCES "AspNetUsers"(id),
    updated_by   uuid NOT NULL REFERENCES "AspNetUsers"(id),
    deleted_at   timestamptz
);
CREATE INDEX ix_comments_item ON comments (item_id) WHERE deleted_at IS NULL;

-- ============================================================
-- appearance: per-user defaults + per-(user,project) overrides
-- ============================================================
CREATE TABLE appearance_profiles (
    user_id             uuid PRIMARY KEY REFERENCES "AspNetUsers"(id) ON DELETE CASCADE,
    font                varchar(64) NOT NULL DEFAULT 'sans',
    ui_font             varchar(64) NOT NULL DEFAULT 'sans',
    ui_primary          varchar(9)  NOT NULL DEFAULT '#7941c8',
    ui_secondary        varchar(9)  NOT NULL DEFAULT '#000000',
    inheritance_version integer NOT NULL DEFAULT 1,
    palette_version     integer NOT NULL DEFAULT 1,
    light_theme         jsonb NOT NULL, -- {primary, secondary, canvas, default, accent1..5, gradients}
    dark_theme          jsonb NOT NULL,
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE project_appearance_overrides (
    id           uuid PRIMARY KEY,
    user_id      uuid NOT NULL REFERENCES "AspNetUsers"(id) ON DELETE CASCADE,
    project_id   uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    font         varchar(64),      -- null = inherit from appearance_profiles
    light_theme  jsonb,            -- null = inherit
    dark_theme   jsonb,            -- null = inherit
    updated_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, project_id)
);

-- ============================================================
-- refresh_tokens (only needed if you use JWT rather than pure cookie+CSRF)
-- ============================================================
CREATE TABLE refresh_tokens (
    id                uuid PRIMARY KEY,
    user_id           uuid NOT NULL REFERENCES "AspNetUsers"(id) ON DELETE CASCADE,
    token_hash        varchar(128) NOT NULL, -- SHA-256 of the token, never store the raw token
    expires_at        timestamptz NOT NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    created_by_ip     varchar(64),
    revoked_at        timestamptz,
    revoked_by_ip     varchar(64),
    replaced_by_hash  varchar(128)
);
CREATE UNIQUE INDEX ix_refresh_tokens_hash ON refresh_tokens (token_hash);
CREATE INDEX ix_refresh_tokens_user        ON refresh_tokens (user_id);

-- ============================================================
-- idempotency_keys — server-side dedupe for clientMutationId
-- ============================================================
CREATE TABLE idempotency_keys (
    client_mutation_id uuid PRIMARY KEY,
    user_id             uuid NOT NULL REFERENCES "AspNetUsers"(id),
    endpoint            varchar(200) NOT NULL,
    request_hash        varchar(64) NOT NULL,  -- SHA-256 of normalized request body
    response_status     int,
    response_body       jsonb,
    created_at          timestamptz NOT NULL DEFAULT now(),
    expires_at          timestamptz NOT NULL
);
CREATE INDEX ix_idempotency_expiry ON idempotency_keys (expires_at);
```

---

## 4. EF Core entities (C#)

```csharp
// Entities/ApplicationUser.cs
public sealed class ApplicationUser : IdentityUser<Guid>
{
    public string DisplayName { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<Project> OwnedProjects { get; set; } = [];
}

// Entities/Project.cs
public sealed class Project
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }
    public ApplicationUser Owner { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public string? Color { get; set; }
    public long Revision { get; set; } = 1;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public Guid CreatedBy { get; set; }
    public Guid UpdatedBy { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }

    public ICollection<Board> Boards { get; set; } = [];
    public ICollection<Tag> Tags { get; set; } = [];
}

// Entities/Board.cs
public sealed class Board
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public string Name { get; set; } = "Board";
    public int SortOrder { get; set; }
    public long Revision { get; set; } = 1;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public Guid CreatedBy { get; set; }
    public Guid UpdatedBy { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }

    public ICollection<BoardItem> Items { get; set; } = [];
}

// Entities/BoardItemType.cs
public enum BoardItemType
{
    Frame, Kanban, Text, Note, Link, Checklist, Line, Document, Diagram,
    Drawing, Database, Timeline, Mindmap, Code, Embed, Image, Icon,
    SectionTitle, Column
}

// Entities/BoardItem.cs
public sealed class BoardItem
{
    public Guid Id { get; set; }
    public Guid BoardId { get; set; }
    public Board Board { get; set; } = null!;
    public Guid? ParentItemId { get; set; }
    public Guid? FrameId { get; set; }
    public BoardItemType Type { get; set; }
    public short SchemaVersion { get; set; } = 1;
    public long SortOrder { get; set; }
    public double PosX { get; set; }
    public double PosY { get; set; }
    public double? Width { get; set; }
    public double? Height { get; set; }
    public int ZIndex { get; set; }
    public bool Locked { get; set; }

    // Stored as jsonb at the EF layer regardless of type; the CLR shape behind it
    // is one of the 20 records in section 8, chosen by `Type` at the service layer
    // (not by EF — see the polymorphic (de)serialization note in section 8).
    public string Appearance { get; set; } = "{}"; // JSON text of ItemAppearanceDto
    public string Data { get; set; } = "{}";        // JSON text of the type-specific *Data record

    public long Revision { get; set; } = 1;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public Guid CreatedBy { get; set; }
    public Guid UpdatedBy { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }

    public ICollection<ItemTag> ItemTags { get; set; } = [];
}

// Entities/ItemLink.cs
public enum ItemLinkKind { LineStart, LineEnd, CreatedFrom }

public sealed class ItemLink
{
    public Guid Id { get; set; }
    public Guid SourceItemId { get; set; }
    public Guid TargetItemId { get; set; }
    public ItemLinkKind Kind { get; set; }
}

// Entities/Tag.cs & ItemTag.cs
public sealed class Tag
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string NormalizedName { get; set; } = string.Empty;
    public ICollection<ItemTag> ItemTags { get; set; } = [];
}

public sealed class ItemTag
{
    public Guid ItemId { get; set; }
    public Guid TagId { get; set; }
    public BoardItem Item { get; set; } = null!;
    public Tag Tag { get; set; } = null!;
}

// Entities/Comment.cs — matches CommentRecord exactly: item-scoped, no threading, full audit fields
public enum CommentStatus { Open, Resolved } // TODO: confirm real values against ItemComment['status'] in types.ts

public sealed class Comment
{
    public Guid Id { get; set; }
    public Guid ItemId { get; set; }
    public Guid AuthorId { get; set; }
    public string Text { get; set; } = string.Empty;
    public CommentStatus Status { get; set; }
    public long Revision { get; set; } = 1;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public Guid CreatedBy { get; set; }
    public Guid UpdatedBy { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
}

// Entities/AppearanceProfile.cs
public sealed class AppearanceProfile
{
    public Guid UserId { get; set; }
    public string Font { get; set; } = "sans";
    public string UiFont { get; set; } = "sans";
    public string UiPrimary { get; set; } = "#7941c8";
    public string UiSecondary { get; set; } = "#000000";
    public int InheritanceVersion { get; set; } = 1;
    public int PaletteVersion { get; set; } = 1;
    public JsonDocument LightTheme { get; set; } = null!;
    public JsonDocument DarkTheme { get; set; } = null!;
    public DateTimeOffset UpdatedAt { get; set; }
}

// Entities/ProjectAppearanceOverride.cs
public sealed class ProjectAppearanceOverride
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid ProjectId { get; set; }
    public string? Font { get; set; }
    public JsonDocument? LightTheme { get; set; }
    public JsonDocument? DarkTheme { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
```

---

## 5. DbContext (Fluent API highlights)

```csharp
public sealed class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<Board> Boards => Set<Board>();
    public DbSet<BoardItem> BoardItems => Set<BoardItem>();
    public DbSet<ItemLink> ItemLinks => Set<ItemLink>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<ItemTag> ItemTags => Set<ItemTag>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<AppearanceProfile> AppearanceProfiles => Set<AppearanceProfile>();
    public DbSet<ProjectAppearanceOverride> ProjectAppearanceOverrides => Set<ProjectAppearanceOverride>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        b.Entity<BoardItem>(e =>
        {
            e.ToTable("board_items");
            e.Property(x => x.Type).HasConversion<string>().HasMaxLength(32);
            e.Property(x => x.Appearance).HasColumnType("jsonb");
            e.Property(x => x.Data).HasColumnType("jsonb");
            e.Property(x => x.Revision).IsConcurrencyToken(); // EF-managed optimistic concurrency

            e.HasOne<Board>().WithMany(x => x.Items).HasForeignKey(x => x.BoardId);
            e.HasOne<BoardItem>().WithMany().HasForeignKey(x => x.FrameId)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasOne<BoardItem>().WithMany().HasForeignKey(x => x.ParentItemId)
             .OnDelete(DeleteBehavior.Cascade);

            // Global filter — every query automatically excludes trashed items,
            // so a forgotten .Where(DeletedAt == null) can never leak them (A01).
            e.HasQueryFilter(x => x.DeletedAt == null);

            e.HasIndex(x => x.BoardId);
            e.HasIndex(x => x.FrameId);
        });

        b.Entity<Project>(e =>
        {
            e.HasQueryFilter(x => x.DeletedAt == null);
            e.HasIndex(x => x.OwnerId);
        });

        b.Entity<Board>(e => e.HasQueryFilter(x => x.DeletedAt == null));

        b.Entity<ItemTag>(e => e.HasKey(x => new { x.ItemId, x.TagId }));

        b.Entity<Tag>(e =>
        {
            e.HasIndex(x => new { x.ProjectId, x.NormalizedName }).IsUnique();
        });

        b.Entity<AppearanceProfile>(e =>
        {
            e.HasKey(x => x.UserId);
            e.Property(x => x.LightTheme).HasColumnType("jsonb");
            e.Property(x => x.DarkTheme).HasColumnType("jsonb");
        });

        b.Entity<ProjectAppearanceOverride>(e =>
        {
            e.HasIndex(x => new { x.UserId, x.ProjectId }).IsUnique();
            e.Property(x => x.LightTheme).HasColumnType("jsonb");
            e.Property(x => x.DarkTheme).HasColumnType("jsonb");
        });
    }
}
```

Concurrency in practice: `Revision` as an EF concurrency token means EF adds
`WHERE revision = @original` to every `UPDATE`/`DELETE` automatically and throws
`DbUpdateConcurrencyException` on 0 affected rows — catch that in your save endpoint,
bump `Revision` yourself in the same call, and return `409 Conflict` with the current
server state, matching your existing `SaveStatus.tsx` conflict-handling UI.

---

## 6. OWASP Top 10 → schema/code decisions

| Risk | What this schema does about it |
|---|---|
| **A01 Broken Access Control** | UUIDv7 (non-enumerable) IDs; every query filtered by `OwnerId`/`project_members` in the repository layer, never trust an `Id` in a request without checking ownership; EF global query filter on `DeletedAt` so trashed rows can't leak. |
| **A02 Cryptographic Failures** | `refresh_tokens.token_hash` stores SHA-256 of the token, never the raw value; PostgreSQL connection with `SSL Mode=VerifyFull` in prod; secrets via env/secret manager, not appsettings. |
| **A03 Injection** | EF Core parameterizes everything by default — the risk is if you ever hand-build SQL against the `jsonb` columns (e.g. `data->>'title' ILIKE @q`); always pass params, never string-interpolate into raw SQL. |
| **A04 Insecure Design** | Idempotency table for `clientMutationId` replay; revision-based optimistic concurrency instead of silent last-write-wins. |
| **A05 Security Misconfiguration** | Least-privilege DB role for the API (no `SUPERUSER`, no `DROP`), migrations run under a separate elevated role. |
| **A07 Identification & Auth Failures** | ASP.NET Identity's built-in lockout/hashing (you already have this in your Identity setup snippet); cookie `HttpOnly` + `SameSite=Strict` + CSRF token, matching your `files-structure.md` plan. |
| **A08 Data Integrity Failures** | `Revision` concurrency tokens on `projects`/`boards`/`board_items` prevent silent overwrite races from the 500ms debounce batching. |
| **A09 Logging/Monitoring** | Not modeled above in detail — recommend a lightweight `audit_log(id, user_id, action, entity_type, entity_id, ip, at, metadata jsonb)` table for auth events, deletes, and role changes. |
| **A10 SSRF** | Relevant to your `embed`/`link`/`image` block `data.url` fields — if you ever fetch link previews server-side, allowlist schemes (`https` only) and block private/internal IP ranges before fetching. |

---

## 8. Per-type `Data` contracts (C#)

Common fragments used below:

```csharp
public sealed record Entry(string Id, string Text, bool Done);
public sealed record Position(double X, double Y);
public sealed record GeoPoint(double X, double Y, double? Pressure);

public sealed record ItemAppearanceDto(
    string? Color, string? ColorRole, GradientDto? Gradient, string? TopColor,
    TypographyDto? Typography, string? TextAlign, string? FontSize, bool? Bold, bool? Italic);
public sealed record GradientDto(string From, string To, string Kind, double Angle);
public sealed record TypographyDto(
    string? FontFamily, double? FontSize, bool? Bold, bool? Italic, string? TextAlign, string? VerticalAlign);
```

The 20 `Data` records, matching `itemSchemas` field-for-field:

```csharp
public sealed record SectionTitleData(string Content);
public sealed record NoteData(string Content);
public sealed record TextData(string Content, string Size); // 'sm'|'md'|'lg'|'xl'
public sealed record DocumentData(string Title, string Content, string ContentFormat, int ContentVersion, bool? AutoHeight);
public sealed record CodeData(string Content, string Language, bool? AutoHeight);
public sealed record IconData(string IconMode, string Source, string Label); // iconMode: preset|emoji|svg|url
public sealed record ImageData(string Url, string Caption, string? Variant, double? ImgHeight);
public sealed record LinkData(string Url, string Title, string Description);
public sealed record EmbedData(string Url, string Title, bool ShowLabel);
public sealed record ChecklistData(string Title, IReadOnlyList<Entry> Entries);
public sealed record KanbanColumnData(string Id, string Title, string Color, double? Width, IReadOnlyList<Entry> Cards);
public sealed record KanbanData(string Title, IReadOnlyList<KanbanColumnData> Columns);
public sealed record TimelineTaskData(string Id, string Title, string Start, string End, bool Done, string Color, IReadOnlyList<Entry> Checklist);
public sealed record TimelineData(string Title, string Mode, double? TaskColumnWidth, IReadOnlyList<TimelineTaskData> Tasks);
public sealed record ColumnData(string Title, string? Layout, double? GridColumns, double? Gap);
public sealed record FrameData(string Title, double? Opacity);
public sealed record DispenserData(string Title);
public sealed record LineData(
    double X2, double Y2, bool ArrowStart, bool ArrowEnd, double StrokeWidth, double? Curve,
    string? LineCap, string? Label, string? LabelMode, double? LabelOffset, double? LabelFontSize, bool? Divider);
public sealed record DrawingStrokeData(IReadOnlyList<GeoPoint> Points, double X, double Y, double ScaleX, double ScaleY, string Color, double StrokeWidth);
public sealed record DrawingData(IReadOnlyList<GeoPoint> Points, double ViewWidth, double ViewHeight, double StrokeWidth, IReadOnlyList<DrawingStrokeData>? Strokes);
public sealed record MindmapNodeData(string Id, string? ParentId, string Label, string Side, string BranchColor, string Background, string TextColor);
public sealed record MindmapData(string Title, string Layout, string LineStyle, double LineWidth, bool Dashed, IReadOnlyList<MindmapNodeData> Nodes);
public sealed record DiagramNodeShapeData(string Label, string Shape, string Color);
public sealed record DiagramNodeData(string Id, Position Position, string Type, DiagramNodeShapeData Data);
public sealed record DiagramEdgeData(string Id, string Source, string Target, string? SourceHandle, string? TargetHandle, string? Label, string? Type);
public sealed record DiagramData(string Title, IReadOnlyList<DiagramNodeData> Nodes, IReadOnlyList<DiagramEdgeData> Edges);
public sealed record DbFieldData(string Id, string Name, string DataType, bool PrimaryKey, bool Nullable, bool Unique, string DefaultValue);
public sealed record DbTableData(string Id, string Name, Position Position, IReadOnlyList<DbFieldData> Fields);
public sealed record DbRelationData(string Id, string Source, string Target, string SourceField, string TargetField, string Cardinality);
public sealed record DatabaseData(string Title, IReadOnlyList<DbTableData> Tables, IReadOnlyList<DbRelationData> Relations);
```

**Choosing the CLR type at runtime**: `board_items.type` is already the discriminator, so don't fight EF
into polymorphic JSON columns — just switch on it in the service layer:

```csharp
public static class BoardItemDataTypes
{
    private static readonly Dictionary<string, Type> Map = new()
    {
        ["section-title"] = typeof(SectionTitleData), ["note"] = typeof(NoteData),
        ["text"] = typeof(TextData), ["document"] = typeof(DocumentData),
        ["code"] = typeof(CodeData), ["icon"] = typeof(IconData),
        ["image"] = typeof(ImageData), ["link"] = typeof(LinkData),
        ["embed"] = typeof(EmbedData), ["checklist"] = typeof(ChecklistData),
        ["kanban"] = typeof(KanbanData), ["timeline"] = typeof(TimelineData),
        ["column"] = typeof(ColumnData), ["frame"] = typeof(FrameData),
        ["dispenser"] = typeof(DispenserData), ["line"] = typeof(LineData),
        ["drawing"] = typeof(DrawingData), ["mindmap"] = typeof(MindmapData),
        ["diagram"] = typeof(DiagramData), ["database"] = typeof(DatabaseData),
    };

    public static object Deserialize(string type, string json) =>
        JsonSerializer.Deserialize(json, Map[type], StrictOptions)!;

    // Rejects unknown JSON properties — the C# equivalent of itemSchema.ts's
    // object() check, which only allows exactly the declared keys (mass-assignment guard).
    public static readonly JsonSerializerOptions StrictOptions = new()
    {
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };
}
```

## 9. Porting `boardValidation.ts` / `itemSchema.ts` to C#

The DB constraints (section 3) are a second line of defense — the real validation has to happen in the
API before anything is written, exactly like `validateItem`/`validateBoard` do today. This needs a
straight, mechanical port; the primitive checks map almost 1:1:

```csharp
public static class Checks
{
    public static bool Text(string? v) => v is { Length: <= 200_000 };
    public static bool Number(double v) => double.IsFinite(v) && Math.Abs(v) <= 10_000_000;
    public static bool Uuid(string? v) => v is not null && Guid.TryParse(v, out _);

    public static bool Url(string v)
    {
        if (v.Length == 0) return true;
        if (v.Length > 4096 || !Uri.TryCreate(v, UriKind.Absolute, out var u)) return false;
        return (u.Scheme is "http" or "https") && string.IsNullOrEmpty(u.UserInfo); // blocks user:pass@host
    }

    public static bool Day(string v) =>
        DateOnly.TryParseExact(v, "yyyy-MM-dd", out var d) && d.ToString("yyyy-MM-dd") == v;
}
```

`ValidateItem` (mirrors `itemSchema.ts`'s `validateItem`):

```csharp
public void ValidateItem(ItemWrite item)
{
    if (item.SchemaVersion != 1) throw new ApiException(422, "unsupported_schema",
        "This board needs a newer client. Editing has been stopped.");

    if (!Checks.Uuid(item.Id) || !Checks.Uuid(item.BoardId)
        || (item.ParentItemId is not null && !Checks.Uuid(item.ParentItemId))
        || (item.FrameId is not null && !Checks.Uuid(item.FrameId))
        || !Checks.Number(item.X) || !Checks.Number(item.Y)
        || (item.Width is not null && (!Checks.Number(item.Width.Value) || item.Width <= 0))
        || (item.Height is not null && (!Checks.Number(item.Height.Value) || item.Height <= 0))
        || Encoding.UTF8.GetByteCount(JsonSerializer.Serialize(item)) > 2_000_000)
    {
        throw new ApiException(422, "invalid_item", $"Invalid {item.Type} content or geometry.");
    }

    // throws JsonException (-> map to 422) on unknown/missing/wrong-typed fields
    BoardItemDataTypes.Deserialize(item.Type, item.DataJson);
}
```

`ValidateBoard` (mirrors `boardValidation.ts` — nesting + frame + link rules):

```csharp
public void ValidateBoard(BoardSnapshot board)
{
    if (board.Items.Count > 20_000) throw new ApiException(422, "board_limit", "The board item limit has been reached.");

    var active = board.Items.Where(i => i.DeletedAt is null).ToList();
    if (board.Items.Select(i => i.Id).Distinct().Count() != board.Items.Count)
        throw new ApiException(422, "duplicate_id", "Duplicate item ID.");

    var byId = active.ToDictionary(i => i.Id);
    foreach (var item in active)
    {
        ValidateItem(item);
        if (item.BoardId != board.Board.Id) throw new ApiException(422, "invalid_scope", "Item belongs to another board.");

        if (item.ParentItemId is { } parentId)
        {
            var canNest = ItemSchemas.CanNest[item.Type];
            if (!canNest || !byId.TryGetValue(parentId, out var parent)
                || parent.Type != "column" || parent.ParentItemId is not null)
                throw new ApiException(422, "invalid_parent", "Invalid column membership.");
        }
        if (item.FrameId is { } frameId &&
            (!byId.TryGetValue(frameId, out var frame) || frame.Type != "frame" || frameId == item.Id))
            throw new ApiException(422, "invalid_frame", "Invalid frame membership.");
    }

    var linkKeys = new HashSet<string>();
    foreach (var link in board.Links)
    {
        byId.TryGetValue(link.SourceItemId, out var source);
        byId.TryGetValue(link.TargetItemId, out var target);
        var key = $"{link.SourceItemId}:{link.Kind}";
        var valid = source is not null && target is not null && source.Id != target.Id && linkKeys.Add(key) &&
            (link.Kind == "created_from"
                ? source.Type == "note" && target.Type == "dispenser"
                : (link.Kind is "line_start" or "line_end") && source.Type == "line");
        if (!valid) throw new ApiException(422, "invalid_link", "Invalid item link.");
    }
}
```

`ItemSchemas.CanNest` is just a static lookup of the `canNest` flags from `itemSchema.ts` — `true` only
for `note, text, document, code, image, link, embed, checklist`.

## 10. Mutation endpoint (`POST /api/v1/boards/{boardId}/mutations`)

One transactional endpoint, matching `BoardMutation` in `records.ts` field-for-field:

```csharp
public sealed record ItemMutationDto(
    ItemWriteDto Item, long? ExpectedRevision, IReadOnlyList<ItemLinkDto> Links,
    IReadOnlyList<CommentUpsertDto> Comments, IReadOnlyList<string> Tags);

public sealed record DeleteDto(Guid Id, long ExpectedRevision);

public sealed record BoardMutationDto(
    Guid ClientMutationId, long ExpectedBoardRevision,
    IReadOnlyList<ItemMutationDto> Upserts, IReadOnlyList<DeleteDto> Deletes);
```

Handler outline:

1. **Idempotency check first**: look up `ClientMutationId` in `idempotency_keys`. If found and not
   expired, replay the stored response verbatim — don't touch the DB again. This is what protects a
   flaky-network retry of the same batch from double-applying.
2. **Auth/ownership**: confirm the caller owns (or has `Editor`+ role on, if you add sharing) the board's
   project — before touching anything else (A01).
3. Open a transaction (`ReadCommitted` is fine — you're doing explicit optimistic-concurrency checks,
   not relying on isolation level for correctness).
4. Check `boards.revision = @ExpectedBoardRevision`; if not, roll back, return `409` with the board's
   current revision.
5. For each upsert: `UPDATE ... WHERE id=@id AND revision=@ExpectedRevision` (or `INSERT` if
   `ExpectedRevision` is null / row doesn't exist); 0 rows affected on an expected update → collect as a
   conflict, don't abort the whole batch yet — `validateBoard`-style batches want partial-conflict
   reporting, not all-or-nothing, so gather all conflicts first.
6. For each upsert, **replace** (delete-then-insert, not diff) that item's rows in `item_links`,
   `item_tags`, and upsert its `comments` — this matches the `records.ts` comment: *"Relations are
   replaced only for the touched item, inside the same transaction."*
7. Run `ValidateBoard` against the affected subset (touched items + anything referencing them via
   `frameId`/`parentItemId`/links) rather than fetching all 20k rows every call.
8. If any conflicts were collected, roll back, return `409` with the conflicting items' current
   server-side `(id, revision, data)` so the client's `SaveStatus.tsx` conflict UI can reconcile.
9. Otherwise bump `boards.revision`, commit, store the response in `idempotency_keys` keyed by
   `ClientMutationId` (short TTL, e.g. 24h), return `200`.

## 11. What would help me refine this further

- Exact values of `ItemComment['status']` (from `types.ts`) — I guessed `open`/`resolved` for the
  `CommentStatus` enum and the DB `status` column comment.
- `types.ts` itself, for `BaseItem`/`BoardItem` — would let me double-check `ItemAppearanceDto` and the
  per-type `Data` records against the actual discriminated union instead of just `itemSchema.ts`'s
  validators.
- Whether "Read-only project sharing" (Future Plans checklist) is happening soon — decides if
  `project_members` ships now or later.
- Your `errors.ts` `fail()` helper's actual HTTP-error shape, so the C# `ApiException`/error responses
  match the frontend's existing error-handling code instead of me guessing a shape.
