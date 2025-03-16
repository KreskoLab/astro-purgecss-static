import { join } from "pathe";
import { createHash } from "node:crypto";
import { access, readFile, constants } from "node:fs/promises";
import { writeFileSync, readFileSync } from "node:fs";

export async function getCacheFile(fileName: string, dir: string) {
  const path = join(dir, fileName);

  try {
    await access(path, constants.F_OK);
    return readFile(path, "utf-8");
  } catch (error) {
    return "";
  }
}

export function writeCacheFile(fileName: string, content: string, dir: string) {
  const path = join(dir, fileName);

  try {
    writeFileSync(path, content);
    return path;
  } catch (error) {
    console.error("writeCacheFile", error);
  }
}

export function getFilesHash(files: string[]): string {
  let content = "";

  files.forEach((file) => {
    content += readFileSync(file, "utf-8");
  });

  return createHash("sha256").update(content).digest("hex").substring(0, 8);
}

export function writeCssFile(css: string, file: string) {
  const hash = createHash("sha256").update(css).digest("hex").substring(0, 8);
  const newFile = `${file.slice(0, -13)}.${hash}.css`;
  writeFileSync(newFile, css);
  return newFile;
}
