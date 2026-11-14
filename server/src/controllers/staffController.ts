import { randomBytes } from 'node:crypto';
import { Response } from 'express';
import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Customer } from '../models/Customer.js';
import { Staff, STAFF_ROLES, normalizeStaffRole } from '../models/Staff.js';
import { User } from '../models/User.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../middleware/errorHandler.js';
import { recordActivity } from '../utils/activityLog.js';

const passwordSchema = z
  .string()
  .min(8)
  .max(72)
  .refine((password) => Buffer.byteLength(password, 'utf8') <= 72);

const staffDetailsSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z
    .string()
    .trim()
    .email()
    .max(200)
    .transform((email) => email.toLowerCase()),
  phone: z.string().trim().min(1).max(30),
  status: z.enum(['active', 'inactive']),
  role: z.enum(STAFF_ROLES),
  joiningDate: z.coerce.date(),
  designation: z.string().trim().min(1).max(100),
  address: z.string().trim().min(1).max(500),
});

const createStaffSchema = staffDetailsSchema.extend({
  password: passwordSchema,
});

const updateStaffSchema = staffDetailsSchema
  .partial()
  .extend({ password: passwordSchema.optional() })
  .refine((details) => Object.keys(details).length > 0);

const serializeStaff = (staff: InstanceType<typeof Staff>) => ({
  id: String(staff._id),
  name: staff.name,
  email: staff.email,
  phone: staff.phone,
  status: staff.status,
  role: normalizeStaffRole(staff.role),
  joiningDate: staff.joiningDate,
  designation: staff.designation,
  address: staff.address,
  employeeId: staff.employeeId,
  createdAt: staff.createdAt,
  updatedAt: staff.updatedAt,
});

const isDuplicateKeyError = (
  error: unknown,
): error is { code: number; keyPattern?: Record<string, number> } =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === 11000;

const ensureEmailAvailable = async (email: string, staffId?: string) => {
  const [staff, user, customer] = await Promise.all([
    Staff.exists({ email, ...(staffId ? { _id: { $ne: staffId } } : {}) }),
    User.exists({ email }),
    Customer.exists({ email, isGuest: false }),
  ]);
  if (staff || user || customer) {
    throw new AppError('An account with this email already exists', 409);
  }
};

const generateEmployeeId = () =>
  `STF-${randomBytes(5).toString('hex').toUpperCase()}`;

const parseStaffId = (id: string | string[]) => {
  if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid staff ID', 400);
  }
  return id;
};

export const listStaff = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const staff = await Staff.find().sort({ createdAt: -1 });
  res.json({ success: true, staff: staff.map(serializeStaff) });
});

export const createStaff = asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = createStaffSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError('Invalid staff details', 400);

  const { password, ...details } = parsed.data;
  await ensureEmailAvailable(details.email);
  const passwordHash = await bcrypt.hash(password, 12);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const staff = await Staff.create({
        ...details,
        passwordHash,
        employeeId: generateEmployeeId(),
      });
      await recordActivity(req, {
        actionType: 'create',
        module: 'staff',
        description: `Created staff account for "${staff.name}".`,
        targetId: String(staff._id),
        targetName: staff.name,
        newValues: {
          role: normalizeStaffRole(staff.role),
          status: staff.status,
          designation: staff.designation,
        },
      });
      res.status(201).json({ success: true, staff: serializeStaff(staff) });
      return;
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        if (error.keyPattern?.employeeId && attempt < 4) continue;
        throw new AppError('An account with this email already exists', 409);
      }
      throw error;
    }
  }

  throw new AppError('Could not generate a unique employee ID', 500);
});

export const updateStaff = asyncHandler(async (req: AuthRequest, res: Response) => {
  const parsed = updateStaffSchema.safeParse(req.body);
  if (!parsed.success) throw new AppError('Invalid staff details', 400);
  const staffId = parseStaffId(req.params.id);

  const staff = await Staff.findById(staffId).select('+passwordHash');
  if (!staff) throw new AppError('Staff member not found', 404);

  const { password, email, ...details } = parsed.data;
  const previousValues = {
    role: normalizeStaffRole(staff.role),
    status: staff.status,
    designation: staff.designation,
  };
  if (email && email !== staff.email) await ensureEmailAvailable(email, String(staff._id));

  Object.assign(staff, details);
  staff.role = normalizeStaffRole(staff.role);
  if (email) staff.email = email;
  if (password) staff.passwordHash = await bcrypt.hash(password, 12);

  try {
    await staff.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError('An account with this email already exists', 409);
    }
    throw error;
  }

  await recordActivity(req, {
    actionType: 'update',
    module: 'staff',
    description: `Updated staff account for "${staff.name}".`,
    targetId: String(staff._id),
    targetName: staff.name,
    previousValues,
    newValues: {
      role: normalizeStaffRole(staff.role),
      status: staff.status,
      designation: staff.designation,
    },
  });
  res.json({ success: true, staff: serializeStaff(staff) });
});

export const deleteStaff = asyncHandler(async (req: AuthRequest, res: Response) => {
  const staffId = parseStaffId(req.params.id);
  const staff = await Staff.findByIdAndDelete(staffId);
  if (!staff) throw new AppError('Staff member not found', 404);
  await recordActivity(req, {
    actionType: 'delete',
    module: 'staff',
    description: `Deleted staff account for "${staff.name}".`,
    targetId: String(staff._id),
    targetName: staff.name,
    previousValues: {
      role: normalizeStaffRole(staff.role),
      status: staff.status,
      designation: staff.designation,
    },
  });
  res.json({ success: true, message: 'Staff member deleted' });
});
