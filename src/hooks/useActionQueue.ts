import { useCallback, useEffect, useRef, useState } from "react";
import { ActionValue, ListActionValue, ListValue, ObjectItem, ValueStatus } from "mendix";

/**
 * Runs the widget's actions one after another (microflows often disallow concurrent execution).
 *
 * Junction mode: every (de)selection is an action that creates or deletes a junction object. The Mendix client
 * does not refresh the "selected objects" data source by itself when a junction object changes, so the queue
 *  - shows the change immediately (optimistic override per object),
 *  - reloads "selected objects" when the queue is empty and then calls On change,
 *  - drops an override as soon as the reloaded data agrees with it (or when the reload is complete).
 *
 * Reference set mode: the association is set directly; the queue only runs On select / On deselect and On change
 * in order, without overrides and without reload.
 */

type Job =
    | { kind: "item"; id: string; item: ObjectItem; select: boolean; tracked: boolean }
    | { kind: "bulk"; select: boolean; ids: string[] }
    | { kind: "change" };

interface Running {
    job: Job;
    startedAt: number;
    sawExecuting: boolean;
}

export interface QueueSources {
    options: ListValue;
    selectedOptions?: ListValue;
    onSelect?: ListActionValue;
    onDeselect?: ListActionValue;
    onSelectAll?: ActionValue;
    onClearAll?: ActionValue;
    onChange?: ActionValue;
}

/**
 * execute() returns nothing; the widget receives isExecuting=true when the action really starts. A very fast action
 * can start and finish between two ticks, so an action that never reported isExecuting counts as done after this time.
 */
const START_GRACE_MS = 750;
/** Maximum time to wait for the reloaded "selected objects" before dropping the optimistic state. */
const RELOAD_TIMEOUT_MS = 8000;
const TICK_MS = 100;

function jobIds(job: Job): string[] {
    if (job.kind === "item") {
        return job.tracked ? [job.id] : [];
    }
    return job.kind === "bulk" ? job.ids : [];
}

/** Use the current ObjectItem for the id: the stored one may be stale after the options reloaded. */
function currentItem(job: { id: string; item: ObjectItem }, s: QueueSources): ObjectItem {
    return s.options.items?.find(item => item.id === job.id) ?? job.item;
}

function actionFor(job: Job, s: QueueSources): ActionValue | undefined {
    try {
        if (job.kind === "item") {
            const linked = job.select ? s.onSelect : s.onDeselect;
            return linked?.get(currentItem(job, s));
        }
        if (job.kind === "bulk") {
            return job.select ? s.onSelectAll : s.onClearAll;
        }
        return s.onChange;
    } catch (e) {
        console.warn("Multi-select list: action is not available for this object", e);
        return undefined;
    }
}

export interface ActionQueue {
    pending: ReadonlyMap<string, boolean>;
    busy: boolean;
    enqueueItem: (item: ObjectItem, select: boolean, tracked: boolean) => void;
    enqueueBulk: (select: boolean, ids: string[]) => void;
    enqueueChange: () => void;
}

export function useActionQueue(sources: QueueSources): ActionQueue {
    const sourcesRef = useRef(sources);
    sourcesRef.current = sources;

    const [pending, setPending] = useState<Map<string, boolean>>(() => new Map());
    const pendingRef = useRef(pending);
    pendingRef.current = pending;
    const [busy, setBusy] = useState(false);

    const queue = useRef<Job[]>([]);
    const running = useRef<Running | null>(null);
    const completedIds = useRef<Set<string>>(new Set());
    const reloadState = useRef<{ at: number; items: ListValue["items"]; ids: Set<string> } | null>(null);

    const dropPending = useCallback((ids: Iterable<string>) => {
        const list = Array.from(ids);
        if (list.length === 0) {
            return;
        }
        setPending(prev => {
            const next = new Map(prev);
            list.forEach(id => next.delete(id));
            return next;
        });
    }, []);

    const tick = useCallback(() => {
        const s = sourcesRef.current;
        const now = Date.now();

        // 1. Follow the running action.
        if (running.current) {
            const r = running.current;
            const action = actionFor(r.job, s);
            if (action?.isExecuting) {
                r.sawExecuting = true;
                return;
            }
            if (!r.sawExecuting && now - r.startedAt < START_GRACE_MS) {
                return;
            }
            jobIds(r.job).forEach(id => completedIds.current.add(id));
            running.current = null;
        }

        // 2. Start the next job.
        while (queue.current.length > 0) {
            const job = queue.current.shift()!;
            const action = actionFor(job, s);
            if (action?.canExecute) {
                action.execute();
                running.current = { job, startedAt: now, sawExecuting: action.isExecuting };
                return;
            }
            // Not allowed or not configured: revert the optimistic state of this job.
            dropPending(jobIds(job));
        }

        // 3. Junction mode, queue empty: reload the selection once, then On change.
        if (completedIds.current.size > 0) {
            const ids = completedIds.current;
            completedIds.current = new Set();
            // A reload that was still being awaited is replaced: keep its objects in the new wait.
            reloadState.current?.ids.forEach(id => ids.add(id));
            reloadState.current = { at: now, items: s.selectedOptions?.items, ids };
            s.selectedOptions?.reload();
            queue.current.push({ kind: "change" });
            return;
        }

        // 4. Wait for the reloaded data. Only trust a list that is Available.
        if (reloadState.current) {
            const rs = reloadState.current;
            const list = s.selectedOptions;
            if (list?.status === ValueStatus.Available) {
                const selected = new Set<string>((list.items ?? []).map(item => item.id));
                const agreed = Array.from(rs.ids).filter(id => pendingRef.current.get(id) === selected.has(id));
                agreed.forEach(id => rs.ids.delete(id));
                dropPending(agreed);
                if (list.items !== rs.items) {
                    // Fresh data arrived: whatever still differs is the real state (e.g. a failed action).
                    dropPending(rs.ids);
                    rs.ids.clear();
                }
            }
            if (rs.ids.size === 0 || now - rs.at > RELOAD_TIMEOUT_MS) {
                dropPending(rs.ids);
                reloadState.current = null;
            }
            return;
        }

        setBusy(false);
    }, [dropPending]);

    useEffect(() => {
        if (!busy) {
            return undefined;
        }
        const handle = window.setInterval(tick, TICK_MS);
        return () => window.clearInterval(handle);
    }, [busy, tick]);

    // On unmount (popup closed, page left) start the jobs that did not run yet, so no click is lost.
    useEffect(
        () => () => {
            const s = sourcesRef.current;
            const rest = queue.current;
            queue.current = [];
            rest.forEach(job => {
                const action = actionFor(job, s);
                if (action?.canExecute) {
                    action.execute();
                }
            });
        },
        []
    );

    const enqueueItem = useCallback((item: ObjectItem, select: boolean, tracked: boolean) => {
        if (tracked) {
            setPending(prev => new Map(prev).set(item.id, select));
        }
        queue.current.push({ kind: "item", id: item.id, item, select, tracked });
        setBusy(true);
    }, []);

    const enqueueBulk = useCallback((select: boolean, ids: string[]) => {
        setPending(prev => {
            const next = new Map(prev);
            ids.forEach(id => next.set(id, select));
            return next;
        });
        queue.current.push({ kind: "bulk", select, ids });
        setBusy(true);
    }, []);

    /** One On change at the end of the queue, however many changes were made. */
    const enqueueChange = useCallback(() => {
        queue.current = queue.current.filter(job => job.kind !== "change");
        queue.current.push({ kind: "change" });
        setBusy(true);
    }, []);

    return { pending, busy, enqueueItem, enqueueBulk, enqueueChange };
}
