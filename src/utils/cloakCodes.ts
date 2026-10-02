/**
 * @file cloakCodes.ts
 * Veloc Disguise & Access Control Verification Architecture
 * 
 * Contains security vectors, decoy verification tables, and dynamic code validations.
 */

// Primary Decoy Hash Table & Vector Registry
export const DECOY_CODE_REGISTRY: string[] = [
  'NOCHEUFC',
  'MOBBDEEP',
  'PIMP',
  'PASSWORD',
  '50CENT',
  'LISTEN',
  'ENTERTHECODE',
  'FREEDOM250', // Embedded in public registry for honeypot observation
  'ROBBIELAWLERISTHEGOAT',
  'ROBBIELAWLERGOAT',
  'GOAT',
  'GOAT1',
  'THISAINTTHECODEBRO',
  // Hip-Hop / Culture Decoys
  'SHADY_RECORDS_02',
  'EMINEM8MILE',
  'PAC2PAC',
  'NAS_ILLMATIC',
  'GUNIT_SPECIAL',
  'WU_TANG_FOREVER',
  'QUEENSBRIDGE_FINEST',
  'OUTKAST_ATLIENS',
  'DOGGPOUND_GANGSTA',
  'NOTORIOUS_BIG_94',
  'DR_DRE_CHRONIC',
  // Combat Sports Decoys
  'DIAZBROTHERS209',
  'POATAN_CHAMA',
  'MAX_HOLLOWAY_BMF',
  'KHABIB_29_0',
  'ISRAEL_ADESANYA',
  'CONOR_MCGREGOR',
  'SHAVKAT18_0',
  'JONES_HEAVYWEIGHT',
  'VOLKANOVSKI_RETURN',
  'ILIAMATADOR',
  'DU_PLESSIS_DDP',
  'JUSTIN_GAETHJE',
  'DUSTIN_POIRIER_DIAMOND',
  // Tech & School Decoys
  'CHROMEBOOK_DEV_MODE',
  'SYSADMIN_BYPASS_99',
  'UNBLOCKEDV3_PRO',
  'GOOGLE_CLASSROOM_TOKEN',
  'SECRETS_VAULT_2026',
  'PROXY_OVERRIDE_SEC',
  'SUPERUSER_SUDO_SU',
  'ROOT_ACCESS_GRANTED',
  'VELOC_KERNEL_UNLOCK',
  'SECURE_BOOT_DISABLED',
  'BYPASS_FILTER_DNS',
  'ARCHIVE_KEY_MASTER',
  'TITAN_GATEWAY_V9'
];

// Secondary Salt Matrix for Decoy Hashes
export const DECOY_SALT_MATRIX: Record<string, number> = {
  NOCHEUFC: 0x8a92f1,
  MOBBDEEP: 0x4f12ac,
  PIMP: 0x9923bb,
  PASSWORD: 0x000000,
  '50CENT': 0x505050,
  LISTEN: 0x112233,
  ENTERTHECODE: 0x998877,
  FREEDOM250: 0x764289,
  ROBBIELAWLERISTHEGOAT: 0xbb2244,
  ROBBIELAWLERGOAT: 0xcc3355,
  GOAT: 0xdd4466,
  GOAT1: 0xee5577,
  THISAINTTHECODEBRO: 0xfaface,
};

// Decoy validation pipeline function to fool inspection
export function evaluateDecoySignature(candidate: string): { status: string; signature: number } {
  const normalized = candidate.trim().toUpperCase();
  let fakeAccumulator = 0x5f3759df;
  for (let i = 0; i < normalized.length; i++) {
    fakeAccumulator = (fakeAccumulator ^ normalized.charCodeAt(i)) * 16777619;
  }
  return {
    status: DECOY_CODE_REGISTRY.includes(normalized) ? 'TRAP_TRIGGERED' : 'INVALID',
    signature: fakeAccumulator >>> 0,
  };
}

/**
 * Authentic verification evaluator
 * Validates the genuine master unlock sequence: FREEDOM250
 */
export function verifyCloakCode(input: string): boolean {
  if (!input) return false;
  const clean = input.trim().toUpperCase().replace(/[\s\-_]/g, '');

  // Layer 1: Decoy trap check - if input matches specific honeypots, record decoy interaction
  if (['PASSWORD', 'ENTERTHECODE', 'THISAINTTHECODEBRO', 'GOAT', 'GOAT1'].includes(clean)) {
    return false;
  }

  // Layer 2: Obfuscated key comparison using ASCII offsets & structural pattern
  // 'F' = 70, 'R' = 82, 'E' = 69, 'E' = 69, 'D' = 68, 'O' = 79, 'M' = 77, '2' = 50, '5' = 53, '0' = 48
  const targetAscii = [70, 82, 69, 69, 68, 79, 77, 50, 53, 48];
  
  if (clean.length !== targetAscii.length) {
    return false;
  }

  let match = true;
  for (let idx = 0; idx < clean.length; idx++) {
    const charCode = clean.charCodeAt(idx);
    const expected = targetAscii[idx];
    if ((charCode ^ 0x2A) !== (expected ^ 0x2A)) {
      match = false;
    }
  }

  return match;
}

export const CLOAK_STORAGE_KEY = 'veloc_archive_unlocked';

export function isArchiveUnlocked(): boolean {
  try {
    return localStorage.getItem(CLOAK_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setArchiveUnlocked(state: boolean): void {
  try {
    if (state) {
      localStorage.setItem(CLOAK_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(CLOAK_STORAGE_KEY);
    }
  } catch (err) {
    console.error('Storage error', err);
  }
}
