import { useState } from 'react'
import MainCalendar from './components/MainCalendar'
import type { ExpenseItem } from './lib/expenseHistoryUtils'

function App() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])

  return (
    <div className="min-h-dvh min-h-svh w-full overflow-x-hidden bg-[#eef2f6]">
      <main
        className="mx-auto flex w-full max-w-md min-h-dvh min-h-svh flex-col overflow-x-hidden rounded-xl bg-[#f3f4f6] shadow-lg ring-1 ring-black/5 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] px-3.5 sm:px-4"
        aria-label="급여 캘린더"
      >
        <MainCalendar expenses={expenses} setExpenses={setExpenses} />
      </main>
    </div>
  )
}

export default App
