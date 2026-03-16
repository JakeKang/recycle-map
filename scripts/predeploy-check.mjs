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

  if (allowDevHeader !== "false") {
    fail(".env.production: ALLOW_DEV_USER_HEADER는 false여야 합니다.");
  }
  if (allowDbFallback !== "false") {
    fail(".env.production: ALLOW_DB_FALLBACK_ON_ERROR는 false여야 합니다.");
  }
  if (forceLocalStore !== "false") {
    fail(".env.production: FORCE_LOCAL_STORE는 false여야 합니다.");
  }

  const enableTestAccounts = envMap.get("ENABLE_TEST_ACCOUNTS") ?? "false";
  if (enableTestAccounts === "true") {
    const testPassword = envMap.get("TEST_ACCOUNT_PASSWORD") ?? "";
    if (testPassword.length < 12) {
      fail(".env.production: ENABLE_TEST_ACCOUNTS=true 인 경우 TEST_ACCOUNT_PASSWORD는 최소 12자 이상이어야 합니다.");
    } else {
      pass(".env.production: 테스트 계정 비밀번호 길이 정책 통과");
    }
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
