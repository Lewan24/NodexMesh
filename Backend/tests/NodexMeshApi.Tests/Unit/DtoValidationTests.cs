using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using FluentAssertions;
using NodexMeshApi.Dtos;
using NodexMeshApi.Services;
using Xunit;

namespace NodexMeshApi.Tests.Unit;

public class DtoValidationTests
{
    private static IReadOnlyList<ValidationResult> Validate(IValidatableObject dto) =>
        dto.Validate(new ValidationContext(dto)).ToList();

    private static JsonElement EmptyObject() => JsonDocument.Parse("{}").RootElement;

    // ---------------- RegisterRequest ----------------

    [Fact]
    public void RegisterRequest_AcceptsAStrongMatchingPassword()
    {
        var request = new RegisterRequest("user@example.com", "Str0ng!Passw0rd", "Str0ng!Passw0rd", "User", true);
        Validate(request).Should().BeEmpty();
    }

    [Theory]
    [InlineData("alllowercase123!", "an uppercase letter")]
    [InlineData("ALLUPPERCASE123!", "a lowercase letter")]
    [InlineData("NoDigitsHere!!!!", "a digit")]
    [InlineData("NoSpecialChar123", "a special character")]
    public void RegisterRequest_RejectsPasswordsMissingARequiredCharacterClass(string password, string expectedFragment)
    {
        var request = new RegisterRequest("user@example.com", password, password, "User", true);
        var errors = Validate(request);

        errors.Should().Contain(e => e.ErrorMessage!.Contains(expectedFragment));
    }

    [Fact]
    public void RegisterRequest_RejectsMismatchedConfirmation()
    {
        var request = new RegisterRequest("user@example.com", "Str0ng!Passw0rd", "Different!Passw0rd1", "User", true);
        var errors = Validate(request);

        errors.Should().Contain(e => e.MemberNames.Contains(nameof(RegisterRequest.ConfirmPassword)));
    }

    // ---------------- ChangePasswordRequest ----------------

    [Fact]
    public void ChangePasswordRequest_RejectsMismatchedConfirmation()
    {
        var request = new ChangePasswordRequest("oldpw", "NewPassword123!", "Different123!");
        Validate(request).Should().ContainSingle(e => e.MemberNames.Contains(nameof(ChangePasswordRequest.ConfirmPassword)));
    }

    [Fact]
    public void ChangePasswordRequest_AcceptsMatchingConfirmation()
    {
        var request = new ChangePasswordRequest("oldpw", "NewPassword123!", "NewPassword123!");
        Validate(request).Should().BeEmpty();
    }

    // ---------------- BoardMutationDto ----------------

    private static ItemWriteDto DummyItem(Guid id, Guid boardId) => new(
        id, boardId, null, null, 0, 0, 0, null, null, 0, false,
        "note", 1, EmptyObject(), JsonSerializer.SerializeToElement(new { content = "x" }));

    [Fact]
    public void BoardMutationDto_RejectsEmptyClientMutationId()
    {
        var boardId = Guid.NewGuid();
        var item = DummyItem(Guid.NewGuid(), boardId);
        var dto = new BoardMutationDto(Guid.Empty, 1,
            [new ItemMutationDto(item, null, [], [], [])], []);

        Validate(dto).Should().Contain(e => e.MemberNames.Contains(nameof(BoardMutationDto.ClientMutationId)));
    }

    [Fact]
    public void BoardMutationDto_RejectsAnEmptyMutation()
    {
        var dto = new BoardMutationDto(Guid.NewGuid(), 1, [], []);
        Validate(dto).Should().Contain(e => e.ErrorMessage!.Contains("at least one change"));
    }

    [Fact]
    public void BoardMutationDto_RejectsBatchesLargerThanTheConfiguredMaximum()
    {
        var boardId = Guid.NewGuid();
        var upserts = Enumerable.Range(0, BoardValidator.MaxUpsertsPerBatch + 1)
            .Select(_ => new ItemMutationDto(DummyItem(Guid.NewGuid(), boardId), null, [], [], []))
            .ToList();
        var dto = new BoardMutationDto(Guid.NewGuid(), 1, upserts, []);

        Validate(dto).Should().Contain(e => e.ErrorMessage!.Contains("at most"));
    }

    [Fact]
    public void BoardMutationDto_RejectsDuplicateIdsAcrossUpsertsAndDeletes()
    {
        var boardId = Guid.NewGuid();
        var sharedId = Guid.NewGuid();
        var dto = new BoardMutationDto(Guid.NewGuid(), 1,
            [new ItemMutationDto(DummyItem(sharedId, boardId), 1, [], [], [])],
            [new ItemDeleteDto(sharedId, 1)]);

        Validate(dto).Should().Contain(e => e.ErrorMessage!.Contains("Duplicate item ID"));
    }

    [Fact]
    public void BoardMutationDto_AcceptsAWellFormedSingleUpsert()
    {
        var boardId = Guid.NewGuid();
        var dto = new BoardMutationDto(Guid.NewGuid(), 1,
            [new ItemMutationDto(DummyItem(Guid.NewGuid(), boardId), null, [], [], [])], []);

        Validate(dto).Should().BeEmpty();
    }

    // ---------------- Role DTOs (Owner must never be grantable) ----------------

    [Theory]
    [InlineData("Editor")]
    [InlineData("Commenter")]
    [InlineData("Viewer")]
    public void InviteMemberRequest_AcceptsNonOwnerRoles(string role)
    {
        var dto = new InviteMemberRequest("person@example.com", role);
        Validate(dto).Should().BeEmpty();
    }

    [Theory]
    [InlineData("Owner")]
    [InlineData("None")]
    [InlineData("SuperAdmin")]
    [InlineData("")]
    public void InviteMemberRequest_RejectsOwnerOrInvalidRoles(string role)
    {
        var dto = new InviteMemberRequest("person@example.com", role);
        Validate(dto).Should().NotBeEmpty();
    }

    [Theory]
    [InlineData("Owner")]
    [InlineData("None")]
    public void AdminAddProjectMemberRequest_RejectsOwnerAndNone(string role)
    {
        var dto = new AdminAddProjectMemberRequest("person@example.com", role);
        Validate(dto).Should().NotBeEmpty();
    }

    [Theory]
    [InlineData("Editor")]
    [InlineData("Commenter")]
    [InlineData("Viewer")]
    public void AdminAddProjectMemberRequest_AcceptsNonOwnerRoles(string role)
    {
        var dto = new AdminAddProjectMemberRequest("person@example.com", role);
        Validate(dto).Should().BeEmpty();
    }

    [Fact]
    public void UpdateMemberRoleRequest_RejectsOwnerRole()
    {
        var dto = new UpdateMemberRoleRequest("Owner");
        Validate(dto).Should().NotBeEmpty();
    }
}
