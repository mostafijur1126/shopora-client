import { Router, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { Customer } from '../models/Customer.js';
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

const adminCredentialsSchema = z
  .object({
    email: z
      .string()
      .trim()
      .email()
      .max(150)
      .transform((email) => email.toLowerCase())
      .optional(),
    password: z
      .string()
      .min(8)
      .max(72)
      .refine((password) => Buffer.byteLength(password, 'utf8') <= 72)
      .optional(),
  })
  .refine(
    (credentials) =>
      credentials.email !== undefined || credentials.password !== undefined,
  );

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 11000;

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

router.patch(
  '/admin-credentials',
  protect,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user?.role !== 'admin') {
      throw new AppError('Forbidden — admin access required', 403);
    }

    const parsed = adminCredentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError('Invalid admin credentials', 400);
    }

    const user = await User.findById(req.user.userId);
    if (!user || !user.isActive) {
      throw new AppError('Admin account is inactive or no longer exists', 401);
    }
    if (user.role !== 'admin') {
      throw new AppError('Forbidden — admin access required', 403);
    }

    const { email, password } = parsed.data;
    if (email && email !== user.email) {
      const [existingUser, existingStaff, existingCustomer] = await Promise.all([
        User.exists({ email, _id: { $ne: user._id } }),
        Staff.exists({ email }),
        Customer.exists({ email, isGuest: false }),
      ]);
      if (existingUser || existingStaff || existingCustomer) {
        throw new AppError('An account with this email already exists', 409);
      }
      user.email = email;
    }
    if (password) {
      user.passwordHash = await bcrypt.hash(password, 12);
    }

    try {
      await user.save();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new AppError('An account with this email already exists', 409);
      }
      throw error;
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
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
