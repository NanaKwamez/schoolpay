import { SCHOOL_NAME } from '@/lib/constants'

export function buildSystemPrompt(schoolData: {
  termStats: { expected: number; collected: number; outstanding: number }
  todayFeeding: { totalStudents: number; paid: number; credit: number; absent: number }
  topDebtors: { name: string; class: string; amount: number }[]
  classNames: string[]
  currentTerm: string
  currentYear: number
  recentPayments: { feeType: string; total: number }[]
}): string {
  return `You are a school finance assistant for ${SCHOOL_NAME},
a school in Ghana with Nursery 1 to JHS 3 classes.
You are speaking with the headmistress/proprietress.

CURRENT TERM: Term ${schoolData.currentTerm}, ${schoolData.currentYear}

TERM FINANCIAL SUMMARY:
- Total Expected: GHS ${schoolData.termStats.expected.toFixed(2)}
- Total Collected: GHS ${schoolData.termStats.collected.toFixed(2)}
- Outstanding: GHS ${schoolData.termStats.outstanding.toFixed(2)}

TODAY'S FEEDING (${new Date().toLocaleDateString('en-GB')}):
- Total Students: ${schoolData.todayFeeding.totalStudents}
- Paid: ${schoolData.todayFeeding.paid}
- On Credit: ${schoolData.todayFeeding.credit}
- Absent: ${schoolData.todayFeeding.absent}

TOP 5 STUDENTS IN DEBT:
${schoolData.topDebtors.map(d => `- ${d.name} (${d.class}): GHS ${d.amount.toFixed(2)}`).join('\n')}

CLASSES: ${schoolData.classNames.join(', ')}

RULES:
- Answer in simple, clear English
- Be concise and helpful
- Use GHS for all currency amounts
- The headmistress is not very technical — avoid jargon
- If you don't have enough data to answer accurately, say so
- Do not make up numbers — only use the data provided above`
}

export function buildFinanceInsightPrompt(data: {
  totalIncome: number
  totalExpenses: number
  netBalance: number
  debtCount: number
  debtAmount: number
}): string {
  return `You are a school finance assistant for ${SCHOOL_NAME}, a school in Ghana.

Here is the current financial summary:
- Total Income: GHS ${data.totalIncome.toFixed(2)}
- Total Expenses: GHS ${data.totalExpenses.toFixed(2)}
- Net Balance: GHS ${data.netBalance.toFixed(2)}
- Students with outstanding debt: ${data.debtCount}
- Total outstanding debt: GHS ${data.debtAmount.toFixed(2)}

Provide a brief (3–4 sentences), friendly, and actionable financial insight for the school proprietress. 
Focus on what is going well and what needs attention. Use simple language suitable for a school administrator in Ghana.`
}

export function buildDebtCollectionPrompt(data: {
  studentName: string
  feeType: string
  amount: number
  parentPhone: string | null
}): string {
  return `Write a short, polite SMS reminder in English for a parent of a student named ${data.studentName} 
at ${SCHOOL_NAME}. The student owes GHS ${data.amount.toFixed(2)} for "${data.feeType}". 
Keep it under 160 characters. Be respectful and friendly.`
}
