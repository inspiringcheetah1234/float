"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAction } from "@/components/app/use-action";
import { MODULES } from "@/lib/domain/labels";
import { addRole, saveRolePermissions } from "@/server/actions/settings";

type Level = "none" | "view" | "edit";
interface Role { id: string; key: string; name: string; is_system: boolean; members: number }
interface Perm { role_id: string; module: string; can_view: boolean; can_edit: boolean }

export function PermissionMatrix({ roles, perms, canEdit }: { roles: Role[]; perms: Perm[]; canEdit: boolean }) {
  const initial = Object.fromEntries(
    roles.map((r) => [r.id, Object.fromEntries(MODULES.map((m) => {
      const p = perms.find((x) => x.role_id === r.id && x.module === m.value);
      return [m.value, (p?.can_edit ? "edit" : p?.can_view ? "view" : "none") as Level];
    }))]),
  ) as Record<string, Record<string, Level>>;
  const [matrix, setMatrix] = useState(initial);
  const [newRole, setNewRole] = useState("");
  const { run, pending, dialog } = useAction();
  const dirty = (roleId: string) => JSON.stringify(matrix[roleId]) !== JSON.stringify(initial[roleId]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Who can see and change what</CardTitle>
          <CardDescription>
            Enforced by the database for every request. Vault access also requires two-factor authentication. Clerks have no vault or fee access by default.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Role</TableHead>
              {MODULES.map((m) => <TableHead key={m.value}>{m.label}</TableHead>)}
              {canEdit && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  {r.name}
                  <div className="text-xs font-normal text-muted-foreground">{r.members} active {r.members === 1 ? "user" : "users"}</div>
                </TableCell>
                {MODULES.map((m) => (
                  <TableCell key={m.value}>
                    {r.key === "owner" ? (
                      <span className="text-xs text-muted-foreground">Full access</span>
                    ) : (
                      <NativeSelect
                        className="h-8 w-28"
                        aria-label={`${r.name}: ${m.label}`}
                        value={matrix[r.id][m.value]}
                        disabled={!canEdit}
                        onChange={(e) => setMatrix({ ...matrix, [r.id]: { ...matrix[r.id], [m.value]: e.target.value as Level } })}
                      >
                        <option value="none">None</option>
                        <option value="view">View</option>
                        <option value="edit">Edit</option>
                      </NativeSelect>
                    )}
                  </TableCell>
                ))}
                {canEdit && (
                  <TableCell>
                    {r.key !== "owner" && (
                      <Button size="sm" variant={dirty(r.id) ? "default" : "outline"} disabled={pending || !dirty(r.id)}
                        onClick={() => run(() => saveRolePermissions(r.id, matrix[r.id] as never), { success: `${r.name} permissions saved` })}>
                        Save
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {canEdit && (
          <div className="flex gap-2">
            <Input className="w-64" placeholder="New role name, e.g. Article clerk" value={newRole} onChange={(e) => setNewRole(e.target.value)} aria-label="New role name" />
            <Button size="sm" variant="outline" className="h-9" disabled={pending || newRole.trim().length < 2}
              onClick={() => run(() => addRole(newRole), { success: "Role added", onSuccess: () => setNewRole("") })}>
              <PlusIcon /> Add role
            </Button>
          </div>
        )}
      </CardContent>
      {dialog}
    </Card>
  );
}
