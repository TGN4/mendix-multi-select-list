/**
 * This file was generated from MultiSelectList.xml
 * WARNING: All changes made to this file will be overwritten
 * @author Mendix Widgets Framework Team
 */
import { ActionValue, DynamicValue, ListValue, ListActionValue, ListExpressionValue, ReferenceSetValue } from "mendix";

export type SelectionModeEnum = "referenceSet" | "junction";

export type DisplayStyleEnum = "checkboxes" | "chips";

export interface MultiSelectListContainerProps {
    name: string;
    tabIndex?: number;
    id: string;
    selectionMode: SelectionModeEnum;
    options: ListValue;
    optionCaption: ListExpressionValue<string>;
    referenceSet?: ReferenceSetValue;
    selectedOptions?: ListValue;
    displayStyle: DisplayStyleEnum;
    columns: number;
    emptyText?: DynamicValue<string>;
    showSearch: boolean;
    searchPlaceholder?: DynamicValue<string>;
    noResultsText?: DynamicValue<string>;
    showSelectAll: boolean;
    selectAllCaption?: DynamicValue<string>;
    clearAllCaption?: DynamicValue<string>;
    readOnlyCondition?: DynamicValue<boolean>;
    ariaLabel?: DynamicValue<string>;
    onSelect?: ListActionValue;
    onDeselect?: ListActionValue;
    onSelectAll?: ActionValue;
    onClearAll?: ActionValue;
    onChange?: ActionValue;
}

export interface MultiSelectListPreviewProps {
    readOnly: boolean;
    renderMode: "design" | "xray" | "structure";
    translate: (text: string) => string;
    selectionMode: SelectionModeEnum;
    options: {} | { caption: string } | { type: string } | null;
    optionCaption: string;
    referenceSet: string;
    selectedOptions: {} | { caption: string } | { type: string } | null;
    displayStyle: DisplayStyleEnum;
    columns: number | null;
    emptyText: string;
    showSearch: boolean;
    searchPlaceholder: string;
    noResultsText: string;
    showSelectAll: boolean;
    selectAllCaption: string;
    clearAllCaption: string;
    readOnlyCondition: string;
    ariaLabel: string;
    onSelect: {} | null;
    onDeselect: {} | null;
    onSelectAll: {} | null;
    onClearAll: {} | null;
    onChange: {} | null;
}
