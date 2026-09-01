# Carmen Frontend UI Rules

For every new or substantially changed React page, apply the `carmen-ui-consistency` skill.

- Start from the closest existing page and reuse its skeleton.
- Prefer shared Carmen components over raw HTML controls or one-off styling.
- Match existing header, toolbar, spacing, typography, table, form, and responsive patterns.
- Before handoff, test loading/empty/error/view/edit/mobile states and run `bunx tsc --noEmit` plus React Doctor.
