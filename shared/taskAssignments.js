export function taskIsAvailableToMember(task, memberId) {
  if (!task || !memberId) return false;
  if (task.assignmentMode !== 'shared') return task.memberId === memberId;
  const eligibleMemberIds = Array.isArray(task.eligibleMemberIds)
    ? task.eligibleMemberIds
    : [];
  return !eligibleMemberIds.length || eligibleMemberIds.includes(memberId);
}
