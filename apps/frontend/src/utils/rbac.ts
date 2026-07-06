export const Permissions = {
  READ: 1 << 0,
  WRITE: 1 << 1,
  DELETE: 1 << 2,
  EXPORT: 1 << 3,
  IMPORT: 1 << 4,
  ADMIN: 1 << 5,
} as const;

export type PermissionKey = keyof typeof Permissions;

export const Roles = {
  GUEST: Permissions.READ,
  EDITOR: Permissions.READ | Permissions.WRITE,
  MODERATOR: Permissions.READ | Permissions.WRITE | Permissions.DELETE,
  ADMIN: Permissions.READ | Permissions.WRITE | Permissions.DELETE | Permissions.ADMIN,
  SUPER: Object.values(Permissions).reduce((a, b) => a | b, 0),
} as const;

export type RoleKey = keyof typeof Roles;

export function hasPermission(code: number, permission: number): boolean {
  return (code & permission) === permission;
}

export function addPermission(code: number, permission: number): number {
  return code | permission;
}

export function removePermission(code: number, permission: number): number {
  return code & ~permission;
}

export function getRoleName(code: number): string {
  const entry = Object.entries(Roles).find(([, v]) => v === code);
  return entry ? entry[0] : 'CUSTOM';
}

export function getPermissionsFromCode(code: number): PermissionKey[] {
  return (Object.entries(Permissions) as [PermissionKey, number][])
    .filter(([, v]) => hasPermission(code, v))
    .map(([k]) => k);
}
