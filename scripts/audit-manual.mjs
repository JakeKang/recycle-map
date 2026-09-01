#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
const PLACEHOLDER_RE = /\b(?:TODO|TBD|FIXME)\b|\[placeholder\]|<insert[^>]*>/i;

function walk(directory, predicate) {
  const files = [];
  if (!existsSync(directory)) return files;
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path, predicate));
    else if (predicate(path)) files.push(path);
  }
  return files;
}

function cleanTarget(raw) {
  const unwrapped = raw.startsWith("<") && raw.endsWith(">") ? raw.slice(1, -1) : raw;
  const path = unwrapped.split("#", 1)[0].split("?", 1)[0];
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function pngSize(path) {
  if (extname(path).toLowerCase() !== ".png") return null;
  const buffer = readFileSync(path);
  if (
    buffer.length < 24 ||
    buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
  ) {
    return null;
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function auditManual(manualDirectory) {
  const root = resolve(manualDirectory);
  const failures = [];
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    return { result: "FAIL", failures: [`manual directory not found: ${root}`] };
  }

  const markdown = walk(root, (path) => extname(path).toLowerCase() === ".md");
  const images = walk(join(root, "images"), (path) =>
    IMAGE_EXTENSIONS.has(extname(path).toLowerCase()),
  );
  const referencedImages = new Set();
  let localLinks = 0;
  let imageReferences = 0;
  let emptyImageAlts = 0;

  if (!existsSync(join(root, "README.md"))) {
    failures.push("README.md is required as the manual index");
  }
  if (!markdown.some((path) => /^\d+\./.test(relative(root, path)))) {
    failures.push("at least one numbered manual document is required");
  }

  const linkRe = /(!?)\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  for (const document of markdown) {
    const content = readFileSync(document, "utf8");
    if (PLACEHOLDER_RE.test(content)) {
      failures.push(`${relative(root, document)} contains an unresolved placeholder`);
    }
    for (const match of content.matchAll(linkRe)) {
      const isImage = match[1] === "!";
      const alt = match[2].trim();
      const rawTarget = match[3];
      if (/^(?:[a-z]+:|#)/i.test(rawTarget)) continue;
      const target = cleanTarget(rawTarget);
      if (!target) continue;
      const absolute = resolve(dirname(document), target);
      localLinks += 1;
      if (!existsSync(absolute)) {
        failures.push(
          `${relative(root, document)} references missing ${isImage ? "image" : "file"}: ${rawTarget}`,
        );
        continue;
      }
      if (isImage) {
        imageReferences += 1;
        if (!alt) emptyImageAlts += 1;
        referencedImages.add(absolute);
      }
    }
  }

  if (emptyImageAlts > 0) {
    failures.push(`${emptyImageAlts} image reference(s) have empty alt text`);
  }
  const unusedImages = images.filter((path) => !referencedImages.has(resolve(path)));
  for (const path of unusedImages) {
    failures.push(`unused image: ${relative(root, path)}`);
  }
  for (const path of images) {
    const size = pngSize(path);
    if (size && (size.width < 320 || size.height < 320)) {
      failures.push(
        `possibly cropped PNG (${size.width}x${size.height}): ${relative(root, path)}`,
      );
    }
  }

  return {
    documents: markdown.length,
    localLinks,
    imageReferences,
    imageAssets: images.length,
    result: failures.length === 0 ? "PASS" : "FAIL",
    failures,
  };
}

const directory = process.argv[2];
if (!directory) {
  console.error("Usage: audit-manual.mjs <manual-directory>");
  process.exit(2);
}
const report = auditManual(directory);
console.log(
  `${report.result}: ${report.documents ?? 0} docs, ${report.imageAssets ?? 0} images, ${report.localLinks ?? 0} local links`,
);
for (const failure of report.failures) console.error(`- ${failure}`);
if (report.result !== "PASS") process.exit(1);
