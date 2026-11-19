import { CSSProperties, ReactElement, createElement } from "react";
import { ObjectItem } from "mendix";
import classNames from "classnames";

export interface OptionView {
    item: ObjectItem;
    caption: string;
    selected: boolean;
    disabled: boolean;
}

export interface OptionListProps {
    name: string;
    views: OptionView[];
    displayStyle: "checkboxes" | "chips";
    columns: number;
    readOnly: boolean;
    ariaLabel?: string;
    tabIndex?: number;
    onToggle: (item: ObjectItem) => void;
}

export function OptionList(props: OptionListProps): ReactElement | null {
    const { views, displayStyle, readOnly, onToggle } = props;
    if (views.length === 0) {
        return null;
    }

    if (displayStyle === "chips") {
        return (
            <div className="widget-multiselectlist__chips" role="group" aria-label={props.ariaLabel}>
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
            role="group"
            aria-label={props.ariaLabel}
            style={style}
        >
            {views.map(view => {
                const id = `${props.name}-${view.item.id}`;
                return (
                    <div
                        key={view.item.id}
                        className={classNames("widget-multiselectlist__option", {
                            "widget-multiselectlist__option--selected": view.selected,
                            "widget-multiselectlist__option--disabled": view.disabled
                        })}
                    >
                        <input
                            id={id}
                            type="checkbox"
                            checked={view.selected}
                            disabled={view.disabled}
                            tabIndex={props.tabIndex}
                            onChange={() => onToggle(view.item)}
                        />
                        <label htmlFor={id}>{view.caption}</label>
                    </div>
                );
            })}
        </div>
    );
}
