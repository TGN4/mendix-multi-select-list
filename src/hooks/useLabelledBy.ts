import { useEffect, useState } from "react";

/**
 * The Mendix Label system property renders <label for="{widget id}">. A label cannot name a div, so find that label
 * and return its id for aria-labelledby on the option group (giving it an id when it has none).
 */
export function useLabelledBy(widgetId: string | undefined, enabled: boolean): string | undefined {
    const [labelId, setLabelId] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!enabled || !widgetId) {
            setLabelId(undefined);
            return;
        }
        const label = Array.from(document.querySelectorAll("label")).find(element => element.htmlFor === widgetId);
        if (!label) {
            setLabelId(undefined);
            return;
        }
        if (!label.id) {
            label.id = `${widgetId}-label`;
        }
        setLabelId(label.id);
    }, [widgetId, enabled]);

    return labelId;
}
