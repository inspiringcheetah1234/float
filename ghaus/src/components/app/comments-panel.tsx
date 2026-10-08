"use client";

import { useMemo, useRef, useState } from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addComment, deleteComment } from "@/server/actions/comments";
import { formatDateTime } from "@/lib/domain/dates";
import { useFirm, useUserName } from "./firm-context";
import { useAction } from "./use-action";
import { EmptyState } from "./page-header";

export interface CommentRow {
  id: string;
  body: string;
  mentions: string[];
  created_by: string | null;
  created_at: string;
}

function renderBody(body: string, names: string[]) {
  if (names.length === 0) return body;
  const pattern = new RegExp(`(@(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}))`, "g");
  return body.split(pattern).map((part, i) =>
    names.some((n) => part === `@${n}`) ? (
      <span key={i} className="rounded bg-primary/10 px-0.5 font-medium text-primary">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function CommentsPanel({
  entityType, entityId, clientId, comments, canComment,
}: {
  entityType: "client" | "client_tax_year" | "notice" | "appeal";
  entityId: string;
  clientId: string;
  comments: CommentRow[];
  canComment: boolean;
}) {
  const { users, userId } = useFirm();
  const name = useUserName();
  const [body, setBody] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [query, setQuery] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);
  const { run, pending, dialog } = useAction();
  const activeUsers = users.filter((u) => u.is_active);
  const allNames = useMemo(() => users.map((u) => u.full_name), [users]);

  const suggestions = query === null ? [] : activeUsers.filter((u) => u.full_name.toLowerCase().includes(query.toLowerCase())).slice(0, 6);

  function onChange(value: string) {
    setBody(value);
    const caret = ref.current?.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const m = before.match(/(?:^|\s)@([\p{L} .'-]{0,30})$/u);
    setQuery(m ? m[1] : null);
  }

  function pick(user: { id: string; full_name: string }) {
    const caret = ref.current?.selectionStart ?? body.length;
    const before = body.slice(0, caret).replace(/@([\p{L} .'-]{0,30})$/u, `@${user.full_name} `);
    setBody(before + body.slice(caret));
    setMentions((m) => [...new Set([...m, user.id])]);
    setQuery(null);
    ref.current?.focus();
  }

  function submit() {
    const ids = mentions.filter((id) => body.includes(`@${name(id)}`));
    run(() => addComment({ entity_type: entityType, entity_id: entityId, client_id: clientId, body, mentions: ids }), {
      onSuccess: () => { setBody(""); setMentions([]); },
    });
  }

  return (
    <div className="grid gap-3" id="comments">
      {comments.length === 0 && <EmptyState>No comments yet.</EmptyState>}
      <ul className="grid gap-3">
        {comments.map((c) => (
          <li key={c.id} className="rounded-md border bg-card p-3">
            <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span><span className="font-medium text-foreground">{name(c.created_by)}</span> · {formatDateTime(c.created_at)}</span>
              {c.created_by === userId && (
                <button
                  className="opacity-60 hover:opacity-100"
                  aria-label="Delete comment"
                  onClick={() => confirm("Delete this comment?") && run(() => deleteComment(c.id, clientId))}
                >
                  <Trash2Icon className="size-3.5" />
                </button>
              )}
            </div>
            <p className="text-sm whitespace-pre-wrap">{renderBody(c.body, allNames)}</p>
          </li>
        ))}
      </ul>
      {canComment && (
        <div className="relative grid gap-2">
          <Textarea
            ref={ref}
            value={body}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (suggestions.length && (e.key === "Enter" || e.key === "Tab")) {
                e.preventDefault();
                pick(suggestions[0]);
              } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && body.trim()) {
                submit();
              }
            }}
            placeholder="Internal comment. Type @ to mention a colleague."
            rows={3}
            aria-label="New comment"
          />
          {suggestions.length > 0 && (
            <ul className="absolute top-full left-0 z-10 mt-1 w-64 rounded-md border bg-popover p-1 shadow-md" role="listbox">
              {suggestions.map((u) => (
                <li key={u.id}>
                  <button type="button" className="w-full rounded px-2 py-1 text-left text-sm hover:bg-accent" onMouseDown={(e) => { e.preventDefault(); pick(u); }}>
                    {u.full_name} <span className="text-xs text-muted-foreground">{u.role_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div>
            <Button size="sm" onClick={submit} disabled={pending || !body.trim()}>Post comment</Button>
          </div>
        </div>
      )}
      {dialog}
    </div>
  );
}
