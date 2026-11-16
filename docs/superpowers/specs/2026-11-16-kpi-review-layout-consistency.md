# KPI Review Layout Consistency

## Goal

Keep KPI review navigation and result cards visually stable across roles and months without changing scoring or review permissions.

## Confirmed Decisions

- Boss review left rail continues to contain department supervisors only. It does not gain employee entries.
- Boss `汇总复核` uses the same page heading, two-column review layout, right-side result card border, and unified result workspace as HR review. The supervisor list remains the only role-specific left-rail content.
- October's published read-only result and November's editable review use the same boss review structure. Published state changes available actions/content, not the placement or frame of the workspace.
- Boss monthly publication remains a separate view and keeps its existing publication summaries and result groups.
- Supervisor review always displays the department overview above the two-column work area, whether the selected item is the supervisor's own result or an employee. The overview summarizes employees in the selected supervisor's department; the supervisor's own score is excluded from those employee averages.
- In published review details, keep the result card's right-aligned `已公示` label and hide the duplicate status tag outside the card. Other non-published workflow status tags remain visible.

## Boundaries

- Do not change role permissions, KPI calculations, persistence, publication gates, appeal behavior, or boss rating semantics.
- Keep the public-result presentation unchanged except for removing the duplicate status in the review workspace.
- Use the existing Ant Design result, tags, and layout components; do not introduce dependencies or a new visual system.

## Observable Acceptance

1. Selecting a supervisor or employee in supervisor review leaves the department overview present and shows department employee count, current average, and review preview.
2. Boss review in both `2026-10` and `2026-11` retains only supervisor entries in the left rail and renders the same heading/layout/right-card frame. October is read-only; November retains boss rating controls.
3. Boss monthly publication remains unchanged.
4. In a published employee review, only the result card's right-aligned `已公示` label is present; the duplicate outer tag is absent.
5. Existing HR, supervisor, boss rating, and published result behavior remains covered by focused tests.

## Edge Conditions

- A department with no employee rows must show `0 位员工` and safe zero averages rather than `NaN`.
- A month with no supervisor records keeps the existing standard empty state inside the bordered result workspace.
- Published status changes actions to read-only but must not remove the outer review card frame or reorder the left rail.
