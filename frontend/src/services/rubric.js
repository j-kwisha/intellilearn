export function rubricError(rubric, maximum) {
  if (!rubric) return null;
  if (!rubric.title?.trim() || !rubric.criteria?.length) return 'Add a rubric title and at least one criterion.';
  const total = rubric.criteria.reduce((sum, c) => sum + Math.round(Number(c.max_points) * 100), 0);
  if (!Number.isFinite(total) || total !== Math.round(Number(maximum) * 100)) return 'Rubric criterion points must equal question points.';
  const names = new Set();
  for (const c of rubric.criteria) {
    const name = c.criterion?.trim().toLowerCase();
    if (!name || names.has(name) || !c.description?.trim() || Number(c.max_points) <= 0) return 'Give each criterion a unique name, description and positive points.';
    names.add(name);
    if (!c.levels?.length) return 'Add performance levels to each criterion.';
    let previous = -1;
    for (const l of [...c.levels].sort((a, b) => Number(a.min_points) - Number(b.min_points))) {
      const low = Number(l.min_points), high = Number(l.max_points);
      if (!l.label?.trim() || !l.description?.trim() || l.min_points === '' || l.max_points === '' || !Number.isFinite(low) || !Number.isFinite(high) || low < 0 || low < previous || high < low || high > Number(c.max_points)) return 'Complete valid, non-overlapping performance ranges within each criterion maximum.';
      previous = high;
    }
  }
  return null;
}
