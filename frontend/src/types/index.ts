export interface User {
  id: string;
  email: string;
  name: string;
  encrypted_vault_key: string;
  encrypted_private_key: string | null;
  public_key: string | null;
  kdf_iterations: number;
  kdf_memory: number;
  mfa_enabled: boolean;
  role: string;
  status: string;
  travel_mode_enabled?: boolean;
  avatar_url?: string | null;
  language_pref?: string;
  email_notifications?: boolean;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
  requires_mfa: boolean;
  mfa_session_token: string | null;
}

export interface Vault {
  id: string;
  owner_id: string;
  org_id: string | null;
  name_encrypted: string;
  description_encrypted?: string | null;
  icon?: string;
  safe_for_travel?: boolean;
  type: 'personal' | 'team' | 'shared';
  item_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Secret {
  id: string;
  vault_id: string;
  folder_id: string | null;
  type: SecretType;
  name_encrypted: string;
  data_encrypted: string;
  encrypted_item_key: string;
  metadata_encrypted: string | null;
  favorite: boolean;
  is_archived?: boolean;
  deleted_at?: string | null;
  access_count?: number;
  last_accessed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type SecretType =
  | 'password'
  | 'api_token'
  | 'secure_note'
  | 'ssh_key'
  | 'certificate'
  | 'encryption_key'
  | 'login'
  | 'credit_card'
  | 'identity'
  | 'document'
  | 'bank_account'
  | 'crypto_wallet'
  | 'database'
  | 'driver_license'
  | 'email_account'
  | 'medical_record'
  | 'membership'
  | 'outdoor_license'
  | 'passport'
  | 'rewards'
  | 'server'
  | 'social_security_number'
  | 'software_license'
  | 'wireless_router';

export interface DecryptedSecret {
  id: string;
  vault_id: string;
  folder_id: string | null;
  type: SecretType;
  name: string;
  data: SecretData;
  metadata: Record<string, unknown> | null;
  favorite: boolean;
  is_archived?: boolean;
  deleted_at?: string | null;
  tags?: Tag[];
  created_at: string;
  updated_at: string;
}

export interface SecretData {
  // Common
  username?: string;
  password?: string;
  url?: string;
  notes?: string;
  key?: string;
  certificate?: string;
  privateKey?: string;
  // Credit Card
  cardNumber?: string;
  cardholderName?: string;
  expiryDate?: string;
  cvv?: string;
  pin?: string;
  // Identity
  firstName?: string;
  lastName?: string;
  middleName?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  // Bank Account
  bankName?: string;
  accountNumber?: string;
  routingNumber?: string;
  accountType?: string;
  swiftCode?: string;
  ibanNumber?: string;
  // Passport
  passportNumber?: string;
  issuingCountry?: string;
  issueDate?: string;
  expirationDate?: string;
  // Server / Database
  hostname?: string;
  port?: string;
  databaseName?: string;
  // Software License
  licenseKey?: string;
  version?: string;
  // Wireless Router
  ssid?: string;
  encryptionType?: string;
  // Crypto Wallet
  walletAddress?: string;
  seedPhrase?: string;
  // Medical
  providerName?: string;
  policyNumber?: string;
  groupNumber?: string;
  // Membership
  membershipId?: string;
  // Driver License
  licenseNumber?: string;
  // Rewards
  rewardNumber?: string;
  // Social Security
  ssn?: string;
}

export interface Folder {
  id: string;
  vault_id: string;
  name_encrypted: string;
  parent_folder_id: string | null;
  created_at: string;
}

export interface DecryptedFolder {
  id: string;
  vault_id: string;
  name: string;
  parent_folder_id: string | null;
  created_at: string;
}

export interface Share {
  id: string;
  secret_id: string;
  shared_by: string;
  shared_with_user_id: string | null;
  shared_with_team_id: string | null;
  encrypted_item_key_for_recipient: string;
  permission: 'read' | 'write';
  expires_at: string | null;
  created_at: string;
}

export interface SharedSecret {
  share: Share;
  secret_id: string;
  secret_type: string;
  secret_name_encrypted: string;
  secret_data_encrypted: string;
}

export interface Team {
  id: string;
  org_id: string;
  name: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

export interface PasswordPolicy {
  id: string;
  org_id: string;
  min_length: number;
  require_uppercase: boolean;
  require_numbers: boolean;
  require_symbols: boolean;
  max_age_days: number;
  rotation_reminder_days: number;
}

export interface GeneratedPassword {
  password: string;
  strength_score: number;
  entropy_bits: number;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}
