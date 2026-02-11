import type { SecretData, SecretType } from '@/types';

export interface ParsedCSVRow {
  [key: string]: string;
}

export interface ParsedCSV {
  headers: string[];
  rows: ParsedCSVRow[];
}

export type ImportSource =
  | 'chrome'
  | 'firefox'
  | 'lastpass'
  | 'bitwarden'
  | '1password'
  | 'csv'
  | 'unknown';

/**
 * Parse a CSV string into headers + rows. All client-side — file never leaves the browser.
 */
export function parseCSV(content: string): ParsedCSV {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]);
  const rows: ParsedCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row: ParsedCSVRow = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  values.push(current.trim());
  return values;
}

/**
 * Detect the import source based on CSV headers.
 */
export function detectSource(headers: string[]): ImportSource {
  const headerSet = new Set(headers.map((h) => h.toLowerCase()));

  // Chrome: name, url, username, password
  if (headerSet.has('name') && headerSet.has('url') && headerSet.has('username') && headerSet.has('password')) {
    return 'chrome';
  }

  // Firefox: url, username, password, httpRealm, formActionOrigin
  if (headerSet.has('url') && headerSet.has('httprealm')) {
    return 'firefox';
  }

  // LastPass: url, username, password, totp, extra, name, grouping, fav
  if (headerSet.has('grouping') && headerSet.has('extra')) {
    return 'lastpass';
  }

  // Bitwarden: folder, favorite, type, name, login_uri, login_username, login_password
  if (headerSet.has('login_uri') || headerSet.has('login_username')) {
    return 'bitwarden';
  }

  // 1Password: Title, Website, Username, Password
  if (headerSet.has('title') && headerSet.has('website')) {
    return '1password';
  }

  // Generic CSV with at least url/username/password
  if (headerSet.has('password') || headerSet.has('username')) {
    return 'csv';
  }

  return 'unknown';
}

/** Column mapping from source CSV header to our SecretData field */
export interface ColumnMapping {
  [csvHeader: string]: keyof SecretData | 'name' | 'skip';
}

/**
 * Get default column mappings based on detected source.
 */
export function getDefaultMapping(_source: ImportSource, headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};

  const knownMappings: Record<string, keyof SecretData | 'name' | 'skip'> = {
    // Common
    name: 'name',
    title: 'name',
    // URL
    url: 'url',
    website: 'url',
    login_uri: 'url',
    // Username
    username: 'username',
    login_username: 'username',
    user: 'username',
    email: 'username',
    // Password
    password: 'password',
    login_password: 'password',
    // Notes
    notes: 'notes',
    extra: 'notes',
    // Skip known non-data columns
    grouping: 'skip',
    fav: 'skip',
    favorite: 'skip',
    folder: 'skip',
    httprealm: 'skip',
    formactionorigin: 'skip',
    timecreated: 'skip',
    timelastused: 'skip',
    timepasswordchanged: 'skip',
    type: 'skip',
    login_totp: 'skip',
    totp: 'skip',
  };

  for (const header of headers) {
    const lower = header.toLowerCase();
    mapping[header] = knownMappings[lower] ?? 'skip';
  }

  return mapping;
}

/**
 * Map a parsed CSV row to SecretData using the column mapping.
 */
export function mapRowToSecretData(
  row: ParsedCSVRow,
  mapping: ColumnMapping,
): { name: string; data: SecretData; type: SecretType } {
  let name = '';
  const data: SecretData = {};

  for (const [csvHeader, field] of Object.entries(mapping)) {
    const value = row[csvHeader];
    if (!value || field === 'skip') continue;

    if (field === 'name') {
      name = value;
    } else {
      (data as Record<string, string>)[field] = value;
    }
  }

  // Fallback name
  if (!name) {
    name = data.url || data.username || 'Imported Item';
  }

  // Determine type
  let type: SecretType = 'login';
  if (data.notes && !data.password && !data.username) {
    type = 'secure_note';
  }

  return { name, data, type };
}
