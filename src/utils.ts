import { normalize, join } from "pathe";
import { createHash } from "node:crypto";
import { writeFile, access, readFile, constants } from "node:fs/promises";
import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";

export const CACHE_DIR = normalize(
  process.cwd() + "/node_modules/.astro-purgecss-static/",
);

export async function createCacheDir() {
  const isExist = existsSync(CACHE_DIR);

  if (!isExist) {
    try {
      mkdirSync(CACHE_DIR);
    } catch (error) {
      console.error("createCacheDir", error);
    }
  }
}

export async function getCacheFile(fileName: string) {
  const path = join(CACHE_DIR, fileName);

  try {
    await access(path, constants.F_OK);
    return readFile(path, "utf-8");
  } catch (error) {
    return "";
  }
}

export async function writeCacheFile(fileName: string, content: string) {
  const path = join(CACHE_DIR, fileName);

  try {
    await writeFile(path, content);
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
