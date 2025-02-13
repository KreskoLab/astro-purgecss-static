import { glob } from "glob";
import type { Plugin } from "vite";
import type { PluginContext } from "rollup";
import { normalize, basename } from "pathe";
import { fileURLToPath, type URL } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";
import type {
  AstroConfig,
  AstroIntegration,
  IntegrationResolvedRoute,
} from "astro";
import { PurgeCSS, type ResultPurge, type UserDefinedOptions } from "purgecss";
import {
  writeCssFile,
  getFilesHash,
  getCacheFile,
  writeCacheFile,
  createCacheDir,
} from "./utils";

interface Task {
  distUrl: string;
  imports: string[];
  purge?: () => Promise<ResultPurge[]>;
}

interface Cache {
  css: string;
  file: string;
  purgedFile: string;
}

function filterModules(modules: readonly string[]): string[] {
  return modules
    .filter((item) => !/\.(jpe?g|png|webp|svg|gif|avif)/.test(item))
    .filter(
      (item) => item.includes(process.cwd()) && !item.includes("node_modules"),
    );
}

const pageMap: Map<string, string[]> = new Map();

function VitePurgeCssPlugin(): Plugin {
  return {
    name: "vite-astro-purgecss-static",

    moduleParsed(moduleInfo) {
      const isPage = Object.keys(
        moduleInfo.meta.astro?.pageOptions || {},
      ).length;

      if (isPage) {
        const absolutePath = process.cwd() + "/";
        const key = normalize(moduleInfo.id.replace(absolutePath, ""));
        const filteredModules = filterModules(moduleInfo.importedIds);
        const cleanedModules = filteredModules.map(
          (filteredModule) => filteredModule.split("?")[0],
        );
        pageMap.set(key, [...cleanedModules, moduleInfo.id]);
      }
    },

    generateBundle() {
      function parseChildImports(
        this: any,
        importId: string,
        pageKey: string,
      ): any {
        const self = this as PluginContext;
        const moduleInfo = self.getModuleInfo(importId);

        if (moduleInfo) {
          const imports = [
            ...moduleInfo.importedIds,
            ...moduleInfo.dynamicallyImportedIds,
          ];
          const filteredModules = filterModules(imports);
          const cleanedModules = filteredModules.map(
            (filteredModule) => filteredModule.split("?")[0],
          );

          pageMap.get(pageKey)?.push(...cleanedModules);

          filteredModules.forEach((filteredModule) => {
            parseChildImports.bind(self)(filteredModule, pageKey);
          });
        }
      }

      pageMap.forEach((pageData, pageKey) => {
        pageData.forEach((pageImports) => {
          parseChildImports.bind(this)(pageImports, pageKey);
          pageMap.set(pageKey, [...new Set(pageMap.get(pageKey))]);
        });
      });
    },
  };
}

export interface PurgeCSSOptions extends Partial<UserDefinedOptions> {}

export function AstroPurgeCssPlugin(
  options: PurgeCSSOptions = {},
): AstroIntegration {
  type IntegrationResolvedRouteExtenteded = IntegrationResolvedRoute & {
    distURL: URL[];
  };
  let resolvedRoutes: IntegrationResolvedRouteExtenteded[] = [];
  let astroConfig = {} as AstroConfig;

  return {
    name: "astro-purgecss-static",

    hooks: {
      "astro:build:setup": ({ updateConfig }) => {
        updateConfig({
          plugins: [(VitePurgeCssPlugin as any)()],
        });
      },

      "astro:config:done": ({ config }) => {
        astroConfig = config;
      },

      "astro:routes:resolved": ({ routes }) => {
        resolvedRoutes = routes as IntegrationResolvedRouteExtenteded[];
      },

      "astro:build:done": async ({ dir, assets, logger }) => {
        const isStatic = astroConfig.output === "static";

        if (!isStatic) {
          logger.warn(`Output mode isn't static, skipped`);
          return;
        }

        const outDir = normalize(fileURLToPath(dir));

        for (const resolvedRoute of resolvedRoutes) {
          const distURL = assets.get(resolvedRoute.pattern);

          if (distURL) {
            Object.assign(resolvedRoute, { distURL });
          }
        }

        const dynamicIndexRoutes = resolvedRoutes.filter(
          (route) => !route.pathname && route.segments.length === 1,
        );

        dynamicIndexRoutes.forEach((dynamicIndexRoute) => {
          resolvedRoutes.splice(resolvedRoutes.indexOf(dynamicIndexRoute), 1);
        });

        const tasks: Task[] = [];

        resolvedRoutes.forEach((route) => {
          route.distURL.forEach((distURL) => {
            const task: Task = {
              distUrl: distURL.pathname,
              imports: pageMap.get(route.entrypoint) || [],
            };

            tasks.push(task);
          });
        });

        dynamicIndexRoutes.forEach((dynamicIndexRoute) => {
          dynamicIndexRoute.distURL.forEach((distURL) => {
            const task: Task = {
              distUrl: distURL.pathname,
              imports: pageMap.get(dynamicIndexRoute.entrypoint) || [],
            };

            tasks.push(task);
          });
        });

        logger.info(`Purge started for ${tasks.length} pages`);

        const cssDir = normalize(outDir + "/" + astroConfig.build.assets);
        const cssFiles = await glob(`${cssDir}/**/*.css`);

        tasks.forEach((task) => {
          task.purge = () =>
            new PurgeCSS().purge({
              css: cssFiles,
              defaultExtractor: (content) =>
                content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [],
              ...options,
              content: [
                ...task.imports,
                ...(options.content || []),
                {
                  extension: "html",
                  raw: readFileSync(task.distUrl, "utf-8"),
                },
              ],
            });
        });

        createCacheDir();
        const purgeContent = await glob(
          options.content?.filter((item) => typeof item === "string") || [],
        );

        await Promise.all(
          tasks.map(async (task) => {
            logger.info(`generating purged css for ${task.distUrl}`);

            const files = [...task.imports, ...purgeContent];
            const cacheKey = getFilesHash(files) + ".json";
            const cacheData = await getCacheFile(cacheKey);
            const cache = JSON.parse(cacheData || "[]") as Cache[];

            let htmlFile = readFileSync(task.distUrl, "utf-8");

            if (!cache.length) {
              const purgedCache: Cache[] = [];
              const purged = (await task.purge?.()) || [];

              purged
                .filter(({ file }) => file?.endsWith(".css"))
                .forEach((purged) => {
                  const newCssFile = writeCssFile(
                    purged.css,
                    purged.file as string,
                  );

                  const purgedFileName = basename(purged.file as string);
                  const newCssFileName = basename(newCssFile);

                  purgedCache.push({
                    css: purged.css,
                    purgedFile: purgedFileName,
                    file: purged.file?.replace(
                      purgedFileName,
                      newCssFileName,
                    ) as string,
                  });

                  htmlFile = htmlFile.replace(purgedFileName, newCssFileName);
                });

              writeCacheFile(cacheKey, JSON.stringify(purgedCache));
              writeFileSync(task.distUrl, htmlFile);
            } else {
              cache.forEach(({ css, file, purgedFile }) => {
                writeFileSync(file, css);
                const newCssFileName = basename(file);
                htmlFile = htmlFile.replace(purgedFile, newCssFileName);
              });

              writeFileSync(task.distUrl, htmlFile);
            }
          }),
        );

        //cleanup original css files
        cssFiles.forEach((cssFile) => {
          writeFileSync(cssFile, "");
        });
      },
    },
  };
}
