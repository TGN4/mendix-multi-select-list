# Multi-select list (Mendix pluggable widget)

A generic, plug-and-play selectable list for **many-to-many relations** in Mendix 10 and 11.
Shown as a checkbox list (1–6 columns) or as chips, with optional search and select all / clear all.

It supports the two common ways to model a many-to-many relation:

| Mode | Domain model | How the widget saves |
|---|---|---|
| **Reference set** | `Context` *—* `Option` (association type *Reference set*) | Writes the reference set on the context object directly. Nothing else to build. |
| **Junction entity** | `Context` ← `Junction` → `Option` (two references on a junction entity, often with extra attributes) | Calls **On select** / **On deselect** with the clicked option; your microflow or nanoflow creates or deletes the junction object. |

## Installation

1. Download `conclusion.MultiSelectList.mpk` from the [releases](../../releases) (or build it, see below).
2. Put it in the `widgets/` folder of your Mendix app and press *F4* (Synchronize app directory) in Studio Pro.
3. Find **Multi-select list** in the toolbox under *Input elements*.

## Usage

Put the widget inside a data view (or list view or data grid) of the **context** entity.

### Mode 1 — Reference set

| Property | Value |
|---|---|
| Relation type | Reference set |
| Selectable objects | Data source of all options, e.g. Database `Option` with XPath `[IsActive = true()]` and a sort order |
| Caption | e.g. `{Name}` |
| Reference set | The `Context_Option` reference set |

Optional: **On select / On deselect** (per changed object, also for select all / clear all) and **On change**
(once, after them) for side effects. All actions run one after another.
The object is changed, not committed: save it with your normal Save button or in On change.

### Mode 2 — Junction entity

Example domain model: `Context` ← `Junction` → `Option`, with `Junction_Context` and `Junction_Option`.

| Property | Value |
|---|---|
| Relation type | Junction entity (via actions) |
| Selectable objects | Database `Option` (all choices) |
| Caption | e.g. `{Name}` |
| Selected objects | Database `Option` with XPath `[Module.Junction_Option/Module.Junction/Module.Junction_Context = '[%CurrentObject%]']` |
| On select | Microflow `ACT_Junction_Create(Option, Context)`: create `Junction`, set both references, commit |
| On deselect | Microflow `ACT_Junction_Delete(Option, Context)`: retrieve the `Junction` for this option and context, delete |

Notes:

- *Selected objects* must be of the **same entity** as *Selectable objects*: the widget compares object ids.
  A microflow data source works too, as long as it returns the selected options.
- The actions run one after another (safe with *Disallow concurrent execution*). The widget shows the change
  at once and reloads *Selected objects* when the last action is done. If an action fails, the checkbox returns to
  the real state after the reload.
- Pass the context object to the action as a second parameter (Studio Pro maps it from the surrounding data view).
- Make the actions **idempotent**: On select only creates a junction object when none exists for this option and
  context, On deselect deletes whatever exists. That keeps the data right even after a double click or a slow network.
- The list is locked until *Selected objects* has loaded, so a click can never act on a stale selection.
- When the widget is removed while actions are still queued (popup closed, page left), the remaining actions are
  started at once. With *Disallow concurrent execution* on those microflows some could be refused: for popups, prefer
  *On select all* / *On clear all* for bulk changes, or switch that setting off for idempotent create/delete flows.
- **Select all / Clear all**: configure *On select all* / *On clear all* for one call, otherwise the widget calls
  *On select* / *On deselect* per object. With an active search only the visible objects are (de)selected.
- Commit inside the actions (or handle a "draft" yourself): a junction object is its own object, it is not saved
  with the context object.

### Read-only

- **Read-only condition** (expression, e.g. `$currentObject/Status != 'Draft'`) works in both modes.
- *Editable* (Editability) and entity access only apply in **reference set mode**: Mendix passes them through the
  reference set. In junction mode use the Read-only condition.
- Junction mode disables an option when its action cannot run (no action configured or no access to it).

### Styling

Root class `widget-multiselectlist`. Colors come from Atlas variables (`--brand-primary`, `--border-color-default`,
`--font-color-detail`) with neutral fallbacks. Override `--msl-accent`, `--msl-border`, `--msl-gap` on the widget
class to restyle it.

## Properties

| Group | Property | Description |
|---|---|---|
| Data source | Relation type | Reference set or Junction entity |
| | Selectable objects | All options |
| | Caption | Text per option |
| | Reference set | Reference set mode only |
| | Selected objects | Junction mode only |
| Display | Display style | Checkbox list or Chips |
| | Columns | 1–6 (checkbox list), one column on small screens |
| | Empty list text | Shown when there are no options |
| Search | Show search field, Placeholder, No results text | Client-side filter on the caption |
| Select all | Show select all / clear all, captions | |
| Editability | Editable, Read-only condition | |
| Accessibility | Aria label | Name of the list for screen readers |
| Events | On select, On deselect | Per object (required in junction mode) |
| | On select all, On clear all | Junction mode, optional bulk actions |
| | On change | Once after every change |

## Development

```bash
npm install
npm run build      # creates dist/<version>/conclusion.MultiSelectList.mpk
npm run lint
```

Set `config.projectPath` in `package.json` to a test app to have the build copy the `.mpk` into its `widgets/` folder,
and use `npm start` for a watch build.

## License

Apache-2.0
