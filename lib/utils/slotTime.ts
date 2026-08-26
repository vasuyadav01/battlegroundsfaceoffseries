/**
 * Helper utility to determine if a tournament match slot has already passed/ended.
 * Takes slot.date ("YYYY-MM-DD") and slot.time_label (e.g. "02:00 PM", "05:00 PM - 3 Match Slot").
 */
export function isSlotPastOrEnded(
  dateStr: string,
  timeLabelStr: string,
  status?: string
): boolean {
  // If explicitly marked completed in DB
  if (status === 'completed') return true

  if (!dateStr) return false

  const now = new Date()

  // Format today's date in local YYYY-MM-DD
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const todayStr = `${year}-${month}-${day}`

  // Clean slot date (handle YYYY-MM-DD or YYYY-MM-DDT00:00:00)
  const cleanSlotDate = String(dateStr).split('T')[0].trim()

  // Compare dates first (YYYY-MM-DD lexically compares correctly)
  if (cleanSlotDate < todayStr) {
    return true // Slot date is before today
  }

  if (cleanSlotDate > todayStr) {
    return false // Slot date is in the future
  }

  // Same day: parse time from time_label
  // E.g. "02:00 PM", "5:00 PM", "08:00 PM", "2:00 PM - 3 Match Slot"
  const timeMatch = timeLabelStr.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)/i)
  if (!timeMatch) return false

  let hours = parseInt(timeMatch[1], 10)
  const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0
  const meridian = timeMatch[3].toUpperCase()

  if (meridian === 'PM' && hours < 12) {
    hours += 12
  } else if (meridian === 'AM' && hours === 12) {
    hours = 0
  }

  const slotDateTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes)

  // 15-minute grace period after match start time before marking closed
  const gracePeriodMinutes = 15
  const slotCutoffTime = new Date(slotDateTime.getTime() + gracePeriodMinutes * 60 * 1000)

  return now > slotCutoffTime
}
