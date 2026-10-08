"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangleIcon, ArrowLeftIcon, ArrowRightIcon, CheckCircle2Icon, UndoIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ActivityList, type ActivityItem } from "@/components/app/activity-list";
import { CommentsPanel, type CommentRow } from "@/components/app/comments-panel";
import { DateText, DueBadge, LastEdited, Money, UserName } from "@/components/app/format";
import { AmountInput, DateInput, UserSelect } from "@/components/app/inputs";
import { NewTaskButton, TaskList, type TaskRow } from "@/components/app/tasks-panel";
import { useFirm } from "@/components/app/firm-context";
import { useAction } from "@/components/app/use-action";
import { cn } from "@/lib/utils";
import {
  RETURN_STATUSES, needsSignOff, nextReturnStatus, previousReturnStatus, returnRank, returnStatusLabel, type ReturnStatus,
} from "@/lib/domain/pipeline";
import { taxYearLabel } from "@/lib/domain/tax-year";
import { formatDateTime } from "@/lib/domain/dates";
import { isGapFlagged, reconcile } from "@/lib/domain/wealth";
import { moveReturn, sendBackReturn, signOffReturn, updateReturn, type ReturnFigures } from "@/server/actions/returns";
import type { Tables, Views } from "@/types/db";
import { WealthStatement } from "./wealth-statement";

type Row = Views<"v_client_tax_years">;

const FIGURE_FIELDS = [
  "income_salary", "income_property", "income_business", "income_capital_gains", "income_other_sources",
  "income_exempt", "income_final_fixed", "taxable_income", "tax_chargeable", "tax_withheld_paid",
  "opening_wealth", "closing_wealth", "personal_expenses", "inflow_gifts", "inflow_inheritance", "inflow_loans",
  "inflow_foreign_remittance", "inflow_other", "other_outflows",
] as const;
type FigureField = (typeof FIGURE_FIELDS)[number];

interface FormState {
  figures: Record<FigureField, number>;
  filed_on: string | null;
  acknowledgment_no: string;
  atl_status: "unknown" | "active" | "inactive";
  atl_last_checked_on: string | null;
  notes: string;
}

function fromRow(row: Row): FormState {
  const figures = Object.fromEntries(FIGURE_FIELDS.map((f) => [f, Number(row[f] ?? 0)])) as Record<FigureField, number>;
  return {
    figures,
    filed_on: row.filed_on ?? null,
    acknowledgment_no: row.acknowledgment_no ?? "",
    atl_status: (row.atl_status ?? "unknown") as FormState["atl_status"],
    atl_last_checked_on: row.atl_last_checked_on ?? null,
    notes: row.notes ?? "",
  };
}

const same = (a: FormState, b: FormState) => JSON.stringify(a) === JSON.stringify(b);

export interface TrendPoint {
  tax_year: number;
  opening: number;
  closing: number;
  income: number;
  inflows: number;
  outflows: number;
  gap: number;
  cash: number;
}

