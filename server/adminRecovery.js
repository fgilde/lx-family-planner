const ADMIN_ROLES = Object.freeze(['adult', 'senior']);

export function repairFamiliesWithoutAdmin(database, now = Date.now()) {
  const candidates = database.prepare(`
    SELECT member.id, member.family_id AS familyId
    FROM members AS member
    WHERE member.role = 'member'
      AND COALESCE(member.is_managed, 0) = 0
      AND NOT EXISTS (
        SELECT 1
        FROM members AS admin
        WHERE admin.family_id = member.family_id
          AND admin.role IN ('adult', 'senior')
          AND COALESCE(admin.is_managed, 0) = 0
      )
    ORDER BY member.family_id, member.created_at, member.id
  `).all();

  const repairedFamilyIds = new Set();
  const promote = database.prepare(`
    UPDATE members
    SET role = 'adult', updated_at = ?
    WHERE id = ? AND family_id = ?
  `);

  for (const candidate of candidates) {
    if (repairedFamilyIds.has(candidate.familyId)) continue;
    promote.run(now, candidate.id, candidate.familyId);
    repairedFamilyIds.add(candidate.familyId);
  }

  return [...repairedFamilyIds];
}

export function hasFamilyAdmin(members) {
  return (Array.isArray(members) ? members : []).some(member =>
    member &&
    member.isManaged !== true &&
    ADMIN_ROLES.includes(member.role)
  );
}
