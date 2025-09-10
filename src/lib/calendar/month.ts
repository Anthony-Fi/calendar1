export type DayCell = {
  date: Date
  inCurrentMonth: boolean
  isToday: boolean
}

// weekStartsOn: 0=Sunday, 1=Monday
export function getMonthGrid(year: number, monthIndex0: number, weekStartsOn = 0): DayCell[][] {
  const firstOfMonth = new Date(Date.UTC(year, monthIndex0, 1))
  const lastOfMonth = new Date(Date.UTC(year, monthIndex0 + 1, 0))

  // Determine start date of the grid
  const startDay = (firstOfMonth.getUTCDay() - weekStartsOn + 7) % 7
  const gridStart = new Date(firstOfMonth)
  gridStart.setUTCDate(firstOfMonth.getUTCDate() - startDay)

  const weeks: DayCell[][] = []
  const today = new Date()
  const todayY = today.getUTCFullYear()
  const todayM = today.getUTCMonth()
  const todayD = today.getUTCDate()

  for (let w = 0; w < 6; w++) {
    const row: DayCell[] = []
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(gridStart)
      cellDate.setUTCDate(gridStart.getUTCDate() + w * 7 + d)
      const inCurrentMonth = cellDate.getUTCMonth() === monthIndex0
      const isToday =
        cellDate.getUTCFullYear() === todayY &&
        cellDate.getUTCMonth() === todayM &&
        cellDate.getUTCDate() === todayD
      row.push({ date: cellDate, inCurrentMonth, isToday })
    }
    weeks.push(row)
  }

  return weeks
}
