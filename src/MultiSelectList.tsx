import { CSSProperties, ReactElement, createElement, useCallback, useMemo, useState } from "react";
import { ObjectItem, ValueStatus } from "mendix";
import classNames from "classnames";

import { MultiSelectListContainerProps } from "../typings/MultiSelectListProps";
import { useActionQueue } from "./hooks/useActionQueue";
import { useLabelledBy } from "./hooks/useLabelledBy";
import { OptionList, OptionView } from "./components/OptionList";
import { Toolbar } from "./components/Toolbar";

import "./ui/MultiSelectList.scss";

/** Mendix always passes the Appearance class and style, even when the generated typings leave them out. */
type Props = MultiSelectListContainerProps & { class?: string; style?: CSSProperties };

export function MultiSelectList(props: Props): ReactElement {
    const {
        selectionMode,
        options,
        optionCaption,
        referenceSet,
        selectedOptions,
        onSelect,
        onDeselect,
        onSelectAll,
        onClearAll,
        onChange
    } = props;
    const isJunction = selectionMode === "junction";
    const [search, setSearch] = useState("");

    const queue = useActionQueue({ options, selectedOptions, onSelect, onDeselect, onSelectAll, onClearAll, onChange });
    const labelledBy = useLabelledBy(props.id, !props.ariaLabel?.value);

    const items: ObjectItem[] = useMemo(() => options.items ?? [], [options.items]);

    // The selection is only trusted once its source is Available: before that every option would look unselected,
    // and a click would create a duplicate junction object or overwrite the reference set.
    const selectionReady = isJunction
        ? selectedOptions?.status === ValueStatus.Available
        : referenceSet?.status === ValueStatus.Available;

    const sourceSelected = useMemo(() => {
        const list = isJunction ? selectedOptions?.items : referenceSet?.value;
        return new Set<string>((list ?? []).map(item => item.id));
    }, [isJunction, selectedOptions?.items, referenceSet?.value]);

    const isSelected = useCallback(
        (item: ObjectItem): boolean => {
            if (queue.pending.has(item.id)) {
                return queue.pending.get(item.id)!;
            }
            return sourceSelected.has(item.id);
        },
        [queue.pending, sourceSelected]
    );

    // Editability only reaches the widget through the reference set; in junction mode use the Read-only condition.
    const readOnly =
        props.readOnlyCondition?.value === true ||
        (isJunction ? !onSelect && !onDeselect : !referenceSet || referenceSet.readOnly);
    const locked = readOnly || !selectionReady;

    const canToggle = useCallback(
        (item: ObjectItem, select: boolean): boolean => {
            if (locked) {
                return false;
            }
            if (!isJunction) {
                return true;
            }
            const action = (select ? onSelect : onDeselect)?.get(item);
            return action?.canExecute === true;
        },
        [locked, isJunction, onSelect, onDeselect]
    );

    const term = search.trim().toLowerCase();
    const views: OptionView[] = useMemo(
        () =>
            items
                .map(item => {
                    const selected = isSelected(item);
                    return {
                        item,
                        caption: optionCaption.get(item).value ?? "",
                        selected,
                        disabled: !canToggle(item, !selected)
                    };
                })
                .filter(view => term === "" || view.caption.toLowerCase().includes(term)),
        [items, isSelected, optionCaption, canToggle, term]
    );

    const toggle = useCallback(
        (item: ObjectItem) => {
            const select = !isSelected(item);
            if (!canToggle(item, select)) {
                return;
            }
            if (isJunction) {
                queue.enqueueItem(item, select, true);
                return;
            }
            const current = referenceSet!.value ?? [];
            referenceSet!.setValue(select ? [...current, item] : current.filter(other => other.id !== item.id));
            queue.enqueueItem(item, select, false);
            queue.enqueueChange();
        },
        [isSelected, canToggle, isJunction, queue, referenceSet]
    );

    const setAllVisible = useCallback(
        (select: boolean) => {
            if (locked) {
                return;
            }
            const targets = views.filter(view => view.selected !== select && !view.disabled).map(view => view.item);
            if (targets.length === 0) {
                return;
            }
            if (isJunction) {
                const bulk = select ? onSelectAll : onClearAll;
                if (bulk && term === "") {
                    queue.enqueueBulk(
                        select,
                        targets.map(item => item.id)
                    );
                } else {
                    targets.forEach(item => queue.enqueueItem(item, select, true));
                }
                return;
            }
            const current = referenceSet!.value ?? [];
            const targetIds = new Set(targets.map(item => item.id));
            referenceSet!.setValue(
                select ? [...current, ...targets] : current.filter(other => !targetIds.has(other.id))
            );
            // Same behaviour as a single click: On select / On deselect per object, then one On change.
            targets.forEach(item => queue.enqueueItem(item, select, false));
            queue.enqueueChange();
        },
        [locked, views, isJunction, onSelectAll, onClearAll, term, queue, referenceSet]
    );

    const selectionLoading = !selectionReady && (isJunction ? !selectedOptions?.items : !referenceSet?.value);
    const loading = (options.status === ValueStatus.Loading && options.items === undefined) || selectionLoading;
    const validation = isJunction ? undefined : referenceSet?.validation;
    const columns = Math.min(Math.max(props.columns || 1, 1), 6);

    let message: string | undefined;
    if (!loading && items.length === 0) {
        message = props.emptyText?.value;
    } else if (!loading && views.length === 0) {
        message = props.noResultsText?.value;
    }

    return (
        <div
            className={classNames("widget-multiselectlist", props.class, {
                "widget-multiselectlist--readonly": readOnly,
                "widget-multiselectlist--busy": queue.busy || !selectionReady,
                "has-error": !!validation
            })}
            style={props.style}
            aria-busy={loading || queue.busy}
        >
            {(props.showSearch || props.showSelectAll) && items.length > 0 && (
                <Toolbar
                    showSearch={props.showSearch}
                    search={search}
                    onSearch={setSearch}
                    searchPlaceholder={props.searchPlaceholder?.value}
                    showSelectAll={props.showSelectAll && !readOnly}
                    bulkDisabled={locked}
                    selectAllCaption={props.selectAllCaption?.value}
                    clearAllCaption={props.clearAllCaption?.value}
                    onSelectAll={() => setAllVisible(true)}
                    onClearAll={() => setAllVisible(false)}
                    tabIndex={props.tabIndex}
                />
            )}
            {loading ? (
                <div className="widget-multiselectlist__loading" />
            ) : (
                <OptionList
                    id={props.id}
                    views={views}
                    displayStyle={props.displayStyle}
                    columns={columns}
                    readOnly={readOnly}
                    ariaLabel={props.ariaLabel?.value}
                    ariaLabelledBy={labelledBy}
                    tabIndex={props.tabIndex}
                    onToggle={toggle}
                />
            )}
            {message && <div className="widget-multiselectlist__message">{message}</div>}
            {validation && <div className="alert alert-danger mx-validation-message">{validation}</div>}
        </div>
    );
}
