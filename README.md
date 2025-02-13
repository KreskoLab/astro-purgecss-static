# Astro Purgecss Static

[![version][version-badge]][npm]
[![downloads][downloads-badge]][npm]

This plugin helps you to remove unused css rules from Astro bundle in static mode. Inspired by [Astro PurgeCSS](https://github.com/codiume/orbit/tree/main/packages/astro-purgecss) integration.


### ⚠️ Only works with Astro static output mode!



## 📦 Installation

First, install the `purgecss` & `astro-purgecss-static` packages using your package manager.

Using PNPM

```bash
pnpm install purgecss astro-purgecss-static
```

Using NPM

```bash
npm install purgecss astro-purgecss-static
```

Using Yarn

```bash
yarn add purgecss astro-purgecss-static
```

Then, apply this integration to your `astro.config.mjs` file using the integrations property:

```js
import { AstroPurgeCssPlugin } from 'astro-purgecss-static';

export default {
  // ...
  integrations: [AstroPurgeCssPlugin()]
};
```


## 🥑 Usage

When you install this integration, things will be auto-wired for you. and all your generated css files should be purged from unused classes automagically.

However, there's one small caveat: By default, Astro inlines small CSS files as part of its [bundle control](https://docs.astro.build/en/guides/styling/#bundle-control). This means that the plugin won't be able to purge CSS rules from those inlined files. To prevent Astro from inlining CSS styles, you can set the `inlineStylesheets` option to `never` in your `astro.config.mjs` file:

```diff
export default defineConfig({
+  build: {
+    inlineStylesheets: 'never'
+  }
});
```

## ⚙️ Configuration

[PurgeCSS][purgecss] has a list of options that allow you to customize its behavior. And this Astro integration allow you to pass those options easily in your `astro.config.mjs` file:

```js
export default defineConfig({
  integrations: [
    purgecss({
      fontFace: true,
      keyframes: true,
      safelist: ['random', 'yep', 'button', /^nav-/],
      blocklist: ['usedClass', /^nav-/],
      content: [
        process.cwd() + '/src/**/*.{astro,vue}' // Watching astro and vue sources (read SSR docs below)
      ],
      extractors: [
        {
          // Example using a tailwindcss compatible class extractor
          extractor: (content) =>
            content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [],
          extensions: ['astro', 'html']
        }
      ]
    })
  ]
});
```

### 📖 Available Options

Here is a list of options, that are allowed to be passed in the config:

```typescript
export type PurgeCSSOptions = {
  fontFace?: boolean; // removes any unused @font-face if set to true
  keyframes?: boolean; // removes unused keyframes by setting if set to true
  rejected?: boolean; // scan through the removed list to see if there's anything wrong
  rejectedCss?: boolean; // keeps the discarded CSS
  variables?: boolean; // removes any unused CSS variables if set to true
  safelist?: UserDefinedSafelist; // indicates which selectors are safe to leave in the final CSS
  blocklist?: StringRegExpArray; // blocks the CSS selectors from appearing in the final output CSS
  content?: Array<string | RawContent>;
  // provides custom functions to extract CSS classes in specific ways (eg. when using tailwind.css)
  extractors?: {
    extractor: (content: string) => string[]; // matched css classes
    extensions: string[]; // file extensions for which this extractor is to be used
  }[];
};
```

To learn more about the available options, please refer to [PurgeCSS][purgecss-options] official docs.

We have also setup an example repository available here: [example-purgecss](../../apps/example-purgecss)


### Important Notes

1. **CSS Retention**: Due to the integration's file scanning approach, some unused CSS might be retained. This is a deliberate trade-off to prevent accidentally removing dynamically used styles.

2. **Inline Styles vs External Stylesheets**: The integration can more accurately analyze and purge external stylesheets compared to inline styles embedded within components:
   - ✅ **Recommended**: Use external stylesheet files (`.css`)
   - ⚠️ **Less Effective**: Inline styles in component files

## ⚠️ Caveats

- Some options are not allowed to be passed in your `astro.config.mjs` config file, to not interfere with the internals of this integration.

- If you are using Astro view transitions, use the following options so that purgecss keeps the corresponding animations:

```js
export default defineConfig({
  integrations: [
    purgecss({
      keyframes: false,
      safelist: {
        greedy: [
          /*astro*/
        ]
      }
    })
  ]
});
```

- If you are using `tailwind.css`, please read about purge limitations in this guide [writing-purgeable-html](https://v2.tailwindcss.com/docs/optimizing-for-production#writing-purgeable-html). You may also need a custom class extractor compatible with arbitrary and container based `tailwind.css` classes. For example:

```js
export default defineConfig({
  integrations: [
    purgecss({
      extractors: [
        {
          extractor: (content) =>
            content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [],
          extensions: ['astro', 'html']
        }
      ]
    })
  ]
});
```


[npm]: https://npmjs.com/package/astro-purgecss
[purgecss]: https://purgecss.com
[purgecss-options]: https://purgecss.com/configuration.html#options

<!-- Readme Badges -->

[version-badge]: https://img.shields.io/npm/v/astro-purgecss-static.svg
[downloads-badge]: https://img.shields.io/npm/d18m/astro-purgecss-static.svg
