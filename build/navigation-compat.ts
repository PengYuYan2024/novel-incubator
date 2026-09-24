import type { Plugin } from "vite";

// vinext beta.5 + Rolldown can bind the lazy namespace to a shared chunk's
// mangled exports. A static namespace keeps Link's navigation/prefetch exports
// in the bundler's symbol graph. Do not patch node_modules or emitted assets.
export function navigationCompat(): Plugin {
  return {
    name: "novel-navigation-compat",
    enforce: "pre",
    transform(code, id) {
      if (!id.replaceAll("\\", "/").endsWith("/vinext/dist/shims/link.js")) return;
      const lazyImport = 'import("./navigation.js")';
      if (!code.includes(lazyImport)) {
        this.error("vinext Link changed; review the navigation compatibility fix.");
      }
      const imports: string[] = [];
      const transformed = code.replace(/import\("(\.[^"]+)"\)/g, (_, source: string) => {
        const name = `novelLinkDependency${imports.length}`;
        imports.push(`import * as ${name} from ${JSON.stringify(source)};`);
        return `Promise.resolve(${name})`;
      });
      return {
        code: transformed.startsWith('"use client";')
          ? transformed.replace('"use client";', '"use client";\n' + imports.join("\n"))
          : imports.join("\n") + "\n" + transformed,
        map: null,
      };
    },
  };
}
