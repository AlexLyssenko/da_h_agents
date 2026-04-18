export function buildDialogId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join(':')
}
