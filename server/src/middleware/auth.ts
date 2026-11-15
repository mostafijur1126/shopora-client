import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../config/jwt.js";
import { Staff, normalizeStaffRole } from "../models/Staff.js";
import { User } from "../models/User.js";
import {
  AdminPermission,
  roleHasPermission,
} from "../config/rolePermissions.js";
import { AppError } from "./errorHandler.js";
import type { ActivityActor } from "../utils/activityLog.js";

export interface AuthRequest extends Request {
  user?: JwtPayload;
  auditActor?: ActivityActor;
}

export const protect = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next(new AppError("Not authorized — no token provided", 401));
  }

  const token = header.split(" ")[1];
  let payload: JwtPayload;

  try {
    payload = verifyToken(token);
  } catch {
    return next(new AppError("Not authorized — invalid or expired token", 401));
  }

  if (payload.role === "staff") {
    if (payload.staffRole) {
      const staff = await Staff.findById(payload.userId).select(
        "status role name",
      );
      if (!staff || staff.status !== "active") {
        return next(
          new AppError("Staff account is inactive or no longer exists", 401),
        );
      }
      payload.staffRole = normalizeStaffRole(staff.role);
      req.auditActor = {
        id: String(staff._id),
        name: staff.name,
        role: payload.staffRole,
      };
    } else {
      const user = await User.findOne({
        _id: payload.userId,
        role: "staff",
        isActive: true,
      }).select("_id name");
      if (!user)
        return next(
          new AppError("Staff account is inactive or no longer exists", 401),
        );
      req.auditActor = {
        id: String(user._id),
        name: user.name,
        role: "Staff",
      };
    }
  } else if (payload.role === "admin") {
    const user = await User.findById(payload.userId).select("name");
    req.auditActor = {
      id: payload.userId,
      name: user?.name || "Admin",
      role: "Super Admin",
    };
  }

  req.user = payload;
  next();
};

export const optionalProtect = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization;

  //No token : continue as guest
  if (!header || !header.startsWith("Bearer ")) {
    return next();
  }

  //Token exists: validate it normally
  return protect(req, _res, next);
};

export const requirePermission =
  (permission: AdminPermission) =>
  (req: AuthRequest, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (
      user?.role === "admin" ||
      (user?.role === "staff" &&
        (!user.staffRole || roleHasPermission(user.staffRole, permission)))
    ) {
      return next();
    }
    return next(new AppError("Forbidden — insufficient permissions", 403));
  };

export const requireAdmin = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) => {
  if (req.user?.role !== "admin" && req.user?.role !== "staff") {
    return next(
      new AppError("Forbidden — admin or staff access required", 403),
    );
  }
  next();
};

export const requireSuperAdmin = (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) => {
  if (
    req.user?.role === "admin" ||
    (req.user?.role === "staff" && req.user.staffRole === "Super Admin")
  ) {
    return next();
  }
  return next(new AppError("Forbidden — Super Admin access required", 403));
};
