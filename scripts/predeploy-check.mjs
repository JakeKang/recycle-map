import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();

const targetArg = process.argv.find((arg) => arg.startsWith("--target="));
const target = (targetArg?.split("=")[1] ?? "development").toLowerCase();

const validTargets = new Set(["development", "production", "all"]);
if (!validTargets.has(target)) {
  console.error(
    `[predeploy-check] 잘못된 target: ${target}. --target=development|production|all 중 하나를 사용하세요.`,
  );
  process.exit(1);
}

function getRequiredEnvFiles(checkTarget) {
  if (checkTarget === "development") {
    return [".env.development"];
  }

  if (checkTarget === "production") {
    return [".env.production"];
  }

  return [".env.development", ".env.production"];
}

const requiredEnvFiles = getRequiredEnvFiles(target);

const requiredKeys = [
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
];

const requiredMigrationFiles = [
  "supabase/migrations/20260309150000_init_schema.sql",
  "supabase/migrations/20260309151000_rls_policies.sql",
  "supabase/migrations/20260309162000_test_account_policies.sql",
  "supabase/migrations/20260309170000_delete_policies.sql",
  "supabase/migrations/20260831090000_point_verification_votes.sql",
  "supabase/migrations/20260901090000_security_hardening.sql",
];

function parseEnvFile(content) {
  const map = new Map();
  const lines = content.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex < 1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    map.set(key, value);
  }

  return map;
}

function isPlaceholderValue(value) {
  const lowered = value.toLowerCase();
  return (
    lowered.includes("replace") ||
    lowered.includes("changeme") ||
    lowered.includes("example") ||
    lowered === "your-secret" ||
    lowered === "test"
  );
}

function isStrongSecret(value) {
  return value.length >= 32;
}

function isValidEncryptionKeyRing(value) {
  const entries = value.split(",").filter(Boolean);
  const versions = entries.map((entry) => entry.slice(0, entry.indexOf(":")));
  return (
    entries.length > 0 &&
    new Set(versions).size === versions.length &&
    entries.every((entry) => {
      const separator = entry.indexOf(":");
      const version = entry.slice(0, separator);
      const encoded = entry.slice(separator + 1);
      return /^v[1-9][0-9]*$/.test(version) && Buffer.from(encoded, "base64").length === 32;
    })
  );
}

const errors = [];
const warnings = [];
const passes = [];

function pass(message) {
  passes.push(message);
}

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

const envByFile = new Map();

for (const envFile of requiredEnvFiles) {
  const envPath = path.join(rootDir, envFile);
  if (!fs.existsSync(envPath)) {
    fail(`${envFile} 파일이 없습니다.`);
    continue;
  }

  const content = fs.readFileSync(envPath, "utf-8");
  const envMap = parseEnvFile(content);
  envByFile.set(envFile, envMap);
  pass(`${envFile} 파일 확인 완료`);
}

for (const filePath of requiredMigrationFiles) {
  const absolutePath = path.join(rootDir, filePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`필수 migration 누락: ${filePath}`);
  } else {
    pass(`migration 확인: ${filePath}`);
  }
}

function validateCommon(fileName, envMap) {
  for (const key of requiredKeys) {
    const value = envMap.get(key);
    if (!value) {
      fail(`${fileName}: ${key} 값이 비어 있습니다.`);
      continue;
    }

    if (isPlaceholderValue(value)) {
      fail(`${fileName}: ${key} 값이 placeholder로 보입니다.`);
      continue;
    }

    pass(`${fileName}: ${key} 설정됨`);
  }
}

