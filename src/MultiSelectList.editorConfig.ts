import { MultiSelectListPreviewProps } from "../typings/MultiSelectListProps";

type Property = {
    key: string;
    caption: string;
    description?: string;
    objectHeaders?: string[];
    objects?: ObjectProperties[];
    properties?: Properties[];
};

type ObjectProperties = {
    properties: PropertyGroup[];
    captions?: string[];
};

export type PropertyGroup = {
    caption: string;
    propertyGroups?: PropertyGroup[];
    properties?: Property[];
};

export type Properties = PropertyGroup[];

type Problem = {
    property?: string;
    severity?: "error" | "warning" | "deprecation";
    message: string;
    studioMessage?: string;
    url?: string;
    studioUrl?: string;
};

function hide(groups: PropertyGroup[], keys: string[]): void {
    for (const group of groups) {
        if (group.properties) {
            group.properties = group.properties.filter(property => !keys.includes(property.key));
        }
        if (group.propertyGroups) {
            hide(group.propertyGroups, keys);
            group.propertyGroups = group.propertyGroups.filter(
                child => (child.properties?.length ?? 0) > 0 || (child.propertyGroups?.length ?? 0) > 0
            );
        }
    }
}

export function getProperties(values: MultiSelectListPreviewProps, defaultProperties: Properties): Properties {
    const hidden: string[] = [];

    if (values.selectionMode === "referenceSet") {
        hidden.push("selectedOptions", "onSelectAll", "onClearAll");
    } else {
        hidden.push("referenceSet");
    }
    if (values.displayStyle === "chips") {
        hidden.push("columns");
    }
    if (!values.showSearch) {
        hidden.push("searchPlaceholder", "noResultsText");
    }
    if (!values.showSelectAll) {
        hidden.push("selectAllCaption", "clearAllCaption", "onSelectAll", "onClearAll");
    }

    hide(defaultProperties, hidden);
    return defaultProperties;
}

export function check(values: MultiSelectListPreviewProps): Problem[] {
    const errors: Problem[] = [];

    if (values.selectionMode === "referenceSet") {
        if (!values.referenceSet) {
            errors.push({
                property: "referenceSet",
                message: "Select the reference set that holds the selection."
            });
        }
    } else {
        if (!values.selectedOptions) {
            errors.push({
                property: "selectedOptions",
                message:
                    "Junction mode needs 'Selected objects': the currently selected objects, of the same entity as 'Selectable objects'."
            });
        }
        if (!values.onSelect) {
            errors.push({
                property: "onSelect",
                message: "Junction mode needs 'On select' to create the junction object."
            });
        }
        if (!values.onDeselect) {
            errors.push({
                property: "onDeselect",
                message: "Junction mode needs 'On deselect' to delete the junction object."
            });
        }
    }

    if (values.columns !== null && (values.columns < 1 || values.columns > 6)) {
        errors.push({
            property: "columns",
            severity: "warning",
            message: "Columns should be between 1 and 6; other values are clamped."
        });
    }

    return errors;
}

export function getPreview(_values: MultiSelectListPreviewProps, isDarkMode: boolean): object {
    return {
        type: "Container",
        borders: true,
        borderRadius: 4,
        padding: 8,
        children: [
            {
                type: "Text",
                content: "Multi-select list",
                fontColor: isDarkMode ? "#DEDEDE" : "#6B707B"
            }
        ]
    };
}
