import { join } from "pathe";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { access, constants, readFile } from "node:fs/promises";
import {
  getCacheFile,
  getFilesHash,
  writeCacheFile,
  writeCssFile,
} from "./utils";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(() => Promise.resolve()),
  access: vi.fn(() => Promise.resolve()),
  constants: { F_OK: 0 },
}));

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

const CACHE_DIR = "test/";

describe("getCacheFile", async () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shoud return cache from file", async () => {
    const FILENAME = "test_file";
    const PATH = join(CACHE_DIR, FILENAME);
    await getCacheFile(FILENAME, CACHE_DIR);
    expect(access).toBeCalledWith(PATH, constants.F_OK);
    expect(readFile).toBeCalledWith(PATH, "utf-8");
  });

  it("shoud return empty string if cache file not exists", async () => {
    vi.mocked(access).mockRejectedValue(new Error(""));
    const FILENAME = "test_file_missed";
    const PATH = join(CACHE_DIR, FILENAME);
    await getCacheFile(FILENAME, CACHE_DIR);
    expect(access).toBeCalledWith(PATH, constants.F_OK);
    expect(readFile).not.toBeCalled();
  });
});

describe("writeCacheFile", async () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shoud write cache file", async () => {
    const FILENAME = "test_file";
    const DATA = "test_data";
    const PATH = join(CACHE_DIR, FILENAME);
    writeCacheFile(FILENAME, DATA, CACHE_DIR);
    expect(writeFileSync).toBeCalledWith(PATH, DATA);
  });
});

describe("getFilesHash", async () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shoud generate hash from files paths", async () => {
    const FILES = ["/a.css"];
    const res = getFilesHash(FILES);

    FILES.forEach((file) => {
      expect(readFileSync).toBeCalledWith(file, "utf-8");
    });

    const expectedHash = createHash("sha256")
      .update("undefined")
      .digest("hex")
      .substring(0, 8);

    expect(res).toBe(expectedHash);
  });
});

describe("writeCssFile", async () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const mockCss = "p { padding: 20px; }";
  const oldFilePath = "/_astro/file.old-hash.css";
  const newFilePath = "/_astro/file.2430a115.css";

  it("shoud write css file", () => {
    writeCssFile(mockCss, oldFilePath);
    expect(writeFileSync).toBeCalledWith(newFilePath, mockCss);
  });
});
