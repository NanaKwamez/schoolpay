import { SCHOOL_NAME } from '@/lib/constants'

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

export function buildChatSystemPrompt(): string {
  return `You are SchoolPay AI, a helpful finance assistant for ${SCHOOL_NAME} in Ghana. 
You help the school administrator understand financial data, answer questions about fees, 
expenses, payments, and provide actionable advice. Be concise, friendly, and professional. 
Always respond in English. Use GHS as the currency.`
}
