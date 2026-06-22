import type { StorybookConfig } from "@storybook/react-vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  staticDirs: ["../public"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-vitest"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  viteFinal: async (viteConfig) => {
    viteConfig.resolve = viteConfig.resolve ?? {};
    viteConfig.resolve.alias = {
      ...(viteConfig.resolve.alias ?? {}),
      "@shared": path.resolve(dirname, "../../shared"),
      "@design-system": path.resolve(dirname, "../src/design-system"),
      "@features": path.resolve(dirname, "../src/features"),
      "@lib": path.resolve(dirname, "../src/lib"),
    };
    viteConfig.server = {
      ...viteConfig.server,
      fs: {
        ...viteConfig.server?.fs,
        allow: [...(viteConfig.server?.fs?.allow ?? []), path.resolve(dirname, "../..")],
      },
    };
    return viteConfig;
  },
};

export default config;
