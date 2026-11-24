const whole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const cents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
export const usd = (n: number) => (Number.isInteger(n) ? whole : cents).format(n)
export const usd2 = (n: number) => cents.format(n)

/** Lists the transfers that bring every balance (paid minus owed, in cents) to zero. */
export function settleBalances(balances: number[]) {
  const bal = [...balances]
  const out: { from: number; to: number; amount: number }[] = []
  for (;;) {
    const from = bal.indexOf(Math.min(...bal))
    const to = bal.indexOf(Math.max(...bal))
    const amount = Math.min(-bal[from], bal[to])
    if (amount <= 0) return out
    bal[from] += amount
    bal[to] -= amount
    out.push({ from, to, amount })
  }
}
