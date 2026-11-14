import jwt from 'jsonwebtoken';
import type { StaffRole } from '../models/Staff.js';

export interface JwtPayload {
  userId: string;
  role: 'admin' | 'staff' | 'customer';
  staffRole?: StaffRole;
}

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set in .env');
  return secret;
};

export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, getSecret(), {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, getSecret()) as JwtPayload;
};
