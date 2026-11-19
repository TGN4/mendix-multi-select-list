import { ReactElement, createElement } from "react";
import classNames from "classnames";

import { MultiSelectListPreviewProps } from "../typings/MultiSelectListProps";

const SAMPLE = ["Option 1", "Option 2", "Option 3"];

export function preview(props: MultiSelectListPreviewProps): ReactElement {
    const mode = props.selectionMode === "junction" ? "junction entity" : "reference set";
    return (
        <div className={classNames("widget-multiselectlist", { "widget-multiselectlist--readonly": props.readOnly })}>
            {props.displayStyle === "chips" ? (
                <div className="widget-multiselectlist__chips">
                    {SAMPLE.map((caption, index) => (
                        <span
                            key={caption}
                            className={classNames("widget-multiselectlist__chip", {
                                "widget-multiselectlist__chip--selected": index === 0
                            })}
                        >
                            {caption}
                        </span>
                    ))}
                </div>
            ) : (
                <div className="widget-multiselectlist__checkboxes">
                    {SAMPLE.map((caption, index) => (
                        <div key={caption} className="widget-multiselectlist__option">
                            <input type="checkbox" checked={index === 0} readOnly />
                            <label>{caption}</label>
                        </div>
                    ))}
                </div>
            )}
            <div className="widget-multiselectlist__message">Multi-select list ({mode})</div>
        </div>
    );
}

export function getPreviewCss(): string {
    return require("./ui/MultiSelectList.scss");
}