function validateDevelopment(envMap) {
  const allowDevHeader = envMap.get("ALLOW_DEV_USER_HEADER");
  const devHeaderSecret = envMap.get("DEV_USER_HEADER_SECRET") ?? "";

  if (allowDevHeader === "true" && devHeaderSecret.length === 0) {
    warn(".env.development: ALLOW_DEV_USER_HEADER=true 이지만 DEV_USER_HEADER_SECRET이 비어 있습니다.");
  }

  const forceLocalStore = envMap.get("FORCE_LOCAL_STORE");
  if (forceLocalStore !== "true") {
    warn(".env.development: FORCE_LOCAL_STORE=true 권장 (로컬 검증 일관성)");
    if (!(envMap.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")) {
      fail(".env.development: Supabase 사용 시 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.");
    }
    if (!isValidEncryptionKeyRing(envMap.get("DATA_ENCRYPTION_KEYS") ?? "")) {
      fail(".env.development: Supabase 사용 시 DATA_ENCRYPTION_KEYS가 필요합니다.");
    }
  }
}

function validateProduction(envMap) {
  const nextAuthUrl = envMap.get("NEXTAUTH_URL") ?? "";
  const nextAuthSecret = envMap.get("NEXTAUTH_SECRET") ?? "";

  if (!nextAuthUrl.startsWith("https://")) {
    fail(".env.production: NEXTAUTH_URL은 https:// 로 시작해야 합니다.");
  } else if (nextAuthUrl.includes("localhost")) {
    fail(".env.production: NEXTAUTH_URL에 localhost를 사용할 수 없습니다.");
  }

  if (!isStrongSecret(nextAuthSecret)) {
    fail(".env.production: NEXTAUTH_SECRET은 최소 32자 이상이어야 합니다.");
  } else {
    pass(".env.production: NEXTAUTH_SECRET 길이 정책 통과");
  }

  const allowDevHeader = envMap.get("ALLOW_DEV_USER_HEADER") ?? "false";
  const allowDbFallback = envMap.get("ALLOW_DB_FALLBACK_ON_ERROR") ?? "false";
  const forceLocalStore = envMap.get("FORCE_LOCAL_STORE") ?? "false";
  const serviceRoleKey = envMap.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseUrl = envMap.get("NEXT_PUBLIC_SUPABASE_URL") ?? "";
  const adminUserIds = (envMap.get("ADMIN_USER_IDS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const encryptionKeys = envMap.get("DATA_ENCRYPTION_KEYS") ?? "";
  const uploadStorageMode = envMap.get("UPLOAD_STORAGE_MODE") ?? "";
  const publicUploadStorageMode = envMap.get("NEXT_PUBLIC_UPLOAD_STORAGE_MODE") ?? "";
  const trustProxy = envMap.get("TRUST_PROXY") ?? "";

  if (allowDevHeader !== "false") {
    fail(".env.production: ALLOW_DEV_USER_HEADER는 false여야 합니다.");
  }
  if (allowDbFallback !== "false") {
    fail(".env.production: ALLOW_DB_FALLBACK_ON_ERROR는 false여야 합니다.");
  }
  if (forceLocalStore !== "false") {
    fail(".env.production: FORCE_LOCAL_STORE는 false여야 합니다.");
  }
  if (serviceRoleKey.length < 32 || isPlaceholderValue(serviceRoleKey)) {
    fail(".env.production: 서버 저장소 접근을 위한 SUPABASE_SERVICE_ROLE_KEY를 설정해야 합니다.");
  } else {
    pass(".env.production: SUPABASE_SERVICE_ROLE_KEY 설정됨");
  }

  try {
    const parsedSupabaseUrl = new URL(supabaseUrl);
    if (parsedSupabaseUrl.protocol !== "https:") {
      fail(".env.production: NEXT_PUBLIC_SUPABASE_URL은 HTTPS여야 합니다.");
    }
  } catch {
    fail(".env.production: NEXT_PUBLIC_SUPABASE_URL이 유효한 URL이 아닙니다.");
  }

  if (adminUserIds.length === 0) {
    fail(".env.production: ADMIN_USER_IDS를 명시적으로 설정해야 합니다.");
  } else if (adminUserIds.some((id) => ["admin", "admin-user", "test-admin", "test-owner"].includes(id))) {
    fail(".env.production: 기본/테스트 관리자 ID를 사용할 수 없습니다.");
  } else if (
    adminUserIds.some(
      (id) =>
        !/^(google|kakao|naver):[^:]+$/.test(id) &&
        !/^sha256:[0-9a-f]{64}$/.test(id),
    )
  ) {
    fail(".env.production: 관리자 ID는 provider:providerAccountId 형식이어야 합니다.");
  } else {
    pass(".env.production: 관리자 ID fail-closed 설정 통과");
  }

  if (!isValidEncryptionKeyRing(encryptionKeys)) {
    fail(".env.production: DATA_ENCRYPTION_KEYS에 버전이 지정된 32바이트 키가 필요합니다.");
  } else {
    pass(".env.production: 데이터 암호화 키 설정 통과");
  }

  if (uploadStorageMode !== "supabase" || publicUploadStorageMode !== "supabase") {
    fail(".env.production: 운영 업로드 저장소 모드는 서버/클라이언트 모두 supabase여야 합니다.");
  }
  if (trustProxy !== "true" && trustProxy !== "false") {
    fail(".env.production: TRUST_PROXY를 true 또는 false로 명시해야 합니다.");
  }

  const enableTestAccounts = envMap.get("ENABLE_TEST_ACCOUNTS") ?? "false";
  if (enableTestAccounts !== "false") {
    fail(".env.production: 테스트 계정은 반드시 비활성화해야 합니다.");
  }
}

const developmentEnv = envByFile.get(".env.development");
const productionEnv = envByFile.get(".env.production");

if (developmentEnv) {
  validateCommon(".env.development", developmentEnv);
  validateDevelopment(developmentEnv);
}

if (productionEnv) {
  validateCommon(".env.production", productionEnv);
  validateProduction(productionEnv);
}

console.log(`[predeploy-check] 결과 요약 (target=${target})`);
for (const item of passes) {
  console.log(`PASS: ${item}`);
}
for (const item of warnings) {
  console.log(`WARN: ${item}`);
}
for (const item of errors) {
  console.log(`FAIL: ${item}`);
}

if (errors.length > 0) {
  console.error(`[predeploy-check] 실패 ${errors.length}건`);
  process.exit(1);
}

console.log("[predeploy-check] 모든 필수 항목 통과");