export function YearEditor({
  clientId, clientName, row, items, tasks, comments, activity, trend, threshold, canEdit, canComment,
}: {
  clientId: string;
  clientName: string;
  row: Row;
  items: Tables<"wealth_items">[];
  tasks: TaskRow[];
  comments: CommentRow[];
  activity: ActivityItem[];
  trend: TrendPoint[];
  threshold: number;
  canEdit: boolean;
  canComment: boolean;
}) {
  const [form, setForm] = useState<FormState>(() => fromRow(row));
  const [base, setBase] = useState<{ token: string; state: FormState }>(() => ({ token: row.updated_at!, state: fromRow(row) }));
  const [tab, setTab] = useState("return");
  const dirty = !same(form, base.state);
  const { run, pending, dialog } = useAction();

  // Someone (or this user, elsewhere on the page) changed the record: adopt it unless there are unsaved edits.
  const [seen, setSeen] = useState(row.updated_at);
  if (row.updated_at !== seen) {
    setSeen(row.updated_at);
    if (row.updated_at !== base.token && !dirty) {
      const next = fromRow(row);
      setForm(next);
      setBase({ token: row.updated_at!, state: next });
    }
  }

  useEffect(() => {
    // Links from @mention notifications end in #comments. Reading the URL hash is browser-only.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.location.hash === "#comments") setTab("comments");
  }, []);

  const setFigure = (f: FigureField, v: number) => setForm((p) => ({ ...p, figures: { ...p.figures, [f]: v } }));
  const rec = useMemo(() => reconcile(form.figures, items.map((i) => ({ ...i, cost: Number(i.cost) }))), [form.figures, items]);
  const declared = rec.declaredIncome;
  // Wealth statements (s.116) are filed by individuals; flags only mean something once figures are in.
  const isIndividual = row.client_type === "individual";
  const prepared = returnRank(row.return_status as ReturnStatus) >= returnRank("in_preparation");
  const payable = form.figures.tax_chargeable - form.figures.tax_withheld_paid;

  function save() {
    const patch: ReturnFigures = {
      ...form.figures,
      filed_on: form.filed_on,
      acknowledgment_no: form.acknowledgment_no,
      atl_status: form.atl_status,
      atl_last_checked_on: form.atl_last_checked_on,
      notes: form.notes,
    };
    run((tok) => updateReturn(row.id!, tok ?? base.token, patch), {
      success: "Saved",
      onSuccess: (d) => setBase({ token: d.updated_at, state: form }),
    });
  }

  /** For immediate actions (move, sign-off, assign): keep unsaved figure edits and adopt the new token. */
  const afterImmediate = (d: { updated_at: string }) => setBase((b) => ({ token: d.updated_at, state: dirty ? b.state : form }));

  const amount = (f: FigureField, label: string, hint?: string) => (
    <div className="grid gap-1">
      <Label htmlFor={f} className="text-xs font-normal text-muted-foreground">{label}</Label>
      <AmountInput id={f} value={form.figures[f]} onChange={(v) => setFigure(f, v)} disabled={!canEdit} />
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );

  return (
    <div className="grid gap-4 pb-16">
      <PipelineCard row={row} token={base.token} canEdit={canEdit} run={run} pending={pending} onDone={afterImmediate} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="return">Return</TabsTrigger>
          <TabsTrigger value="wealth">
            Wealth
            {isIndividual && prepared && isGapFlagged(rec.gap, threshold) && <AlertTriangleIcon className="text-amber-600" />}
          </TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.filter((t) => t.status === "open" || t.status === "in_progress").length})</TabsTrigger>
          <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="notices">Notices</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
        </TabsList>

        <TabsContent value="return" className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Income</CardTitle>
              <CardDescription>As declared in the return</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {amount("income_salary", "Salary")}
              {amount("income_property", "Income from property")}
              {amount("income_business", "Business")}
              {amount("income_capital_gains", "Capital gains")}
              {amount("income_other_sources", "Other sources")}
              <div className="grid gap-1">
                <span className="text-xs text-muted-foreground">Total of heads</span>
                <div className="flex h-9 items-center justify-end rounded-md bg-muted px-3 font-medium"><Money value={declared} /></div>
              </div>
              {amount("income_exempt", "Exempt income")}
              {amount("income_final_fixed", "Final / fixed tax regime income")}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Tax</CardTitle>
              <CardDescription>Figures from the IRIS computation</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {amount("taxable_income", "Taxable income")}
              {amount("tax_chargeable", "Tax chargeable")}
              {amount("tax_withheld_paid", "Tax withheld / paid")}
              <div className="grid gap-1">
                <span className="text-xs text-muted-foreground">{payable >= 0 ? "Payable" : "Refundable"}</span>
                <div className={cn("flex h-9 items-center justify-end rounded-md px-3 font-semibold", payable > 0 ? "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300" : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300")}>
                  <Money value={Math.abs(payable)} />
                </div>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="filed_on" className="text-xs font-normal text-muted-foreground">Filed on</Label>
                <DateInput id="filed_on" value={form.filed_on} onChange={(v) => setForm((p) => ({ ...p, filed_on: v }))} disabled={!canEdit} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="ack" className="text-xs font-normal text-muted-foreground">Acknowledgment no.</Label>
                <Input id="ack" className="num" value={form.acknowledgment_no} onChange={(e) => setForm((p) => ({ ...p, acknowledgment_no: e.target.value }))} disabled={!canEdit} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="atl" className="text-xs font-normal text-muted-foreground">ATL status</Label>
                <NativeSelect id="atl" value={form.atl_status} onChange={(e) => setForm((p) => ({ ...p, atl_status: e.target.value as FormState["atl_status"] }))} disabled={!canEdit}>
                  <option value="unknown">Unknown</option>
                  <option value="active">Active</option>
                  <option value="inactive">Not on ATL</option>
                </NativeSelect>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="atl_checked" className="text-xs font-normal text-muted-foreground">ATL last checked</Label>
                <DateInput id="atl_checked" value={form.atl_last_checked_on} onChange={(v) => setForm((p) => ({ ...p, atl_last_checked_on: v }))} disabled={!canEdit} />
              </div>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} disabled={!canEdit} aria-label="Notes" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wealth" className="grid gap-4">
          {!isIndividual && (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Wealth statements (s.116) are filed by individuals. Record each director&apos;s, partner&apos;s or member&apos;s statement on their own
              client record (linked under Profile → Family, directors and partners). Anything entered here is for reference only and is not flagged.
            </div>
          )}
          <Reconciliation rec={rec} threshold={threshold} figures={form.figures} active={isIndividual && prepared} />
          <Card>
            <CardHeader>
              <CardTitle>Reconciliation inputs</CardTitle>
              <CardDescription>Income figures come from the Return tab.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {amount("opening_wealth", "Opening net assets", "Last year's closing, carried forward")}
              {amount("personal_expenses", "Personal expenses")}
              {amount("other_outflows", "Other outflows", "e.g. gifts given, loss on disposal")}
              {rec.closingFromStatement ? (
                <div className="grid gap-1">
                  <span className="text-xs text-muted-foreground">Closing net assets</span>
                  <div className="flex h-9 items-center justify-end rounded-md bg-muted px-3 font-medium"><Money value={rec.closing} /></div>
                  <span className="text-[11px] text-muted-foreground">From the wealth statement below</span>
                </div>
              ) : (
                amount("closing_wealth", "Closing net assets", "Or add wealth statement lines")
              )}
              {amount("inflow_gifts", "Gifts received")}
              {amount("inflow_inheritance", "Inheritance")}
              {amount("inflow_loans", "Loans received")}
              {amount("inflow_foreign_remittance", "Foreign remittance")}
              {amount("inflow_other", "Other inflows")}
            </CardContent>
          </Card>
          <WealthStatement yearId={row.id!} items={items} canEdit={canEdit} />
          <Trend trend={trend} threshold={isIndividual ? threshold : Number.POSITIVE_INFINITY} current={row.tax_year!} />
        </TabsContent>

        <TabsContent value="tasks" className="grid gap-3">
          {canEdit && <div><NewTaskButton link={{ client_id: clientId, client_tax_year_id: row.id }} defaultAssignee={row.assignee_id} /></div>}
          <TaskList tasks={tasks} />
        </TabsContent>

        <TabsContent value="comments">
          <CommentsPanel entityType="client_tax_year" entityId={row.id!} clientId={clientId} comments={comments} canComment={canComment} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityList items={activity} />
        </TabsContent>

        {(["documents", "notices", "fees"] as const).map((t) => (
          <TabsContent key={t} value={t}>
            <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
              {t === "fees"
                ? "Fees, invoices and payments for this year arrive in Phase 3."
                : t === "documents"
                  ? "Document upload (salary and withholding certificates, bank statements, CPRs, acknowledgments) arrives in Phase 2."
                  : `Notices for ${clientName}, ${taxYearLabel(row.tax_year!)} arrive in Phase 2.`}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {canEdit && dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-4 py-2 shadow-lg backdrop-blur md:left-56" data-testid="save-bar">
          <div className="mx-auto flex max-w-5xl items-center justify-end gap-2">
            <span className="mr-auto text-sm text-muted-foreground">Unsaved changes</span>
            <Button variant="ghost" size="sm" onClick={() => setForm(base.state)}>Discard</Button>
            <Button size="sm" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      )}
      <div className="text-right"><LastEdited at={row.updated_at} by={row.updated_by} /></div>
      {dialog}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pipeline: status, moves, review sign-off, assignment
// ---------------------------------------------------------------------------
function PipelineCard({
  row, token, canEdit, run, pending, onDone,
}: {
  row: Row;
  token: string;
  canEdit: boolean;
  run: ReturnType<typeof useAction>["run"];
  pending: boolean;
  onDone: (d: { updated_at: string }) => void;
}) {
  const { userId, isOwner } = useFirm();
  const status = row.return_status as ReturnStatus;
  const signed = Boolean(row.review_signed_off_at);
  const prev = previousReturnStatus(status);
  const next = nextReturnStatus(status);
  const canSignOff = status === "under_review" && !signed && canEdit && (row.reviewer_id === userId || isOwner);
  const [sendBack, setSendBack] = useState(false);
  const [note, setNote] = useState("");

  const move = (to: ReturnStatus) => run((tok) => moveReturn(row.id!, tok ?? token, to), { success: `Moved to ${returnStatusLabel(to)}`, onSuccess: onDone });
  const blocked = (to: ReturnStatus) => needsSignOff(status, to, signed);

  return (
    <Card>
      <CardContent className="grid gap-4">
        <ol className="flex items-center gap-1 overflow-x-auto pb-1" aria-label="Return pipeline">
          {RETURN_STATUSES.map((s, i) => {
            const rank = returnRank(status);
            const state = i < rank ? "done" : i === rank ? "current" : "todo";
            return (
              <li key={s.value} className="flex shrink-0 items-center gap-1">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] whitespace-nowrap",
                    state === "current" && "bg-primary font-semibold text-primary-foreground",
                    state === "done" && "bg-primary/10 text-primary",
                    state === "todo" && "bg-muted text-muted-foreground",
                  )}
                  aria-current={state === "current" ? "step" : undefined}
                >
                  {s.label}
                  {s.value === "under_review" && signed && <CheckCircle2Icon className="ml-1 inline size-3" />}
                </span>
                {i < RETURN_STATUSES.length - 1 && <span className="h-px w-2 bg-border" />}
              </li>
            );
          })}
        </ol>

        <div className="grid gap-3">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm lg:grid-cols-4">
            <div><dt className="text-xs text-muted-foreground">Filing due</dt><dd className="whitespace-nowrap"><DueBadge due={row.filing_due_date} done={Boolean(row.is_filed)} /></dd></div>
            <div><dt className="text-xs text-muted-foreground">Filed on</dt><dd><DateText value={row.filed_on} /></dd></div>
            <div>
              <dt className="text-xs text-muted-foreground">Assignee</dt>
              <dd>
                {canEdit ? (
                  <UserSelect className="h-8" value={row.assignee_id} aria-label="Assignee"
                    onChange={(v) => run((tok) => updateReturn(row.id!, tok ?? token, { assignee_id: v }), { success: "Assignee updated", onSuccess: onDone })} />
                ) : <UserName id={row.assignee_id} />}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Reviewer</dt>
              <dd>
                {canEdit ? (
                  <UserSelect className="h-8" value={row.reviewer_id} aria-label="Reviewer"
                    onChange={(v) => run((tok) => updateReturn(row.id!, tok ?? token, { reviewer_id: v }), { success: "Reviewer updated", onSuccess: onDone })} />
                ) : <UserName id={row.reviewer_id} />}
              </dd>
            </div>
          </dl>

          {canEdit && (
            <div className="flex flex-wrap items-center gap-2 border-t pt-3">
              <span className="mr-auto text-xs text-muted-foreground">Status: <strong className="text-foreground">{returnStatusLabel(status)}</strong></span>
              {prev && (
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => move(prev)}>
                  <ArrowLeftIcon /> {returnStatusLabel(prev)}
                </Button>
              )}
              {next && (
                <Button size="sm" disabled={pending || blocked(next)} onClick={() => move(next)} title={blocked(next) ? "Needs reviewer sign-off first" : undefined} data-testid="advance-status">
                  {returnStatusLabel(next)} <ArrowRightIcon />
                </Button>
              )}
              <NativeSelect
                className="h-8 w-48"
                value=""
                aria-label="Move to status"
                onChange={(e) => e.target.value && move(e.target.value as ReturnStatus)}
              >
                <option value="">Move to…</option>
                {RETURN_STATUSES.filter((s) => s.value !== status).map((s) => (
                  <option key={s.value} value={s.value} disabled={blocked(s.value)}>
                    {s.label}{blocked(s.value) ? " (needs sign-off)" : ""}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
        </div>

        {status === "under_review" && (
          <div className={cn("flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm", signed ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950" : "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950")} data-testid="review-box">
            {signed ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2Icon className="size-4 text-emerald-700" /> Signed off by <UserName id={row.review_signed_off_by} /> · {formatDateTime(row.review_signed_off_at)}
              </span>
            ) : (
              <span className="mr-auto">
                Waiting for <strong><UserName id={row.reviewer_id} /></strong> to sign off. It cannot go to the client before that.
              </span>
            )}
            {canSignOff && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={() => setSendBack(true)} disabled={pending}><UndoIcon /> Send back</Button>
                <Button size="sm" variant="outline" disabled={pending}
                  onClick={() => run((tok) => signOffReturn(row.id!, tok ?? token, false), { success: "Signed off", onSuccess: onDone })}>
                  Sign off
                </Button>
                <Button size="sm" disabled={pending} data-testid="sign-off-send"
                  onClick={() => run((tok) => signOffReturn(row.id!, tok ?? token, true), { success: "Signed off and sent for client approval", onSuccess: onDone })}>
                  Sign off &amp; send to client
                </Button>
              </div>
            )}
          </div>
        )}
        {status !== "under_review" && signed && returnRank(status) > returnRank("under_review") && (
          <p className="text-xs text-muted-foreground">
            <Badge variant="success" className="mr-1">Reviewed</Badge>
            Signed off by <UserName id={row.review_signed_off_by} /> · {formatDateTime(row.review_signed_off_at)}
          </p>
        )}
      </CardContent>
      <Dialog open={sendBack} onOpenChange={setSendBack}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send back for rework</DialogTitle>
            <DialogDescription>The return goes back to In preparation and the assignee is notified.</DialogDescription>
          </DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="What needs fixing?" rows={4} aria-label="Reason" />
          <DialogFooter>
            <Button
              disabled={pending}
              onClick={() =>
                run((tok) => sendBackReturn(row.id!, tok ?? token, note), {
                  success: "Sent back",
                  onSuccess: (d) => { setSendBack(false); setNote(""); onDone(d); },
                })
              }
            >
              Send back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Wealth reconciliation (mirrors IRIS)
// ---------------------------------------------------------------------------
function Reconciliation({
  rec, threshold, figures, active,
}: { rec: ReturnType<typeof reconcile>; threshold: number; figures: Record<FigureField, number>; active: boolean }) {
  const flagged = active && isGapFlagged(rec.gap, threshold);
  const line = (label: string, value: number, sign: "+" | "−" | "=" | "", strong?: boolean) => (
    <div className={cn("flex items-center justify-between gap-3 py-1 text-sm", strong && "border-t font-semibold")}>
      <span className="text-muted-foreground"><span className="inline-block w-4">{sign}</span>{label}</span>
      <Money value={value} />
    </div>
  );
  return (
    <Card className={cn(flagged && "border-amber-400")} data-testid="reconciliation">
      <CardHeader>
        <div>
          <CardTitle>Wealth reconciliation</CardTitle>
          <CardDescription>Gaps above <Money value={threshold} /> are flagged (Settings → Firm).</CardDescription>
        </div>
        {!active ? (
          <Badge variant="outline">Not checked</Badge>
        ) : flagged ? (
          <Badge variant="warning"><AlertTriangleIcon /> Unexplained {rec.gap > 0 ? "increase" : "decrease"}</Badge>
        ) : (
          <Badge variant="success">Reconciled</Badge>
        )}
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div>
          {line("Opening net assets", figures.opening_wealth, "")}
          {line("Declared income (all heads)", rec.declaredIncome, "+")}
          {line("Exempt income", figures.income_exempt, "+")}
          {line("Final / fixed tax income", figures.income_final_fixed, "+")}
          {line("Gifts, inheritance, loans, remittances, other", rec.otherInflows, "+")}
          {line("Personal expenses and other outflows", rec.outflows, "−")}
          {line("Expected closing net assets", rec.expectedClosing, "=", true)}
        </div>
        <div>
          {line(rec.closingFromStatement ? "Closing net assets (wealth statement)" : "Closing net assets (declared)", rec.closing, "")}
          {line("Expected closing net assets", rec.expectedClosing, "−")}
          <div className={cn("mt-1 flex items-center justify-between rounded-md px-2 py-2 text-sm font-semibold", flagged ? "bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-200" : "bg-muted")}>
            <span>Unreconciled difference</span>
            <span data-testid="wealth-gap"><Money value={rec.gap} /></span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Positive: wealth grew more than income and inflows explain. Negative: expenses or outflows may be understated.
            Cash-equivalent assets: <Money value={rec.cashEquivalents} />.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Trend({ trend, threshold, current }: { trend: TrendPoint[]; threshold: number; current: number }) {
  if (trend.length < 2) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Year-over-year</CardTitle>
        <CardDescription>Net assets and the reconciliation gap across this client&apos;s tax years</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs text-muted-foreground">
              <th className="py-1.5 text-left font-medium">Tax year</th>
              <th className="py-1.5 text-right font-medium">Opening</th>
              <th className="py-1.5 text-right font-medium">Income</th>
              <th className="py-1.5 text-right font-medium">Other inflows</th>
              <th className="py-1.5 text-right font-medium">Expenses &amp; outflows</th>
              <th className="py-1.5 text-right font-medium">Closing</th>
              <th className="py-1.5 text-right font-medium">Gap</th>
            </tr>
          </thead>
          <tbody>
            {trend.map((t) => (
              <tr key={t.tax_year} className={cn("border-b last:border-0", t.tax_year === current && "bg-muted/50 font-medium")}>
                <td className="py-1.5">TY{t.tax_year}</td>
                <td className="py-1.5 text-right"><Money value={t.opening} compact /></td>
                <td className="py-1.5 text-right"><Money value={t.income} compact /></td>
                <td className="py-1.5 text-right"><Money value={t.inflows} compact /></td>
                <td className="py-1.5 text-right"><Money value={t.outflows} compact /></td>
                <td className="py-1.5 text-right"><Money value={t.closing} compact /></td>
                <td className="py-1.5 text-right">
                  <span className={cn(isGapFlagged(t.gap, threshold) && "rounded bg-amber-100 px-1 text-amber-950 dark:bg-amber-950 dark:text-amber-200")}>
                    <Money value={t.gap} compact />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
