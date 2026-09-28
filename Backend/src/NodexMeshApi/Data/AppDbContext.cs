using NodexMeshApi.Auditing;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Common;
using NodexMeshApi.Models;

namespace NodexMeshApi.Data;

/// <summary>
/// IdentityUserContext (not IdentityDbContext) — no AspNetRoles/UserRoles tables.
/// This app has no global RBAC; all authorization is per-project (see ProjectRole /
/// ProjectAccessService), checked fresh from project_members on each request.
/// </summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options, IHttpContextAccessor? httpAccessor = null)
    : IdentityUserContext<ApplicationUser, Guid>(options)
{
    public DbSet<AuditDetectionCheckpoint> AuditDetectionCheckpoints => Set<AuditDetectionCheckpoint>();
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();
    public DbSet<SecurityIncident> SecurityIncidents => Set<SecurityIncident>();

    public override async Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken ct = default)
    {
        var events = AuditCapture.TrackChanges(this, httpAccessor?.HttpContext);
        try { return await base.SaveChangesAsync(acceptAllChangesOnSuccess, ct); }
        catch
        {
            // A caller may retry a failed mutation; do not retain provisional success records.
            foreach (var audit in events) Entry(audit).State = EntityState.Detached;
            throw;
        }
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        var events = AuditCapture.TrackChanges(this, httpAccessor?.HttpContext);
        try { return base.SaveChanges(acceptAllChangesOnSuccess); }
        catch
        {
            foreach (var audit in events) Entry(audit).State = EntityState.Detached;
            throw;
        }
    }

    public DbSet<LibraryAsset> LibraryAssets => Set<LibraryAsset>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();
    public DbSet<ProjectShareLink> ProjectShareLinks => Set<ProjectShareLink>();
    public DbSet<Board> Boards => Set<Board>();
    public DbSet<BoardItem> BoardItems => Set<BoardItem>();
    public DbSet<ItemLink> ItemLinks => Set<ItemLink>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<ItemTag> ItemTags => Set<ItemTag>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<AppearanceProfile> AppearanceProfiles => Set<AppearanceProfile>();
    public DbSet<ProjectAppearanceOverride> ProjectAppearanceOverrides => Set<ProjectAppearanceOverride>();
    public DbSet<IdempotencyKey> IdempotencyKeys => Set<IdempotencyKey>();
    public DbSet<SystemSettings> SystemSettings => Set<SystemSettings>();
    public DbSet<EmailOutboxMessage> EmailOutbox => Set<EmailOutboxMessage>();
    public DbSet<EmailTemplate> EmailTemplates => Set<EmailTemplate>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);
        b.Entity<AuditDetectionCheckpoint>().HasKey(x => x.Id);
        b.Entity<AuditEvent>(e =>
        {
            e.ToTable("audit_events");
            e.HasKey(x => x.Id);
            e.Property(x => x.Category).HasMaxLength(16);
            e.Property(x => x.EventType).HasMaxLength(100);
            e.Property(x => x.Severity).HasMaxLength(16);
            e.Property(x => x.Outcome).HasMaxLength(16);
            e.Property(x => x.UserAgent).HasMaxLength(256);
            e.Property(x => x.Route).HasMaxLength(256);
            e.Property(x => x.Method).HasMaxLength(16);
            e.Property(x => x.ResourceType).HasMaxLength(64);
            e.Property(x => x.ResourceId).HasMaxLength(128);
            e.Property(x => x.TraceId).HasMaxLength(64);
            e.Property(x => x.RequestId).HasMaxLength(128);
            e.Property(x => x.AccountKey).HasMaxLength(64);
            e.Property(x => x.Metadata).HasColumnType("jsonb");
            if (Database.IsNpgsql())
                e.Property(x => x.ClientIp).HasConversion(
                    value => value == null ? null : System.Net.IPAddress.Parse(value),
                    value => value == null ? null : value.ToString()).HasColumnType("inet");
            e.HasIndex(x => x.OccurredAt);
            e.HasIndex(x => new { x.Category, x.OccurredAt });
            e.HasIndex(x => new { x.EventType, x.OccurredAt });
            e.HasIndex(x => new { x.ActorId, x.OccurredAt });
            e.HasIndex(x => new { x.TargetUserId, x.OccurredAt });
            e.HasIndex(x => new { x.ProjectId, x.OccurredAt });
            e.HasIndex(x => new { x.ClientIp, x.OccurredAt });
            e.HasIndex(x => new { x.AccountKey, x.OccurredAt });
            e.HasIndex(x => new { x.Severity, x.OccurredAt });
            e.HasIndex(x => x.RequestId);
        });
        b.Entity<SecurityIncident>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Rule).HasMaxLength(64);
            e.Property(x => x.Subject).HasMaxLength(128);
            e.Property(x => x.Severity).HasMaxLength(16);
            e.Property(x => x.Status).HasMaxLength(16);
            e.HasIndex(x => new { x.Rule, x.Subject, x.WindowStart }).IsUnique();
            e.HasIndex(x => new { x.Status, x.WindowStart });
        });

        b.Entity<LibraryAsset>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.ContentType).HasMaxLength(255);
            e.Property(x => x.ShareToken).HasMaxLength(64);
            e.HasIndex(x => x.ShareToken).IsUnique();
            e.Property(x => x.ShareTokenHash).HasMaxLength(64);
            e.HasIndex(x => x.ShareTokenHash).IsUnique();
            e.HasIndex(x => x.ProjectId);
            e.HasOne<Project>().WithMany().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<LibraryAsset>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.ContentType).HasMaxLength(255);
            e.Property(x => x.ShareToken).HasMaxLength(64);
            e.HasIndex(x => x.ShareToken).IsUnique();
            e.Property(x => x.ShareTokenHash).HasMaxLength(64);
            e.HasIndex(x => x.ShareTokenHash).IsUnique();
            e.HasIndex(x => x.ProjectId);
            e.HasOne<Project>().WithMany().HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Cascade);
        });

        // ---------------- RefreshToken ----------------
        b.Entity<RefreshToken>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.TokenHash).IsUnique();
            e.Property(x => x.RevokedAtUtc).IsConcurrencyToken();
            e.HasIndex(x => x.UserId);
            e.Property(x => x.TokenHash).HasMaxLength(128);
        });

        b.Entity<SystemSettings>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.EmailHost).HasMaxLength(255);
            e.Property(x => x.EmailUsername).HasMaxLength(255);
            e.Property(x => x.EmailFromAddress).HasMaxLength(256);
            e.Property(x => x.EmailFromName).HasMaxLength(100);
            e.Property(x => x.EmailPublicBaseUrl).HasMaxLength(2048);
        });

        b.Entity<EmailOutboxMessage>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Kind).HasMaxLength(64);
            e.Property(x => x.LastError).HasMaxLength(512);
            e.HasIndex(x => new { x.SentAt, x.DeadLetteredAt, x.AvailableAt });
            e.HasIndex(x => x.LeaseId);
        });

        b.Entity<EmailTemplate>(e =>
        {
            e.HasKey(x => x.Key);
            e.Property(x => x.Key).HasMaxLength(64);
            e.Property(x => x.Name).HasMaxLength(100);
            e.Property(x => x.Description).HasMaxLength(500);
            e.Property(x => x.SubjectTemplate).HasMaxLength(200);
            e.Property(x => x.VariablesCsv).HasMaxLength(500);
        });

        // ---------------- Project ----------------
        b.Entity<Project>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.Color).HasMaxLength(9);
            e.Property(x => x.Revision).IsConcurrencyToken();
            e.HasIndex(x => x.OwnerId);
            e.HasIndex(x => x.UserDeletedAt);
            e.HasQueryFilter(x => x.DeletedAt == null && x.UserDeletedAt == null);
        });

        // ---------------- ProjectMember ----------------
        b.Entity<ProjectMember>(e =>
        {
            e.HasKey(x => new { x.ProjectId, x.UserId });
            e.Property(x => x.Role)
                .HasConversion<string>()
                .HasMaxLength(16);
            // Column names here are snake_case: UseSnakeCaseNamingConvention rewrites them,
            // and raw SQL in check constraints is NOT rewritten for you.
            e.ToTable(t => t.HasCheckConstraint(
                "ck_project_members_role", "role IN ('Editor','Commenter','Viewer')"));
            e.HasOne<Project>().WithMany(p => p.Members).HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ---------------- ProjectShareLink ----------------
        b.Entity<ProjectShareLink>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.TokenHash).HasMaxLength(128);
            e.Property(x => x.Label).HasMaxLength(100);

            // Unique + the lookup path for every anonymous request, so it must be indexed.
            e.HasIndex(x => x.TokenHash).IsUnique();
            e.HasIndex(x => x.ProjectId);

            // Deleting a project hard-deletes its links: a revoked project must not leave
            // live public tokens behind.
            e.HasOne<Project>().WithMany().HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ---------------- Board ----------------
        b.Entity<Board>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(200);
            e.Property(x => x.Revision).IsConcurrencyToken();
            e.HasOne<Project>().WithMany(p => p.Boards).HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.ProjectId);
            e.HasQueryFilter(x => x.DeletedAt == null);
        });

        // ---------------- BoardItem ----------------
        b.Entity<BoardItem>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Type).HasMaxLength(32);
            e.Property(x => x.Appearance).HasColumnType("jsonb");
            e.Property(x => x.Data).HasColumnType("jsonb");
            e.Property(x => x.Revision).IsConcurrencyToken();

            e.HasOne<Board>().WithMany(bo => bo.Items).HasForeignKey(x => x.BoardId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne<BoardItem>().WithMany().HasForeignKey(x => x.FrameId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne<BoardItem>().WithMany().HasForeignKey(x => x.ParentItemId)
                .OnDelete(DeleteBehavior.Cascade);

            e.ToTable(t =>
            {
                t.HasCheckConstraint("ck_board_items_type",
                    "type IN ('board','section-title','note','text','document','code','icon','image','file','link'," +
                    "'embed','checklist','kanban','timeline','column','frame','dispenser','line'," +
                    "'drawing','mindmap','diagram','database')");
                t.HasCheckConstraint("ck_board_items_width", "width IS NULL OR width > 0");
                t.HasCheckConstraint("ck_board_items_height", "height IS NULL OR height > 0");
            });

            // Global soft-delete filter — a forgotten .Where(DeletedAt == null) can never
            // leak trashed items (OWASP A01).
            e.HasQueryFilter(x => x.DeletedAt == null);

            e.HasIndex(x => x.BoardId);
            e.HasIndex(x => x.FrameId);
            e.HasIndex(x => x.ParentItemId);
        });

        // ---------------- ItemLink ----------------
        b.Entity<ItemLink>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Kind).HasConversion<string>().HasMaxLength(16);
            e.HasOne<BoardItem>().WithMany().HasForeignKey(x => x.SourceItemId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne<BoardItem>().WithMany().HasForeignKey(x => x.TargetItemId).OnDelete(DeleteBehavior.Cascade);
            // boardValidation.ts: at most one link per (sourceItemId, kind)
            e.HasIndex(x => new { x.SourceItemId, x.Kind }).IsUnique();
            e.HasIndex(x => x.TargetItemId);
            e.ToTable(t => t.HasCheckConstraint("ck_item_links_no_self", "source_item_id <> target_item_id"));
        });

        // ---------------- Tag / ItemTag ----------------
        b.Entity<Tag>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(64);
            e.Property(x => x.NormalizedName).HasMaxLength(64);
            e.HasIndex(x => new { x.ProjectId, x.NormalizedName }).IsUnique();
            e.HasOne<Project>().WithMany(p => p.Tags).HasForeignKey(x => x.ProjectId).OnDelete(DeleteBehavior.Cascade);
        });

        b.Entity<ItemTag>(e =>
        {
            e.HasKey(x => new { x.ItemId, x.TagId });
            e.HasOne<BoardItem>().WithMany(i => i.ItemTags).HasForeignKey(x => x.ItemId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne<Tag>().WithMany(t => t.ItemTags).HasForeignKey(x => x.TagId).OnDelete(DeleteBehavior.Cascade);
        });

        // ---------------- Comment ----------------
        b.Entity<Comment>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(16);
            e.Property(x => x.Revision).IsConcurrencyToken();
            e.HasOne<BoardItem>().WithMany(i => i.Comments).HasForeignKey(x => x.ItemId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => x.ItemId);
            e.HasQueryFilter(x => x.DeletedAt == null);
        });

        // ---------------- Appearance ----------------
        b.Entity<AppearanceProfile>(e =>
        {
            e.HasKey(x => x.UserId);
            e.Property(x => x.LightTheme).HasColumnType("jsonb");
            e.Property(x => x.DarkTheme).HasColumnType("jsonb");
        });

        b.Entity<ProjectAppearanceOverride>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.LightTheme).HasColumnType("jsonb");
            e.Property(x => x.DarkTheme).HasColumnType("jsonb");
            e.HasIndex(x => new { x.UserId, x.ProjectId }).IsUnique();
        });

        // ---------------- IdempotencyKey ----------------
        b.Entity<IdempotencyKey>(e =>
        {
            e.HasKey(x => x.ClientMutationId);
            e.Property(x => x.ResponseBody).HasColumnType("jsonb");
            e.HasIndex(x => x.ExpiresAt);
        });
    }
}
