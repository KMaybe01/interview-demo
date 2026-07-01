import { describe, expect, it } from 'vitest';
import {
  addPermission,
  getPermissionsFromCode,
  getRoleName,
  hasPermission,
  Permissions,
  Roles,
  removePermission,
} from '../rbac.ts';

describe('rbac', () => {
  describe('hasPermission', () => {
    it('returns true when permission is present', () => {
      expect(hasPermission(Roles.ADMIN, Permissions.READ)).toBe(true);
      expect(hasPermission(Roles.ADMIN, Permissions.WRITE)).toBe(true);
      expect(hasPermission(Roles.ADMIN, Permissions.ADMIN)).toBe(true);
    });

    it('returns false when permission is absent', () => {
      expect(hasPermission(Roles.GUEST, Permissions.WRITE)).toBe(false);
      expect(hasPermission(Roles.GUEST, Permissions.DELETE)).toBe(false);
    });
  });

  describe('addPermission', () => {
    it('adds a new permission', () => {
      const code = addPermission(Roles.GUEST, Permissions.WRITE);
      expect(hasPermission(code, Permissions.WRITE)).toBe(true);
    });

    it('is idempotent', () => {
      const code = addPermission(Roles.GUEST, Permissions.READ);
      expect(code).toBe(Roles.GUEST);
    });
  });

  describe('removePermission', () => {
    it('removes a permission', () => {
      const code = removePermission(Roles.EDITOR, Permissions.WRITE);
      expect(hasPermission(code, Permissions.WRITE)).toBe(false);
      expect(hasPermission(code, Permissions.READ)).toBe(true);
    });

    it('does not affect other permissions', () => {
      const code = removePermission(Roles.ADMIN, Permissions.EXPORT);
      expect(hasPermission(code, Permissions.READ)).toBe(true);
      expect(hasPermission(code, Permissions.ADMIN)).toBe(true);
    });
  });

  describe('getRoleName', () => {
    it('returns role name for known roles', () => {
      expect(getRoleName(Roles.GUEST)).toBe('GUEST');
      expect(getRoleName(Roles.EDITOR)).toBe('EDITOR');
      expect(getRoleName(Roles.ADMIN)).toBe('ADMIN');
      expect(getRoleName(Roles.SUPER)).toBe('SUPER');
    });

    it('returns CUSTOM for unknown code', () => {
      expect(getRoleName(0)).toBe('CUSTOM');
      expect(getRoleName(999)).toBe('CUSTOM');
    });
  });

  describe('getPermissionsFromCode', () => {
    it('lists all permissions in a role', () => {
      expect(getPermissionsFromCode(Roles.GUEST)).toEqual(['READ']);
      expect(getPermissionsFromCode(Roles.EDITOR)).toEqual(['READ', 'WRITE']);
    });

    it('returns all permission keys for SUPER role', () => {
      const perms = getPermissionsFromCode(Roles.SUPER);
      expect(perms).toContain('READ');
      expect(perms).toContain('WRITE');
      expect(perms).toContain('DELETE');
      expect(perms).toContain('EXPORT');
      expect(perms).toContain('IMPORT');
      expect(perms).toContain('ADMIN');
    });

    it('returns empty array for zero code', () => {
      expect(getPermissionsFromCode(0)).toEqual([]);
    });
  });
});
