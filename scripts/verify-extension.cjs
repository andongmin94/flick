const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const contentRoot = path.join(repoRoot, "content");
const manifestPath = path.join(contentRoot, "manifest.json");

const errors = [];

const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    errors.push(`Invalid JSON: ${path.relative(repoRoot, filePath)}`);
    return null;
  }
};

const assertFile = (relativePath, label) => {
  if (!relativePath || typeof relativePath !== "string") {
    errors.push(`${label} path is missing`);
    return;
  }

  const filePath = path.join(contentRoot, relativePath);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    errors.push(`${label} not found: ${path.relative(repoRoot, filePath)}`);
  }
};

const manifest = readJson(manifestPath);

if (manifest) {
  if (manifest.manifest_version !== 3) {
    errors.push("manifest_version must be 3");
  }

  if (!/^\d+(?:\.\d+){1,3}$/.test(String(manifest.version || ""))) {
    errors.push(`Invalid manifest version: ${manifest.version}`);
  }

  if (!Array.isArray(manifest.permissions)) {
    errors.push("permissions must be an array");
  }

  if (!Array.isArray(manifest.host_permissions)) {
    errors.push("host_permissions must be an array");
  }

  if (!Array.isArray(manifest.content_scripts)) {
    errors.push("content_scripts must be an array");
  } else {
    manifest.content_scripts.forEach((script, index) => {
      const prefix = `content_scripts[${index}]`;
      if (!Array.isArray(script.matches) || script.matches.length === 0) {
        errors.push(`${prefix}.matches must contain at least one pattern`);
      }
      (script.js || []).forEach((file) => assertFile(file, `${prefix}.js`));
      (script.css || []).forEach((file) => assertFile(file, `${prefix}.css`));
    });
  }

  Object.entries(manifest.icons || {}).forEach(([size, file]) => {
    assertFile(file, `icons.${size}`);
  });

  if (manifest.action?.default_popup) {
    assertFile(manifest.action.default_popup, "action.default_popup");
  }

  Object.entries(manifest.action?.default_icon || {}).forEach(([size, file]) => {
    assertFile(file, `action.default_icon.${size}`);
  });

  if (manifest.options_page) {
    assertFile(manifest.options_page, "options_page");
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("Extension manifest references verified.");
