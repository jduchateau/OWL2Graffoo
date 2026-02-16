import { readFile, writeFile, copyFile } from "fs/promises";
import { $ } from "bun";

const APP_JS_PATH = "drawio/src/main/webapp/js/diagramly/App.js";

const MY_PRECONFIG = "drawio_patch/PreConfig.js"
const PRECONFIG_DEST = "drawio/src/main/webapp/js/PreConfig.js";

const PLUGIN_SOURCE = "dist/graffoo_plugin.js";
const PLUGIN_DEST = "drawio/src/main/webapp/plugins/graffoo.js";

async function patchAppJs() {
  console.log("📝 Reading App.js...");
  const content = await readFile(APP_JS_PATH, "utf-8");
  let modified = content;
  let changes = 0;

  // Check and add to pluginRegistry if not present
  if (!content.includes("'graffoo': 'plugins/graffoo.js'")) {
    console.log("➕ Adding graffoo to App.pluginRegistry...");

    const registryRegex = /(App\.pluginRegistry\s*=\s*{[^}]*)'tags':\s*'plugins\/tags\.js'/;
    if (registryRegex.test(modified)) {
      modified = modified.replace(
        registryRegex,
        "$1'tags': 'plugins/tags.js',\n\t'graffoo': 'plugins/graffoo.js'"
      );
      changes++;
    } else {
      console.warn("⚠️  Could not find tags entry in pluginRegistry to insert after");
    }
  } else {
    console.log("✓ graffoo already in App.pluginRegistry");
  }

  // Check and add to publicPlugin if not present
  if (!content.match(/App\.publicPlugin\s*=\s*\[[^\]]*'graffoo'/)) {
    console.log("➕ Adding graffoo to App.publicPlugin...");

    const publicPluginRegex = /(App\.publicPlugin\s*=\s*\[)\s*\n/;
    if (publicPluginRegex.test(modified)) {
      modified = modified.replace(
        publicPluginRegex,
        "$1\n\t'graffoo',\n"
      );
      changes++;
    } else {
      console.warn("⚠️  Could not find App.publicPlugin array");
    }
  } else {
    console.log("✓ graffoo already in App.publicPlugin");
  }

  if (changes > 0) {
    console.log(`💾 Writing changes to App.js (${changes} modification(s))...`);
    await writeFile(APP_JS_PATH, modified, "utf-8");
    console.log("✅ App.js patched successfully!");
  } else {
    console.log("✅ No changes needed - App.js already configured!");
  }
}

async function copyPreConfig() {
  console.log("🔧 Patching PreConfig.js...");
  await copyFile(MY_PRECONFIG, PRECONFIG_DEST);
  console.log(`✅ Copied ${MY_PRECONFIG} to ${PRECONFIG_DEST}`);
}

async function copyPlugin() {
  console.log("📦 Copying built plugin to plugins directory...");
  await copyFile(PLUGIN_SOURCE, PLUGIN_DEST);
  console.log(`✅ Copied ${PLUGIN_SOURCE} to ${PLUGIN_DEST}`);
}

async function rebuildApp() {
  console.log("🔧 Rebuilding app.min.js...");
  const antBuild = await $`cd drawio/etc/build && ant -f build.xml app`.quiet();
  if (antBuild.exitCode !== 0) {
    throw new Error("ant build failed");
  }
  console.log("✅ Rebuilt app.min.js successfully!");
}

async function changeSupportUrl() {
  console.log("🔧 Changing support URL...");
  const oldUrl = "https://github.com/jgraph/drawio/wiki/Getting-Support";
  const newUrl = "https://github.com/jduchateau/graffoo-import-drawio-plugin/issues";
  const filePath = "drawio/src/main/webapp/js/diagramly/Menus.js";

  const content = await readFile(filePath, "utf-8");
  const modified = content.replace(oldUrl, newUrl);
  await writeFile(filePath, modified, "utf-8");

  console.log("✅ Support URL changed successfully!");
}

async function patchVersion() {
  console.log("🔧 Patching version...");
  const versionFile = "drawio/VERSION";
  const versionContent = await readFile(versionFile, "utf-8");
  const trimmedVersion = versionContent.trim();
  const versionSuffix = "+graffoo";
  if (trimmedVersion.endsWith(versionSuffix)) {
    console.log(`✓ Version already ends with ${versionSuffix}`);
    return;
  }
  const modifiedVersion = trimmedVersion + versionSuffix;
  await writeFile(versionFile, modifiedVersion, "utf-8");
  console.log("✅ Version patched successfully!");
}

async function patchDrawio() {
  await Promise.allSettled([patchAppJs(), copyPreConfig(), copyPlugin(), changeSupportUrl(), patchVersion()]);
  await rebuildApp();
}

patchDrawio().catch(console.error);
