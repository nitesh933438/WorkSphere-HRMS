export const ROLES = {
  ADMIN: "admin",
  HR: "hr",
  MANAGER: "manager",
  EMPLOYEE: "employee",
};

export const ROLE_LABELS = {
  [ROLES.ADMIN]: "Administrator",
  [ROLES.HR]: "HR",
  [ROLES.MANAGER]: "Manager",
  [ROLES.EMPLOYEE]: "Employee",
};

export const ALL_ROLES = Object.values(ROLES);

export const MANAGEMENT_ROLES = [
  ROLES.ADMIN,
  ROLES.HR,
  ROLES.MANAGER,
];

export const ADMIN_ROLES = [ROLES.ADMIN];
