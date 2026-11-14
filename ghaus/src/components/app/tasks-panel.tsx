"use client";

import Link from "next/link";
import { useState } from "react";
import { PlusIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTask, setTaskStatus } from "@/server/actions/tasks";
import { cn } from "@/lib/utils";
import { DateInput, UserSelect } from "./inputs";
import { DueBadge, UserName } from "./format";
import { useAction } from "./use-action";
import { useFirm } from "./firm-context";
import { EmptyState } from "./page-header";

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  due_date: string | null;
  status: "open" | "in_progress" | "done" | "cancelled";
  auto_rule_id: string | null;
  updated_at: string;
  client_id?: string | null;
  client_name?: string | null;
  link?: string | null;
}

export function TaskList({ tasks, showClient }: { tasks: TaskRow[]; showClient?: boolean }) {
  const { run, pending, dialog } = useAction();
  if (tasks.length === 0) return <EmptyState>No tasks.</EmptyState>;
  return (
    <>
      <ul className="divide-y rounded-md border bg-card">
        {tasks.map((t) => {
          const done = t.status === "done" || t.status === "cancelled";
          return (
            <li key={t.id} className="flex items-start gap-3 px-3 py-2" data-testid="task-row">
              <Checkbox
                className="mt-0.5"
                checked={t.status === "done"}
                disabled={pending || t.status === "cancelled"}
                aria-label={`Mark "${t.title}" ${t.status === "done" ? "open" : "done"}`}
                onChange={(e) => run((tok) => setTaskStatus(t.id, tok ?? t.updated_at, e.target.checked ? "done" : "open"))}
              />
              <div className="min-w-0 flex-1">
                <div className={cn("text-sm", done && "text-muted-foreground line-through")}>
                  {t.title}
                  {t.auto_rule_id && <SparklesIcon className="ml-1 inline size-3 text-muted-foreground" aria-label="Created by the pipeline" />}
                </div>
                <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  <UserName id={t.assignee_id} />
                  {showClient && t.client_name && (t.link ? <Link className="hover:underline" href={t.link}>{t.client_name}</Link> : <span>{t.client_name}</span>)}
                  {t.description && <span className="truncate">{t.description}</span>}
                </div>
              </div>
              <div className="shrink-0 text-xs"><DueBadge due={t.due_date} done={done} /></div>
            </li>
          );
        })}
      </ul>
      {dialog}
    </>
  );
}

export function NewTaskButton({
  link, defaultAssignee, size = "sm",
}: {
  link: { client_id?: string | null; client_tax_year_id?: string | null; notice_id?: string | null; appeal_id?: string | null };
  defaultAssignee?: string | null;
  size?: "sm" | "xs";
}) {
  const { userId } = useFirm();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState<string | null>(defaultAssignee ?? userId);
  const [due, setDue] = useState<string | null>(null);
  const { run, pending, dialog } = useAction();
  return (
    <>
      <Button size={size} variant="outline" onClick={() => setOpen(true)}><PlusIcon /> New task</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New task</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5"><Label htmlFor="task-title">Title</Label><Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label htmlFor="task-desc">Details</Label><Textarea id="task-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label htmlFor="task-assignee">Assignee</Label><UserSelect id="task-assignee" value={assignee} onChange={setAssignee} /></div>
              <div className="grid gap-1.5"><Label htmlFor="task-due">Due</Label><DateInput id="task-due" value={due} onChange={setDue} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={pending || !title.trim()}
              onClick={() =>
                run(() => createTask({ title, description, assignee_id: assignee, due_date: due, ...link }), {
                  success: "Task added",
                  onSuccess: () => { setOpen(false); setTitle(""); setDescription(""); setDue(null); },
                })
              }
            >
              Add task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {dialog}
    </>
  );
}
