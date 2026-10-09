const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "www");
const files = ["index.html", "support.html", "styles.css", "app.js", "manifest.webmanifest"];
const folders = ["assets"];
// Everything under assets/ is copied into both app bundles, folders and all,
// and nothing checks whether the app references it. Source material kept in
// there therefore ships: app-illustrations alone is 59MB of originals that no
// page loads. Named here so a working folder can live beside the assets that
// use it without riding along into the download.
const skipFolders = new Set(["app-illustrations", "source-art"]);

function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function copyFolder(source, destination) {
  fs.mkdirSync(destination, { recursive: true });

  for (const item of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, item.name);
    const destinationPath = path.join(destination, item.name);

    if (item.isDirectory()) {
      if (skipFolders.has(item.name)) continue;
      copyFolder(sourcePath, destinationPath);
    } else {
      copyFile(sourcePath, destinationPath);
    }
  }
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const file of files) {
  copyFile(path.join(root, file), path.join(outDir, file));
}

for (const folder of folders) {
  copyFolder(path.join(root, folder), path.join(outDir, folder));
}

console.log(`Built mobile web assets in ${outDir}`);
