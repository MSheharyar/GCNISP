import { useState } from 'react';
import { UserPlus, Shield, ShieldCheck, Eye, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../services/auth';
import { useApi } from '../lib/useApi';
import { formatDate, initials } from '../lib/format';
import type { StaffUser, UserRole } from '../types';
import { Card, Avatar, Button, Modal, LoadError, cn } from '../components/ui/primitives';

const ROLE_META: Record<UserRole, { label: string; icon: typeof Shield; className: string; desc: string }> = {
  admin: { label: 'Admin', icon: ShieldCheck, className: 'bg-brand-50 text-brand-700', desc: 'Full access + staff + delete' },
  operator: { label: 'Operator', icon: Shield, className: 'bg-emerald-50 text-emerald-700', desc: 'Add/edit customers, log charges' },
  viewer: { label: 'Viewer', icon: Eye, className: 'bg-slate-100 text-slate-600', desc: 'Read-only' },
};

const inputCls =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

export default function Staff() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [reload, setReload] = useState(0);
  const { data: staff, loading, error } = useApi(() => api.staff(), [reload]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [manage, setManage] = useState<StaffUser | null>(null);

  if (error) return <LoadError message={error} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Manage who can access the system and what they can do.</p>
        {isAdmin && (
          <Button variant="primary" onClick={() => setInviteOpen(true)}>
            <UserPlus size={16} /> Invite staff
          </Button>
        )}
      </div>

      {/* Role legend */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(Object.keys(ROLE_META) as UserRole[]).map((r) => {
          const m = ROLE_META[r];
          const Icon = m.icon;
          return (
            <Card key={r} className="flex items-center gap-3 p-4">
              <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg', m.className)}>
                <Icon size={18} />
              </span>
              <div>
                <div className="text-sm font-semibold text-slate-800">{m.label}</div>
                <div className="text-[12px] text-slate-400">{m.desc}</div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-[12px] uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2.5 font-medium">Staff member</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Last active</th>
                <th className="px-5 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">Loading…</td>
                </tr>
              )}
              {staff?.map((u) => {
                const m = ROLE_META[u.role];
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar label={initials(u.name)} />
                        <div>
                          <div className="text-[13px] font-medium text-slate-800">{u.name}</div>
                          <div className="text-[12px] text-slate-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex rounded-md px-2 py-0.5 text-xs font-medium', m.className)}>{m.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1.5 text-[13px]', u.isActive ? 'text-emerald-600' : 'text-slate-400')}>
                        <span className={cn('h-2 w-2 rounded-full', u.isActive ? 'bg-emerald-500' : 'bg-slate-300')} />
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-slate-500">{u.lastActive ? formatDate(u.lastActive) : '—'}</td>
                    <td className="px-5 py-3 text-right">
                      {isAdmin ? (
                        <Button size="sm" variant="ghost" onClick={() => setManage(u)}>
                          Manage
                        </Button>
                      ) : (
                        <span className="text-[12px] text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} onDone={() => { setInviteOpen(false); setReload((r) => r + 1); }} />
      {manage && (
        <ManageModal
          user={manage}
          isSelf={manage.id === user?.id}
          onClose={() => setManage(null)}
          onDone={() => { setManage(null); setReload((r) => r + 1); }}
        />
      )}
    </div>
  );
}

function InviteModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSaving(true);
    setError('');
    try {
      await api.createStaff({
        name: String(fd.get('name') ?? '').trim(),
        email: String(fd.get('email') ?? '').trim(),
        role: String(fd.get('role')) as UserRole,
        password: String(fd.get('password') ?? ''),
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
      setSaving(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Invite staff">
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Full name</label>
          <input name="name" required className={inputCls} placeholder="e.g. Ali Raza" />
        </div>
        <div>
          <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Email</label>
          <input name="email" type="email" required className={inputCls} placeholder="name@gcn.pk" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Role</label>
            <select name="role" className={inputCls} defaultValue="operator">
              <option value="admin">Admin</option>
              <option value="operator">Operator</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Temp password</label>
            <input name="password" required minLength={6} className={inputCls} placeholder="min 6 chars" />
          </div>
        </div>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Inviting…' : 'Invite'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ManageModal({ user, isSelf, onClose, onDone }: { user: StaffUser; isSelf: boolean; onClose: () => void; onDone: () => void }) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await api.updateStaff(user.id, { role, isActive });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    setError('');
    try {
      await api.deleteStaff(user.id);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
      setDeleting(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Manage ${user.name}`}>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[12.5px] font-medium text-slate-600">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            disabled={isSelf}
            className={inputCls}
          >
            <option value="admin">Admin — full access</option>
            <option value="operator">Operator — add/edit, log charges</option>
            <option value="viewer">Viewer — read-only</option>
          </select>
          {isSelf && <p className="mt-1 text-[11.5px] text-slate-400">You can't change your own role.</p>}
        </div>
        <label className="flex items-center gap-2 text-[13px] font-medium text-slate-600">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Account active (can sign in)
        </label>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700">{error}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
        </div>

        {/* Danger zone — remove a staff member who left */}
        {!isSelf && (
          <div className="mt-2 rounded-lg border border-red-100 bg-red-50/50 p-3">
            {!confirmDelete ? (
              <div className="flex items-center justify-between gap-3">
                <div className="text-[12.5px] text-slate-600">
                  <div className="font-medium text-slate-700">Remove from company</div>
                  Deletes their login. Past records keep their name.
                </div>
                <Button size="sm" variant="ghost" className="!text-red-600 hover:!bg-red-100" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={14} /> Delete
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[13px] font-medium text-red-700">Delete {user.name}? This can't be undone.</p>
                <div className="flex justify-end gap-2">
                  <Button size="sm" type="button" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                  <Button size="sm" variant="primary" className="!bg-red-600 hover:!bg-red-700" onClick={remove} disabled={deleting}>
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
