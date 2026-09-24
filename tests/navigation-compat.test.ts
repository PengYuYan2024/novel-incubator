// @vitest-environment node
import { expect, test } from "vitest";
import { rolldown } from "rolldown";
import { navigationCompat } from "../build/navigation-compat";

test("Link dependency namespaces retain callable navigation and prefetch exports after bundling", async () => {
  const entry = "/vinext/dist/shims/link.js";
  const build = await rolldown({
    input: entry,
    plugins: [navigationCompat(), {
      name: "link-contract-fixture",
      resolveId(id) { return id; },
      load(id) {
        if (id === entry) return `
          export async function open() {
            const navigation = await import("./navigation.js");
            const cache = await import("../server/app-rsc-cache-busting.js");
            return navigation.navigateClientSide(cache.createRscRequestUrl("/library"));
          }`;
        if (id === "./navigation.js") return 'export const navigateClientSide = url => "opened:" + url;';
        return 'export const createRscRequestUrl = url => url + "?_rsc";';
      },
    }],
  });
  try {
    const { output } = await build.generate({ format: "es", minify: true });
    expect(output).toHaveLength(1);
    const chunk = output[0];
    if (chunk.type !== "chunk") throw new Error("Expected executable chunk");
    const result = await import(/* @vite-ignore */ `data:text/javascript;base64,${Buffer.from(chunk.code).toString("base64")}`);
    expect(await result.open()).toBe("opened:/library?_rsc");
  } finally {
    await build.close();
  }
});
