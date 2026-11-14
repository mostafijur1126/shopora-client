import { Router, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Staff, normalizeStaffRole } from '../models/Staff.js';
import { signToken } from '../config/jwt.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { protect, AuthRequest } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().trim().email().max(200).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(128),
});

router.post(
  '/login',
  asyncHandler(async (req, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid email or password format', 400);
    }
    const { email, password } = parsed.data;

    const staff = await Staff.findOne({ email }).select('+passwordHash');
    if (staff) {
      if (staff.status !== 'active' || !(await staff.comparePassword(password))) {
        throw new AppError('Invalid email or password', 401);
      }

      const token = signToken({
        userId: String(staff._id),
        role: 'staff',
        staffRole: normalizeStaffRole(staff.role),
      });

      res.json({
        success: true,
        token,
        user: {
          id: staff._id,
          name: staff.name,
          email: staff.email,
          role: 'staff',
          staffRole: normalizeStaffRole(staff.role),
          employeeId: staff.employeeId,
        },
      });
      return;
    }

    // Generic error message for both "user not found" and "wrong password" —
    // prevents attackers from discovering which admin emails exist.
    const user = await User.findOne({ email, isActive: true }).select('+passwordHash');
    if (!user) throw new AppError('Invalid email or password', 401);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new AppError('Invalid email or password', 401);

    const token = signToken({ userId: String(user._id), role: user.role });

    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  })
);

router.get(
  '/me',
  protect,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role === 'staff' && req.user!.staffRole) {
      const staff = await Staff.findById(req.user!.userId);
      if (!staff || staff.status !== 'active') {
        throw new AppError('User not found', 404);
      }
      res.json({
        success: true,
        user: {
          id: staff._id,
          name: staff.name,
          email: staff.email,
          role: 'staff',
          staffRole: normalizeStaffRole(staff.role),
          employeeId: staff.employeeId,
        },
      });
      return;
    }

    const user = await User.findById(req.user!.userId);
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  })
);

export default router;
