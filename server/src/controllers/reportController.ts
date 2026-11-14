import { Response } from "express";
import { Expense } from "../models/Misc.js";
import { AuthRequest } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

export const getExpenseReport = asyncHandler(
  async (_req: AuthRequest, res: Response) => {
    const expenses = await Expense.find()
      .select("_id title category amount date createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      expenses: expenses.map(({ _id, ...expense }) => ({
        id: String(_id),
        ...expense,
      })),
    });
  },
);
