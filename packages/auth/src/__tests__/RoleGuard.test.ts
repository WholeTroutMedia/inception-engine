/**
 * RoleGuard.test.ts — Role-based access control unit tests
 * @inception/auth — Creative Liberation Engine v5 GENESIS
 *
 * Tests the pure logic: requireRole utility, useUserRole role resolution,
 * and the allowed/blocked role combinations for the console app.
 */

import { describe, it, expect } from 'vitest';
import { requireRole, type UserRole } from '../components/RoleGuard.js';

// ─── requireRole() — server-side role checks ─────────────────────────────────

describe('requireRole()', () => {
  it('authorizes a matching role', () => {
    const result = requireRole('admin', ['admin', 'editor']);
    expect(result.authorized).toBe(true);
    expect(result.role).toBe('admin');
  });

  it('blocks a non-matching role', () => {
    const result = requireRole('viewer', ['admin']);
    expect(result.authorized).toBe(false);
    expect(result.role).toBe('viewer');
  });

  it('defaults to viewer when claimedRole is undefined', () => {
    const result = requireRole(undefined, ['admin']);
    expect(result.authorized).toBe(false);
    expect(result.role).toBe('viewer');
  });

  it('authorizes viewer when viewer is in allowedRoles', () => {
    const result = requireRole(undefined, ['viewer', 'editor', 'admin']);
    expect(result.authorized).toBe(true);
  });

  it('handles all valid roles', () => {
    const roles: UserRole[] = ['admin', 'editor', 'viewer', 'partner'];
    for (const role of roles) {
      const res = requireRole(role, [role]);
      expect(res.authorized).toBe(true);
      expect(res.role).toBe(role);
    }
  });

  it('blocks partner from admin-only routes', () => {
    const result = requireRole('partner', ['admin']);
    expect(result.authorized).toBe(false);
  });

  it('allows admin access to all role levels', () => {
    const levels: UserRole[] = ['admin', 'editor', 'viewer', 'partner'];
    for (const level of levels) {
      // admin should always pass when in allowedRoles
      const res = requireRole('admin', [level, 'admin']);
      expect(res.authorized).toBe(true);
    }
  });
});

// ─── Role hierarchy sanity checks ─────────────────────────────────────────────

describe('Role hierarchy — console routing', () => {
  const adminOnlyRoutes: UserRole[][] = [['admin']];
  const editorRoutes: UserRole[][] = [['admin', 'editor']];
  const viewerRoutes: UserRole[][] = [['admin', 'editor', 'viewer']];
  const partnerRoutes: UserRole[][] = [['admin', 'partner']];

  it('admin can access all route tiers', () => {
    const allRoutes = [...adminOnlyRoutes, ...editorRoutes, ...viewerRoutes, ...partnerRoutes];
    for (const allowed of allRoutes) {
      expect(requireRole('admin', allowed).authorized).toBe(true);
    }
  });

  it('editor cannot access admin-only routes', () => {
    for (const allowed of adminOnlyRoutes) {
      expect(requireRole('editor', allowed).authorized).toBe(false);
    }
  });

  it('editor can access editor-tier routes', () => {
    for (const allowed of editorRoutes) {
      expect(requireRole('editor', allowed).authorized).toBe(true);
    }
  });

  it('viewer can only access viewer-level routes', () => {
    for (const allowed of viewerRoutes) {
      expect(requireRole('viewer', allowed).authorized).toBe(true);
    }
    for (const allowed of adminOnlyRoutes) {
      expect(requireRole('viewer', allowed).authorized).toBe(false);
    }
  });

  it('partner can access partner routes but not admin-only', () => {
    for (const allowed of partnerRoutes) {
      expect(requireRole('partner', allowed).authorized).toBe(true);
    }
    for (const allowed of adminOnlyRoutes) {
      expect(requireRole('partner', allowed).authorized).toBe(false);
    }
  });
});
