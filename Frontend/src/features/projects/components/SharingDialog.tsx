import { useEffect, useState } from 'react';
import type { Project } from '@/entities/project/types';
import type { MemberRole, ProjectMember, ShareLink } from '@/entities/project/shareTypes';
import { sharingApi } from '@/app/services';
import { errorMessage } from '@/shared/api/errors';
import Modal from '@/shared/components/dialogs/Modal';
import './sharing.css';

const roles: MemberRole[] = ['Editor', 'Viewer', 'Commenter'];
const roleLabel = (role: MemberRole) => (role === 'Commenter' ? 'Commenter (read-only)' : role);

export default function SharingDialog({
  project,
  userId,
  onClose,
  onLeave,
}: {
  project: Project;
  userId: string;
  onClose: () => void;
  onLeave: () => void;
}) {
  const owner = project.ownerId === userId;
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('Editor');
  const [label, setLabel] = useState('');
  const [expiry, setExpiry] = useState('');
  const [created, setCreated] = useState<{ id: string; url: string } | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!sharingApi) return;
    let active = true;
    Promise.all([sharingApi.members(project.id), owner ? sharingApi.links(project.id) : Promise.resolve([])])
      .then(([people, urls]) => {
        if (active) {
          setMembers(people);
          setLinks(urls);
        }
      })
      .catch((reason) => {
        if (active) setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [project.id, owner, attempt]);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      onClose={() => {
        if (!busy) onClose();
      }}
      centered
      label={`Share ${project.name}`}
    >
      <section className="sharing-dialog">
        <header className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Share {project.name}</h2>
          <button onClick={onClose} disabled={busy} aria-label="Close sharing">
            Close
          </button>
        </header>
        <p>Your access: {project.role ?? (owner ? 'Owner' : 'Viewer')}</p>
        {error && (
          <div role="alert">
            <p>{error}</p>
            <button
              disabled={busy}
              onClick={() => {
                setBusy(true);
                setError('');
                setAttempt(attempt + 1);
              }}
            >
              Reload sharing
            </button>
          </div>
        )}
        {message && <p role="status">{message}</p>}
        {busy && <p role="status">Updating sharing...</p>}
        <h3 className="font-semibold">Collaborators</h3>
        <p>Share with an existing user's email. Editors can change the board. Viewers and Commenters can read it.</p>
        {owner && (
          <form
            className="sharing-row"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                const member = await sharingApi!.invite(project.id, email.trim(), role);
                setMembers((previous) => [...previous.filter((entry) => entry.userId !== member.userId), member]);
                setEmail('');
                setMessage('Project shared. It will appear in their project list.');
              });
            }}
          >
            <input
              aria-label="Collaborator email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
            />
            <select
              aria-label="Collaborator role"
              value={role}
              onChange={(event) => setRole(event.target.value as MemberRole)}
            >
              {roles.map((value) => (
                <option key={value} value={value}>
                  {roleLabel(value)}
                </option>
              ))}
            </select>
            <button disabled={busy || !email.trim()}>Share project</button>
          </form>
        )}
        {!busy && !members.length && <p>No collaborators yet.</p>}
        {members.map((member) => (
          <div key={member.userId} className="sharing-row">
            <span className="flex-1 min-w-0 break-words">
              {member.displayName || member.email}
              <small className="block">{member.displayName ? member.email : ''}</small>
            </span>
            {owner ? (
              <>
                <select
                  aria-label={`Role for ${member.email}`}
                  disabled={busy}
                  value={member.role}
                  onChange={(event) => {
                    const next = event.target.value as MemberRole;
                    void run(async () => {
                      await sharingApi!.changeRole(project.id, member.userId, next);
                      setMembers((previous) =>
                        previous.map((entry) => (entry.userId === member.userId ? { ...entry, role: next } : entry)),
                      );
                    });
                  }}
                >
                  {roles.map((value) => (
                    <option key={value} value={value}>
                      {roleLabel(value)}
                    </option>
                  ))}
                </select>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await sharingApi!.remove(project.id, member.userId);
                      setMembers((previous) => previous.filter((entry) => entry.userId !== member.userId));
                    })
                  }
                >
                  Remove
                </button>
              </>
            ) : (
              <span>{roleLabel(member.role)}</span>
            )}
          </div>
        ))}
        {!owner && (
          <button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await sharingApi!.remove(project.id, userId);
                onLeave();
              })
            }
          >
            Leave project
          </button>
        )}
        {owner && (
          <>
            <h3 className="font-semibold">Public read-only links</h3>
            <p>Anyone with the link can view this project without an account. Comments are not published.</p>
            <form
              className="sharing-row"
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  const result = await sharingApi!.createLink(
                    project.id,
                    label.trim(),
                    expiry ? new Date(expiry).toISOString() : null,
                  );
                  setLinks((previous) => [result.link, ...previous]);
                  setCreated({
                    id: result.link.id,
                    url: new URL(
                      `${import.meta.env.BASE_URL}shared/${encodeURIComponent(result.token)}`,
                      window.location.origin,
                    ).href,
                  });
                  setLabel('');
                  setExpiry('');
                });
              }}
            >
              <input
                aria-label="Link label"
                maxLength={100}
                placeholder="Label (optional)"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
              <label>
                Expires (optional)
                <input
                  aria-label="Link expiry"
                  type="datetime-local"
                  value={expiry}
                  onChange={(event) => setExpiry(event.target.value)}
                />
              </label>
              <button disabled={busy}>Create link</button>
            </form>
            {created && (
              <div className="sharing-created">
                <p>Copy this link now. It cannot be retrieved after closing this dialog.</p>
                <input
                  aria-label="New public link"
                  readOnly
                  value={created.url}
                  onFocus={(event) => event.target.select()}
                />
                <button
                  onClick={() =>
                    void run(async () => {
                      await navigator.clipboard.writeText(created.url);
                      setMessage('Link copied.');
                    })
                  }
                >
                  Copy link
                </button>
                <a href={created.url} target="_blank" rel="noreferrer">
                  Open link
                </a>
              </div>
            )}
            {!busy && !links.length && <p>No public links.</p>}
            {links.map((link) => (
              <div className="sharing-row" key={link.id}>
                <span className="flex-1">
                  {link.label || 'Public link'}
                  <small className="block">
                    {link.expiresAt ? `Expires ${new Date(link.expiresAt).toLocaleString()}` : 'No expiry'}
                    {link.expiresAt && Date.parse(link.expiresAt) <= Date.now() ? ' / Expired' : ''}
                    {link.lastAccessedAt
                      ? ` / Last used ${new Date(link.lastAccessedAt).toLocaleString()}`
                      : ' / Not used yet'}
                  </small>
                </span>
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await sharingApi!.revoke(project.id, link.id);
                      setLinks((previous) => previous.filter((entry) => entry.id !== link.id));
                      if (created?.id === link.id) setCreated(null);
                    })
                  }
                >
                  Revoke
                </button>
              </div>
            ))}
          </>
        )}
      </section>
    </Modal>
  );
}
