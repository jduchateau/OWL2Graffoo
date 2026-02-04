import { readFile, writeFile, copyFile } from "fs/promises";

const APP_JS_PATH = "drawio/src/main/webapp/js/diagramly/App.js";
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
    
    // Find the pluginRegistry object and add the entry
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
    
    // Find the publicPlugin array and add graffoo at the beginning
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

  // Copy plugin file
  console.log("📦 Copying built plugin to plugins directory...");
  await copyFile(PLUGIN_SOURCE, PLUGIN_DEST);
  console.log(`✅ Copied ${PLUGIN_SOURCE} to ${PLUGIN_DEST}`);
}

patchAppJs().catch(console.error);
