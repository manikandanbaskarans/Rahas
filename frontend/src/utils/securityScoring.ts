import type { DecryptedSecret } from '@/types';
import { evaluatePasswordStrength } from './passwordStrength';

export interface SecurityScore {
  overall: number; // 0-100
  label: string;
  color: string;
  weakPasswords: SecurityIssue[];
  reusedPasswords: SecurityIssue[];
  unsecuredUrls: SecurityIssue[];
  oldPasswords: SecurityIssue[];
}

export interface SecurityIssue {
  secretId: string;
  secretName: string;
  detail: string;
}

/**
 * Calculate an overall security score from decrypted secrets.
 * 100% client-side - zero knowledge.
 */
export function calculateSecurityScore(secrets: DecryptedSecret[]): SecurityScore {
  const passwordSecrets = secrets.filter(
    (s) => s.data.password && ['password', 'login', 'api_token', 'server', 'database', 'email_account', 'wireless_router'].includes(s.type)
  );

  const weak = findWeakPasswords(passwordSecrets);
  const reused = findReusedPasswords(passwordSecrets);
  const unsecured = findUnsecuredUrls(secrets);
  const old = findOldPasswords(secrets);

  // Scoring: start at 100, deduct for issues
  let score = 100;
  const totalCheckable = Math.max(passwordSecrets.length, 1);

  // Deduct for weak passwords (up to 30 points)
  score -= Math.min(30, (weak.length / totalCheckable) * 30);

  // Deduct for reused passwords (up to 25 points)
  score -= Math.min(25, (reused.length / totalCheckable) * 25);

  // Deduct for unsecured URLs (up to 15 points)
  score -= Math.min(15, (unsecured.length / Math.max(secrets.length, 1)) * 15);

  // Deduct for old passwords (up to 20 points)
  score -= Math.min(20, (old.length / totalCheckable) * 20);

  // Bonus: if no items at all, score is neutral
  if (secrets.length === 0) score = 50;

  // Deduct 10 if fewer than 2 items (not enough to be meaningful)
  if (secrets.length > 0 && secrets.length < 3) score = Math.min(score, 80);

  score = Math.max(0, Math.min(100, Math.round(score)));

  let label: string;
  let color: string;
  if (score >= 90) { label = 'Excellent'; color = '#16a34a'; }
  else if (score >= 70) { label = 'Good'; color = '#22c55e'; }
  else if (score >= 50) { label = 'Fair'; color = '#eab308'; }
  else if (score >= 30) { label = 'Poor'; color = '#f97316'; }
  else { label = 'Critical'; color = '#ef4444'; }

  return {
    overall: score,
    label,
    color,
    weakPasswords: weak,
    reusedPasswords: reused,
    unsecuredUrls: unsecured,
    oldPasswords: old,
  };
}

export function findWeakPasswords(secrets: DecryptedSecret[]): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  for (const s of secrets) {
    if (!s.data.password) continue;
    const strength = evaluatePasswordStrength(s.data.password);
    if (strength.score <= 1) {
      issues.push({
        secretId: s.id,
        secretName: s.name,
        detail: `Password strength: ${strength.label}`,
      });
    }
  }
  return issues;
}

export function findReusedPasswords(secrets: DecryptedSecret[]): SecurityIssue[] {
  const passwordMap = new Map<string, DecryptedSecret[]>();

  for (const s of secrets) {
    if (!s.data.password) continue;
    const existing = passwordMap.get(s.data.password) || [];
    existing.push(s);
    passwordMap.set(s.data.password, existing);
  }

  const issues: SecurityIssue[] = [];
  for (const [, group] of passwordMap) {
    if (group.length > 1) {
      for (const s of group) {
        issues.push({
          secretId: s.id,
          secretName: s.name,
          detail: `Password reused across ${group.length} items`,
        });
      }
    }
  }
  return issues;
}

export function findUnsecuredUrls(secrets: DecryptedSecret[]): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  for (const s of secrets) {
    const url = s.data.url;
    if (!url) continue;
    if (url.startsWith('http://') && !url.includes('localhost') && !url.includes('127.0.0.1')) {
      issues.push({
        secretId: s.id,
        secretName: s.name,
        detail: 'URL uses HTTP instead of HTTPS',
      });
    }
  }
  return issues;
}

export function findOldPasswords(secrets: DecryptedSecret[]): SecurityIssue[] {
  const issues: SecurityIssue[] = [];
  const now = new Date();
  const ninetyDays = 90 * 24 * 60 * 60 * 1000;

  for (const s of secrets) {
    if (!s.data.password) continue;
    const updated = new Date(s.updated_at);
    if (now.getTime() - updated.getTime() > ninetyDays) {
      const days = Math.floor((now.getTime() - updated.getTime()) / (24 * 60 * 60 * 1000));
      issues.push({
        secretId: s.id,
        secretName: s.name,
        detail: `Password not updated for ${days} days`,
      });
    }
  }
  return issues;
}

/**
 * Check passwords against HIBP using k-anonymity.
 * Sends only the first 5 chars of the SHA-1 hash.
 */
export async function checkBreachedPasswords(
  secrets: DecryptedSecret[],
  checkBreachFn: (hashPrefix: string) => Promise<{ found: boolean; count: number }>
): Promise<SecurityIssue[]> {
  const issues: SecurityIssue[] = [];

  for (const s of secrets) {
    if (!s.data.password) continue;

    try {
      // Compute SHA-1 of the password
      const encoder = new TextEncoder();
      const data = encoder.encode(s.data.password);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();

      const prefix = hashHex.substring(0, 5);
      const result = await checkBreachFn(prefix);

      if (result.found) {
        issues.push({
          secretId: s.id,
          secretName: s.name,
          detail: `Password found in ${result.count.toLocaleString()} data breaches`,
        });
      }
    } catch {
      // Skip on error
    }
  }

  return issues;
}
