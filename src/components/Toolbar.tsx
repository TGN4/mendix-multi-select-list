import { ReactElement, createElement } from "react";

export interface ToolbarProps {
    showSearch: boolean;
    search: string;
    onSearch: (value: string) => void;
    searchPlaceholder?: string;
    showSelectAll: boolean;
    selectAllCaption?: string;
    clearAllCaption?: string;
    onSelectAll: () => void;
    onClearAll: () => void;
    tabIndex?: number;
}

export function Toolbar(props: ToolbarProps): ReactElement {
    return (
        <div className="widget-multiselectlist__toolbar">
            {props.showSearch && (
                <input
                    type="search"
                    className="form-control widget-multiselectlist__search"
                    value={props.search}
                    placeholder={props.searchPlaceholder}
                    aria-label={props.searchPlaceholder}
                    tabIndex={props.tabIndex}
                    onChange={event => props.onSearch(event.target.value)}
                />
            )}
            {props.showSelectAll && (
                <div className="widget-multiselectlist__bulk">
                    <button
                        type="button"
                        className="btn btn-link widget-multiselectlist__select-all"
                        tabIndex={props.tabIndex}
                        onClick={props.onSelectAll}
                    >
                        {props.selectAllCaption || "Select all"}
                    </button>
                    <button
                        type="button"
                        className="btn btn-link widget-multiselectlist__clear-all"
                        tabIndex={props.tabIndex}
                        onClick={props.onClearAll}
                    >
                        {props.clearAllCaption || "Clear all"}
                    </button>
                </div>
            )}
        </div>
    );
}
