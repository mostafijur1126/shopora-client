import { Response } from 'express';
import { z } from 'zod';
import { Expense } from '../models/Misc.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { AuthRequest } from '../middleware/auth.js';
import { recordActivity } from '../utils/activityLog.js';

export const getExpenses = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const expenses = await Expense.find().sort({ createdAt: -1 });
  res.json({ success: true, count: expenses.length, expenses });
});

const expenseSchema = z.object({
  title: z.string().min(1).max(150),
  category: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: z.string().min(1),
  note: z.string().max(500).optional(),
  isRecurring: z.boolean().optional(),
  recurrenceFrequency: z.enum(['monthly', 'weekly', 'yearly']).optional(),
});

const computeNextDueDate = (dateStr: string, frequency: 'monthly' | 'weekly' | 'yearly'): string => {
  const d = new Date(dateStr);
  if (frequency === 'weekly') d.setDate(d.getDate() + 7);
  else if (frequency === 'monthly') d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
};

export const createExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = expenseSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(`Invalid expense data: ${parsed.error.issues[0]?.message || 'validation failed'}`, 400);
  }
  const data = parsed.data;
  const date = new Date().toISOString().split('T')[0];

  const expense = await Expense.create({
    ...data,
    date,
    nextDueDate: data.isRecurring && data.recurrenceFrequency ? computeNextDueDate(date, data.recurrenceFrequency) : undefined,
  });

  await recordActivity(req, {
    actionType: 'create',
    module: 'expenses',
    description: `Recorded expense "${expense.title}".`,
    targetId: String(expense._id),
    targetName: expense.title,
    newValues: { title: expense.title, category: expense.category, amount: expense.amount },
  });
  res.status(201).json({ success: true, expense });
});

export const deleteExpense = asyncHandler(async (req: AuthRequest, res: Response) => {
  const expense = await Expense.findByIdAndDelete(req.params.id);
  if (!expense) throw new AppError('Expense not found', 404);
  await recordActivity(req, {
    actionType: 'delete',
    module: 'expenses',
    description: `Deleted expense "${expense.title}".`,
    targetId: String(expense._id),
    targetName: expense.title,
    previousValues: { title: expense.title, category: expense.category, amount: expense.amount },
  });
  res.json({ success: true, message: 'Expense deleted' });
});
