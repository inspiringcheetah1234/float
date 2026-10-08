"use client";

import { useState } from "react";
import { KeyRoundIcon, PencilIcon, PlusIcon, ShieldOffIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAction } from "@/components/app/use-action";
import { addUser, resetUserMfa, resetUserPassword, updateUser } from "@/server/actions/settings";

interface U { id: string; full_name: string; email: string; phone: string | null; role_id: string; is_active: boolean; updated_at: string }
interface R { id: string; key: string; name: string }

function randomPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"[b % 56]).join("");
}

export function UsersTable({ users, roles, canEdit, isOwner, me }: { users: U[]; roles: R[]; canEdit: boolean; isOwner: boolean; me: string }) {
  const { run, pending, dialog } = useAction();
  const [adding, setAdding] = useState(false);
  const [nu, setNu] = useState({ full_name: "", email: "", role_id: roles.find((r) => r.key === "associate")?.id ?? "", password: "" });
  const [editing, setEditing] = useState<(U & { draft: { full_name: string; phone: string; role_id: string; is_active: boolean } }) | null>(null);
  const [tempPassword, setTempPassword] = useState<{ email: string; password: string } | null>(null);
  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? "";
  const assignable = roles.filter((r) => r.key !== "owner" || isOwner);

  return (
    <div className="grid gap-3">
      {canEdit && (
        <div><Button size="sm" onClick={() => { setNu((p) => ({ ...p, password: randomPassword() })); setAdding(true); }}><PlusIcon /> Add user</Button></div>
      )}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              {canEdit && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name}{u.id === me && <span className="ml-1 text-xs text-muted-foreground">(you)</span>}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{roleName(u.role_id)}</TableCell>
                <TableCell>{u.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Deactivated</Badge>}</TableCell>
                {canEdit && (
                  <TableCell className="text-right">
                    <Button size="xs" variant="ghost" onClick={() => setEditing({ ...u, draft: { full_name: u.full_name, phone: u.phone ?? "", role_id: u.role_id, is_active: u.is_active } })}>
                      <PencilIcon /> Edit
                    </Button>
                    <Button size="xs" variant="ghost" title="Set a new temporary password"
                      onClick={() => {
                        const password = randomPassword();
                        if (!confirm(`Set a new temporary password for ${u.full_name}?`)) return;
                        run(() => resetUserPassword(u.id, password), { onSuccess: () => setTempPassword({ email: u.email, password }) });
                      }}>
                      <KeyRoundIcon /> Password
                    </Button>
                    {isOwner && (
                      <Button size="xs" variant="ghost" title="Remove their authenticator (lost phone)"
                        onClick={() => confirm(`Reset two-factor authentication for ${u.full_name}? They will set it up again at next sign-in.`) &&
                          run(() => resetUserMfa(u.id), { onSuccess: (d) => toast.success(d.removed ? "Two-factor authentication reset" : "They had no authenticator set up") })}>
                        <ShieldOffIcon /> 2FA
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">The Owner and anyone with credentials-vault access must use an authenticator app (TOTP). Deactivated users cannot sign in; their history is kept.</p>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>Share the temporary password privately. Ask them to change it after signing in.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5"><Label htmlFor="nu-name">Full name</Label><Input id="nu-name" value={nu.full_name} onChange={(e) => setNu({ ...nu, full_name: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label htmlFor="nu-email">Email</Label><Input id="nu-email" type="email" value={nu.email} onChange={(e) => setNu({ ...nu, email: e.target.value })} /></div>
            <div className="grid gap-1.5">
              <Label htmlFor="nu-role">Role</Label>
              <NativeSelect id="nu-role" value={nu.role_id} onChange={(e) => setNu({ ...nu, role_id: e.target.value })}>
                {assignable.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </NativeSelect>
            </div>
            <div className="grid gap-1.5"><Label htmlFor="nu-pw">Temporary password</Label><Input id="nu-pw" className="font-mono" value={nu.password} onChange={(e) => setNu({ ...nu, password: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button disabled={pending} onClick={() => run(() => addUser(nu), {
              success: `${nu.full_name} added`,
              onSuccess: () => { setTempPassword({ email: nu.email, password: nu.password }); setAdding(false); setNu({ ...nu, full_name: "", email: "" }); },
            })}>Add user</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit {editing?.full_name}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid gap-1.5"><Label htmlFor="eu-name">Full name</Label><Input id="eu-name" value={editing.draft.full_name} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, full_name: e.target.value } })} /></div>
              <div className="grid gap-1.5"><Label htmlFor="eu-phone">Phone</Label><Input id="eu-phone" value={editing.draft.phone} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, phone: e.target.value } })} /></div>
              <div className="grid gap-1.5">
                <Label htmlFor="eu-role">Role</Label>
                <NativeSelect id="eu-role" value={editing.draft.role_id} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, role_id: e.target.value } })}
                  disabled={!isOwner && roles.find((r) => r.id === editing.role_id)?.key === "owner"}>
                  {roles.filter((r) => r.key !== "owner" || isOwner || r.id === editing.role_id).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </NativeSelect>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={editing.draft.is_active} disabled={editing.id === me} onChange={(e) => setEditing({ ...editing, draft: { ...editing.draft, is_active: e.target.checked } })} />
                Active (can sign in)
              </label>
            </div>
          )}
          <DialogFooter>
            <Button disabled={pending} onClick={() => editing && run((tok) => updateUser(editing.id, tok ?? editing.updated_at, editing.draft), { success: "User updated", onSuccess: () => setEditing(null) })}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={tempPassword !== null} onOpenChange={(o) => !o && setTempPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Temporary password</DialogTitle>
            <DialogDescription>Shown once. Share it privately with {tempPassword?.email}.</DialogDescription>
          </DialogHeader>
          <code className="rounded bg-muted px-3 py-2 font-mono text-sm" data-testid="temp-password">{tempPassword?.password}</code>
          <DialogFooter><Button onClick={() => setTempPassword(null)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      {dialog}
    </div>
  );
}
