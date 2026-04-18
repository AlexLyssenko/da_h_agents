import { formatDistanceToNow, format, isToday, isYesterday, isSameDay } from 'date-fns'

export function formatRelative(dateStr: string): string {
  const date = new Date(dateStr)
  return formatDistanceToNow(date, { addSuffix: true })
}

export function formatFull(dateStr: string): string {
  return format(new Date(dateStr), 'PPpp')
}

export function formatTime(dateStr: string): string {
  return format(new Date(dateStr), 'HH:mm')
}

export function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'MMMM d, yyyy')
}

export function isSameDay_(a: string, b: string): boolean {
  return isSameDay(new Date(a), new Date(b))
}
