import { useCallback, useEffect, useRef, useState } from "react";
import { ActionValue, ListActionValue, ListValue, ObjectItem } from "mendix";

/**
 * Junction mode: every (de)selection is an action (microflow/nanoflow) that creates or deletes a junction object.
 * The Mendix client does not refresh the "selected objects" data source by itself when a junction object changes,
 * so this hook:
 *  - shows the change immediately (optimistic override per object),
 *  - runs the actions one after another (microflows often disallow concurrent execution),
 *  - reloads the "selected objects" data source when the queue is empty, then drops the overrides.
 */

type Job = { kind: "item"; item: ObjectItem; select: boolean } | { kind: "bulk"; select: boolean; ids: string[] };

interface Running {
    job: Job;
    startedAt: number;
    sawExecuting: boolean;
}

export interface JunctionSources {
    selectedOptions?: ListValue;
    onSelect?: ListActionValue;
    onDeselect?: ListActionValue;
    onSelectAll?: ActionValue;
    onClearAll?: ActionValue;
    onChange?: ActionValue;
}

/** If an action never reports isExecuting within this time, it is treated as finished (e.g. a very fast nanoflow). */
const START_GRACE_MS = 400;
/** Maximum time to wait for the reloaded "selected objects" before dropping the optimistic state. */
const RELOAD_TIMEOUT_MS = 4000;
const TICK_MS = 100;

function jobIds(job: Job): string[] {
    return job.kind === "item" ? [job.item.id] : job.ids;
}

function actionFor(job: Job, s: JunctionSources): ActionValue | undefined {
    if (job.kind === "item") {
        const linked = job.select ? s.onSelect : s.onDeselect;
        return linked?.get(job.item);
    }
    return job.select ? s.onSelectAll : s.onClearAll;
}

export interface JunctionQueue {
    pending: ReadonlyMap<string, boolean>;
    busy: boolean;
    enqueueItem: (item: ObjectItem, select: boolean) => void;
    enqueueBulk: (select: boolean, ids: string[]) => void;
}

export function useJunctionQueue(sources: JunctionSources): JunctionQueue {
    const sourcesRef = useRef(sources);
    sourcesRef.current = sources;

    const [pending, setPending] = useState<Map<string, boolean>>(() => new Map());
    const [busy, setBusy] = useState(false);

    const queue = useRef<Job[]>([]);
    const running = useRef<Running | null>(null);
    const completedIds = useRef<Set<string>>(new Set());
    const reloadState = useRef<{ at: number; items: ListValue["items"]; ids: Set<string> } | null>(null);

    const dropPending = useCallback((ids: Iterable<string>) => {
        setPending(prev => {
            const next = new Map(prev);
            for (const id of ids) {
                next.delete(id);
            }
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

        // 3. Queue empty: reload the selection once.
        if (completedIds.current.size > 0) {
            const ids = completedIds.current;
            completedIds.current = new Set();
            // A reload that was still being awaited is replaced: keep its objects in the new wait.
            reloadState.current?.ids.forEach(id => ids.add(id));
            reloadState.current = { at: now, items: s.selectedOptions?.items, ids };
            s.selectedOptions?.reload();
            if (s.onChange?.canExecute) {
                s.onChange.execute();
            }
            return;
        }

        // 4. Wait for the reloaded data, then show the real state.
        if (reloadState.current) {
            const rs = reloadState.current;
            if (s.selectedOptions?.items !== rs.items || now - rs.at > RELOAD_TIMEOUT_MS) {
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

    const enqueueItem = useCallback((item: ObjectItem, select: boolean) => {
        setPending(prev => new Map(prev).set(item.id, select));
        queue.current.push({ kind: "item", item, select });
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

    return { pending, busy, enqueueItem, enqueueBulk };
}
