# Block history audit

The board records changes to `project.items`, including nested column items. Each pointer gesture or discrete keyboard action starts an undo step; continuous typing is grouped until a pause or a different field. Explicit history checkpoints still delimit compound canvas actions. No-op changes do not consume undo steps. History is in memory and resets when switching projects or reloading.

| Operations                                                                         | Previous coverage                            | Current coverage                                                         |
| ---------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------ |
| Create, delete, duplicate, paste, join drawings, group in frame                    | Explicit checkpoints                         | Recorded, one interaction per step                                       |
| Move, resize, line endpoints and connections                                       | Explicit checkpoints                         | Recorded; pointer movement grouped                                       |
| Edit bar colors, typography, layers, lock, auto-fit                                | Incomplete                                   | Recorded centrally                                                       |
| Note, text, image caption/URL, link fields                                         | Incomplete                                   | Recorded centrally                                                       |
| Checklist title, add/edit/remove/toggle/reorder entries                            | Incomplete                                   | Recorded centrally                                                       |
| Kanban title, columns/order/width/colors, cards/status/order                       | Incomplete                                   | Recorded centrally                                                       |
| Checklist ↔ Kanban and column transfers                                           | Explicit transfer checkpoints                | Recorded together as one gesture                                         |
| Document content/formatting, code/language, embed settings, dispenser settings     | Incomplete                                   | Recorded centrally                                                       |
| Timeline task dates, completion, checklists, order, schedule movement/duration     | Missing                                      | Recorded; task dialog Save is one step, Cancel makes no persisted change |
| Diagram nodes, edges, labels, colors, shape, layout, movement, deletion/disconnect | Missing; editor swallowed keyboard shortcuts | Recorded; Ctrl+Z works inside the diagram editor                         |
| Item tags and comments                                                             | Incomplete                                   | Recorded when stored on the item                                         |

Text fields retain native text undo and Document retains its rich-text editor undo while focused. Outside text fields Ctrl+Z restores board state; checkboxes no longer suppress it. Timeline dialog drafts remain local until Save. Pan, zoom, selection, open menus/dialogs, clipboard contents, theme and diagram viewport are UI state rather than board history.

## Verification

Automated tests cover history transitions for checklist/timeline/diagram, gesture grouping, no-ops, resets, native undo overlap, color defaults and custom colors. Browser checks cover checklist completion and typography; timeline completion, Save, ordering, drag and resize; diagram add, disconnect and movement; light/dark default backgrounds versus a custom yellow background. Card outlines are absent and card corners are 2px. Semantic diagram shapes and frame boundaries remain identifiable.
