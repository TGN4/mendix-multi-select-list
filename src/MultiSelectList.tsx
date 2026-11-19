import { CSSProperties, ReactElement, createElement, useCallback, useMemo, useState } from "react";
import { ObjectItem, ValueStatus } from "mendix";
import classNames from "classnames";

import { MultiSelectListContainerProps } from "../typings/MultiSelectListProps";
import { useJunctionQueue } from "./hooks/useJunctionQueue";
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

    const junction = useJunctionQueue({ selectedOptions, onSelect, onDeselect, onSelectAll, onClearAll, onChange });

    const items: ObjectItem[] = useMemo(() => options.items ?? [], [options.items]);

    const sourceSelected = useMemo(() => {
        const list = isJunction ? selectedOptions?.items : referenceSet?.value;
        return new Set<string>((list ?? []).map(item => item.id));
    }, [isJunction, selectedOptions?.items, referenceSet?.value]);

    const isSelected = useCallback(
        (item: ObjectItem): boolean => {
            if (isJunction && junction.pending.has(item.id)) {
                return junction.pending.get(item.id)!;
            }
            return sourceSelected.has(item.id);
        },
        [isJunction, junction.pending, sourceSelected]
    );

    const readOnly =
        props.readOnlyCondition?.value === true ||
        (isJunction ? !onSelect && !onDeselect : !referenceSet || referenceSet.readOnly);

    const canToggle = useCallback(
        (item: ObjectItem, select: boolean): boolean => {
            if (readOnly) {
                return false;
            }
            if (!isJunction) {
                return true;
            }
            const action = (select ? onSelect : onDeselect)?.get(item);
            return action?.canExecute === true;
        },
        [readOnly, isJunction, onSelect, onDeselect]
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

    const runAfterReferenceSetChange = useCallback(
        (item?: ObjectItem, select?: boolean) => {
            if (item && select !== undefined) {
                const action = (select ? onSelect : onDeselect)?.get(item);
                if (action?.canExecute) {
                    action.execute();
                }
            }
            if (onChange?.canExecute) {
                onChange.execute();
            }
        },
        [onSelect, onDeselect, onChange]
    );

    const toggle = useCallback(
        (item: ObjectItem) => {
            const select = !isSelected(item);
            if (!canToggle(item, select)) {
                return;
            }
            if (isJunction) {
                junction.enqueueItem(item, select);
                return;
            }
            const current = referenceSet?.value ?? [];
            referenceSet?.setValue(select ? [...current, item] : current.filter(other => other.id !== item.id));
            runAfterReferenceSetChange(item, select);
        },
        [isSelected, canToggle, isJunction, junction, referenceSet, runAfterReferenceSetChange]
    );

    const setAllVisible = useCallback(
        (select: boolean) => {
            if (readOnly) {
                return;
            }
            const targets = views.filter(view => view.selected !== select && !view.disabled).map(view => view.item);
            if (targets.length === 0) {
                return;
            }
            if (isJunction) {
                const bulk = select ? onSelectAll : onClearAll;
                if (bulk && term === "") {
                    junction.enqueueBulk(
                        select,
                        targets.map(item => item.id)
                    );
                } else {
                    targets.forEach(item => junction.enqueueItem(item, select));
                }
                return;
            }
            const current = referenceSet?.value ?? [];
            const targetIds = new Set(targets.map(item => item.id));
            referenceSet?.setValue(
                select ? [...current, ...targets] : current.filter(other => !targetIds.has(other.id))
            );
            runAfterReferenceSetChange();
        },
        [readOnly, views, isJunction, onSelectAll, onClearAll, term, junction, referenceSet, runAfterReferenceSetChange]
    );

    const loading = options.status === ValueStatus.Loading && options.items === undefined;
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
                "widget-multiselectlist--busy": junction.busy,
                "has-error": !!validation
            })}
            style={props.style}
            aria-busy={loading || junction.busy}
        >
            {(props.showSearch || props.showSelectAll) && items.length > 0 && (
                <Toolbar
                    showSearch={props.showSearch}
                    search={search}
                    onSearch={setSearch}
                    searchPlaceholder={props.searchPlaceholder?.value}
                    showSelectAll={props.showSelectAll && !readOnly}
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
                    name={props.name}
                    views={views}
                    displayStyle={props.displayStyle}
                    columns={columns}
                    readOnly={readOnly}
                    ariaLabel={props.ariaLabel?.value}
                    tabIndex={props.tabIndex}
                    onToggle={toggle}
                />
            )}
            {message && <div className="widget-multiselectlist__message">{message}</div>}
            {validation && <div className="alert alert-danger mx-validation-message">{validation}</div>}
        </div>
    );
}
