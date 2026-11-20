import { CSSProperties, ReactElement, createElement, useId } from "react";
import { ObjectItem } from "mendix";
import classNames from "classnames";

export interface OptionView {
    item: ObjectItem;
    caption: string;
    selected: boolean;
    disabled: boolean;
}

export interface OptionListProps {
    /** The widget id from Mendix; the Label system property points its <label for> here. */
    id?: string;
    views: OptionView[];
    displayStyle: "checkboxes" | "chips";
    columns: number;
    readOnly: boolean;
    ariaLabel?: string;
    ariaLabelledBy?: string;
    tabIndex?: number;
    onToggle: (item: ObjectItem) => void;
}

export function OptionList(props: OptionListProps): ReactElement | null {
    const { views, displayStyle, readOnly, onToggle } = props;
    // Unique per widget instance: the same option can appear in many rows of a list view or data grid.
    const uid = useId();
    if (views.length === 0) {
        return null;
    }

    const groupProps = {
        id: props.id,
        role: "group",
        "aria-label": props.ariaLabel || undefined,
        "aria-labelledby": props.ariaLabel ? undefined : props.ariaLabelledBy
    };

    if (displayStyle === "chips") {
        return (
            <div className="widget-multiselectlist__chips" {...groupProps}>
                {views.map(view => (
                    <button
                        key={view.item.id}
                        type="button"
                        className={classNames("widget-multiselectlist__chip", {
                            "widget-multiselectlist__chip--selected": view.selected
                        })}
                        aria-pressed={view.selected}
                        disabled={view.disabled}
                        tabIndex={props.tabIndex}
                        onClick={() => onToggle(view.item)}
                    >
                        {view.caption}
                    </button>
                ))}
            </div>
        );
    }

    const style = { "--msl-columns": props.columns } as CSSProperties;
    return (
        <div
            className={classNames("widget-multiselectlist__checkboxes", { "is-readonly": readOnly })}
            style={style}
            {...groupProps}
        >
            {views.map(view => {
                const inputId = `${uid}-${view.item.id}`;
                return (
                    <div
                        key={view.item.id}
                        className={classNames("widget-multiselectlist__option", {
                            "widget-multiselectlist__option--selected": view.selected,
                            "widget-multiselectlist__option--disabled": view.disabled
                        })}
                    >
                        <input
                            id={inputId}
                            type="checkbox"
                            checked={view.selected}
                            disabled={view.disabled}
                            tabIndex={props.tabIndex}
                            onChange={() => onToggle(view.item)}
                        />
                        <label htmlFor={inputId}>{view.caption}</label>
                    </div>
                );
            })}
        </div>
    );
}
