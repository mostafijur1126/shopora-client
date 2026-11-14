import { Response } from 'express';
import { Order } from '../models/Order.js';
import { Purchase } from '../models/Purchase.js';
import { Expense } from '../models/Misc.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';

// GET /api/account/summary — combines sales, purchases, and expenses into one
// dashboard-ready summary. Admin only.
export const getAccountSummary = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const [orders, purchases, expenses] = await Promise.all([
    Order.find({ status: { $ne: 'cancelled' } }),
    Purchase.find(),
    Expense.find(),
  ]);

  const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
  const totalPurchase = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

  const cashReceived = orders.reduce((sum, o) => sum + (o.paidAmount ?? o.total), 0);
  const cashPaidOut = purchases.reduce((sum, p) => sum + p.paidAmount, 0) + totalExpense;
  const accountBalance = cashReceived - cashPaidOut;
  const estimatedProfit = totalSales - totalPurchase - totalExpense;

  // Last 30 days trend, grouped by day
  const days: { date: string; sales: number; purchase: number; expense: number }[] = [];
  const map = new Map<string, { date: string; sales: number; purchase: number; expense: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const row = { date: key, sales: 0, purchase: 0, expense: 0 };
    days.push(row);
    map.set(key, row);
  }
  orders.forEach((o) => {
    const row = map.get(o.date);
    if (row) row.sales += o.total;
  });
  purchases.forEach((p) => {
    const row = map.get(p.date);
    if (row) row.purchase += p.totalAmount;
  });
  expenses.forEach((e) => {
    const row = map.get(e.date);
    if (row) row.expense += e.amount;
  });

  res.json({
    success: true,
    summary: {
      totalSales,
      totalPurchase,
      totalExpense,
      cashReceived,
      cashPaidOut,
      accountBalance,
      estimatedProfit,
      trend: days,
    },
  });
});
