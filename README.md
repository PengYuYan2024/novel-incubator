# 小说孵化器

这是一个面向长期小说创作者的私人创作管理工具，用于管理项目、人物、世界观、灵感、关联资料和创作数据。

## 项目简介

通过项目、标签、成熟度和双向关联，让零散记录逐渐成为可采用的小说素材。提供灵感收集台、内容资料库、小说项目三个主要区域；适合本机运行或带可靠访问控制的私人部署，不是多用户 SaaS 或云端协作平台。

## 核心功能

- 灵感快速记录与首页统计
- 人物卡、世界观设定和内容资料库
- 双向关联、全局搜索与组合筛选
- 小说项目工作区与成熟度分布
- 完整 JSON 导出、预检与恢复
- 当前浏览器内的表单草稿暂存与恢复

## 截图

待补充仅使用中性示例数据的截图；不包含私人小说资料。

## 技术栈

React、TypeScript、[vinext](https://github.com/cloudflare/vinext)（Next.js 兼容运行时）、Tailwind CSS、Drizzle ORM、Cloudflare D1 / Workers。测试使用 Vitest 与 Testing Library；私人托管可使用 OpenAI Sites。

## 已验证运行环境

- Windows
- Node.js `24.16.0`
- npm `11.13.0`

以上为当前已验证环境。`package.json` 保留现有 Node.js `>=22.13.0` 安装约束；这不代表已验收该范围内所有版本或其他操作系统。

使用 Git 克隆源码，使用仓库的 `package-lock.json`（lockfile v3）安装。不要混用其他包管理器或删除锁文件。初始化及项目命令不要求 Bash。

## 快速开始

当前版本适合 **本机使用**，或 **带可靠访问控制的私人部署**。业务 API 本身没有完整的独立账号系统；不要直接无保护地部署到公网，也不要将本地服务暴露到局域网或隧道。

1. 从本仓库的 Code 菜单复制地址并 Clone，进入包含 `package.json` 的网站源码根目录。
2. 初始化本实例配置。仅当 `.openai/hosting.json` 不存在时执行；下列命令遇到已有文件会拒绝覆盖。已有私人部署不要执行此步骤，也不要覆盖原配置。

   ```sh
   node -e "const fs = require('node:fs'); fs.copyFileSync('.openai/hosting.example.json', '.openai/hosting.json', fs.constants.COPYFILE_EXCL)"
   ```

   示例保留 `d1: "DB"` 和 `r2: null`，不含任何人的 Sites `project_id`。本机运行不需要注册 Sites，也不需要 OpenAI API Key、数据库密码或 `.env`。本地模拟数据库编号不是云端数据库凭据。

3. 按锁文件安装依赖，然后构建生成本地 Wrangler 配置：

   ```sh
   npm run install:ci
   npm run build
   ```

### 数据库初始化

4. **仅对全新的本地数据库**应用现有迁移。此命令会创建本地数据库文件，不会创建或修改云端数据库：

   ```sh
   node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_flat_blue_blade.sql
   ```

   不要对已有数据库重放这条迁移，也不需要为首次运行执行 `db:generate`。

### 本地运行

5. 启动开发环境，只监听本机：

   ```sh
   npm run dev -- --hostname 127.0.0.1
   ```

   打开终端显示的地址，默认端口为 5173。首次访问会建立少量可删除示例；这不是管理员账号或私人小说数据。

要验证正式构建，先停止开发服务，再执行 `npm run build` 和 `npm start`，打开终端显示的本机地址。`npm start` 是本地 Worker 预览，**不是线上生产启动或部署命令**。开发与构建预览共享本地数据库；浏览器草稿则按来源（包括端口）隔离。

## 数据保存位置、草稿与 JSON 备份

- 本地正式资料保存在 `.wrangler/state/`，不是云端数据。不要删除此目录来“清缓存”，除非已备份且确定要丢弃本地资料。
- Sites 私人实例的正式资料保存在该实例绑定的云端 D1；其他部署者必须拥有自己的实例与数据库。仅 Clone 源码不会得到任何人的云端资料。
- 未提交草稿只保存在当前浏览器、当前站点来源中，不跨设备同步。清理浏览器数据可能删除草稿。
- 停止输入约 500 毫秒后暂存；再次进入对应表单时可选择恢复或丢弃。草稿不等于正式保存，无法保证抵御所有浏览器崩溃或系统强制结束。
- “导出全部资料”是正式资料的 JSON 备份，**不含未提交草稿**。恢复会替换实例内的正式资料，请先备份，并核对预检结果。
- 不要提交数据库、下载的备份、草稿、私人截图或实际环境秘密文件。示例配置可公开，实际配置应留在本地。

## 安全 / 认证边界

- 当前一个实例是一套共享资料，没有按访问者隔离的多用户数据空间。当前私人站点主要依赖 Sites 平台访问保护，页面和业务 API 不自行提供注册、密码、OAuth 或 JWT 账号系统。
- 不要仅凭客户端隐藏按钮或请求中的身份头来保护独立公网实例。独立公网部署不属于当前即装即用流程，必须先有覆盖页面及全部 API 的可靠访问控制，并防止绕过网关直连。

## 私人部署说明

For an existing checkout, use the first-run steps above; do not run a starter initializer over the project. Edit the source under `app/` and the existing component/library directories, use `npm run dev` for local development, and run the project validation before hosting. The remote Sites builder also runs `npm run build` against the pushed private source commit. Do not rerun the dependency install unless dependencies are absent or the lockfile changed.

### Sites 私人部署

需要具备 Sites 权限的部署环境；公开源码本身不提供 Sites 账号或云端资源。

1. 新部署者从示例初始化本地 `.openai/hosting.json`，通过 Sites 流程注册自己的站点，将平台返回的准确 `project_id` 写入该文件，保留 `d1: "DB"`。已有私人实例则复用原文件与原站点，不重新注册。
2. Sites 管理真实 D1 资源及绑定；不要把本地模拟数据库编号当作云端数据库编号。生成的构建产物带有 `drizzle/` 迁移，生产迁移由 Sites 发布流程处理，不使用本地迁移命令操作生产库。
3. 按 Sites 的私人源代码提交、构建、保存版本和私人部署流程执行，并确认最终仅所有者可访问、没有额外访客。供 Sites 构建的**私人源代码副本**需要实际 `.openai/hosting.json`；首次纳入该私人仓库时须明确选择该文件，不能误提交到公开 GitHub 仓库。
4. 部署完成后核对访问策略和主要流程。不要切换公开访问来绕过失败。

公共源码快照与私人部署源码是两个交付面。下面的公开导出排除规则不改变现有私人站点，也不会删除本地配置。

## 开发与平台参考

以下保留现有运行工具与 Sites 集成参考，不是首次启动的额外前置步骤。普通本机使用不需要 ChatGPT 登录。

<details>
<summary>安装器、本地预览与 Sites 平台接口</summary>

This project does not use `wrangler.jsonc`.

`install:ci` runs `npm ci` once against this checkout's bundled lockfile, explicitly targeting the project and disabling parent-workspace discovery. It includes dev and optional dependencies required for builds and previews even when production/omit settings would exclude them. It defaults Sharp to prebuilt binaries unless the caller explicitly configures Sharp or a source build. It uses `--prefer-offline --no-audit --no-fund`, reuses the configured npm cache, and leaves network concurrency, retries, timeouts, and lifecycle-script policy to npm's configuration. Retain the installer session until it finishes; do not overlap installers for the same checkout.

`scripts/sites-env.mjs` preserves the caller's HOME, npm cache, proxy, XDG, and temporary-directory configuration while defaulting Wrangler and Miniflare state to the checkout. If npm reports an unwritable cache, select a writable path with `npm_config_cache` for that install. The `dev` and `start` scripts also keep Wrangler logs inside the checkout. Generated `.sites-runtime/` and `.wrangler/` directories are ignored by Git; `.wrangler/state/` contains local user data and must not be treated as disposable cache.

`npm run dev` uses `vinext dev` for the live Vite preview with HMR, starting at port 5173. Vinext records the running server in ignored `.vinext/` state and rejects another start for the same checkout while that process is alive; reuse its printed URL. It recovers stale state after a stopped process. Pass `--port <port>` or `--hostname <host>` after `npm run dev --` when needed; keep Codex previews on loopback. Like the Sites package, this relies on Vinext's advisory lock; exactly simultaneous starts can race.

The bundled Sites Vite plugin simulates ChatGPT sign-in only for loopback development requests. Visit `/signin-with-chatgpt?return_to=/` to sign in as `local_seedy` (`seedy@sites.test`, display name `Seedy`) and `/signout-with-chatgpt?return_to=/` to sign out. The development cookie preserves that identity across server restarts. This does not exercise real ChatGPT OAuth and is not included in production builds; hosted authentication remains dispatch-owned.

The Worker uses `vinext/server/fetch-handler`, including Vinext's config-aware image handling. After building, `npm start` runs that Worker locally through Wrangler on `127.0.0.1`, sharing `.wrangler/state` with dev preview and local D1 migrations; it does not deploy the site or simulate sign-in. Use the URL printed by the server. Pass `npm start -- --port <port>` to select a different built-preview port.

Local previews use Miniflare's placeholder `Request.cf` metadata without a network lookup. Set `CLOUDFLARE_CF_FETCH_ENABLED=true` to opt into fetching preview metadata; this setting does not change hosted request metadata.

Local tool usage metrics are disabled by default. Set `WRANGLER_SEND_METRICS=true` to opt in.

## Included Shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
- `.openai/hosting.example.json` is the public, unbound configuration template; the instance-local `.openai/hosting.json` declares the required D1 binding and any private Sites identity
- `vite.config.ts` simulates declared bindings for local development
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` defines projects, items, item tags, relations and initialization metadata
- `@cloudflare/workers-types` provides Worker types; `cloudflare-env.d.ts` declares optional `DB`/`BUCKET` bindings—update these declarations if binding names change
- `drizzle/0000_flat_blue_blade.sql` is the committed initial database migration; the application initializes a small neutral demo after the schema is applied
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

以下为 Sites 平台接口参考，不是本应用自行实现的认证。当前业务页面和 API 未调用 `chatgpt-auth.ts` 进行独立账号校验；线上访问限制由 Sites 平台执行。切勿脱离可信平台后直接信任这些请求头。

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Use it as the durable user key; use email and name for display or contact purposes.

SIWC-authenticated workspace sites may also receive `oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty `name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by `oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use the returned `userId` as the stable user key for user-owned records; do not use email as a durable identifier.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send anonymous visitors through Sign in with ChatGPT.
- In a Server Component, start sign-in with `<a href={chatGPTSignInPath(returnTo)} target="_top">`. The auth helper module is server-only; do not import it into a Client Component.
- Do not use `fetch`, XHR, a client-side router, or a framework link that can prefetch the sign-in route. SIWC must start as a top-level navigation.
- Never request the AuthAPI authorization endpoint directly. The dispatch-owned `/signin-with-chatgpt` route must start the SIWC flow.
- Use `chatGPTSignOutPath(returnTo)` for browser sign-out links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the OAuth cookies, and identity header injection. Do not implement app routes for those reserved paths. Routes that do not import and call the helper remain anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the Sites hosting platform's access policy controls for workspace-wide restrictions, or enforce explicit server-side membership or allowlist checks.

These helpers are retained platform integration utilities, not a user-registration feature or per-user data isolation layer in this application. The current application must remain local-only or behind reliable private access controls.

## Local D1 migrations

For first use, apply the committed initial migration; do not generate a new one. `npm run db:generate` is for intentional future schema development only. Build once through the Sites skill's build entrypoint (or `npm run build` for standalone use) to generate `dist/server/wrangler.json`, rebuilding if bindings change. From the project root, apply each pending migration in order:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_flat_blue_blade.sql
```

Replace the filename with the pending migration and `DB` with your D1 binding name if different. Use `.wrangler/state`, not `.wrangler/state/v3`; Wrangler adds the versioned directories. Do not replay migrations already applied locally. This updates only the preview database; publishing applies production migrations separately.

## Diagnostic Commands

- `npm run install:ci`: perform the one locked dependency install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build the deployable Sites artifact
- `npm run start`: preview the built Worker locally with D1/R2 support
- `npm run db:generate`: generate Drizzle migrations after schema changes

When using the Sites plugin, follow its skill instructions for installation, builds, and publishing. These npm commands remain available for standalone use.

Like the Sites package, `npm run build` runs `vinext build` directly; it does not require a host `timeout` command.

</details>

## 质量检查

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

## GitHub 源码发布边界（维护者）

公开仓库直接以 `package.json`、`app/` 等为根。私人部署副本、实际托管配置、数据库及维护记录不属于公开源码。

现有维护分支及其历史含私人托管绑定和内部资料，**不要直接将该分支、历史或外层目录 Push 到公开仓库**。采用风险较低的方式：从已审查、已确认提交的网站源码生成不带 Git 历史的快照，再在另一个全新目录中建立公开仓库。此处只记录流程，不代表现在已经获准发布。

`.gitattributes` 的 `export-ignore` 会从 `git archive` 排除实际 `.openai/hosting.json`、内部规划及维护记录；`.openai/hosting.example.json` 会保留。它不会影响现有文件、私人 Git 历史或 Sites 构建。`.gitignore` 也不会自动取消已跟踪文件。

维护者从已审查提交导出时可使用以下命令（`HEAD` 必须是已验证的提交，未提交的编辑不会进入归档）。最终发布整理若在独立快照中完成，应发布该已验证快照，不要用较旧的私人分支重新导出替代它：

```sh
git archive --format=zip --output=../novel-incubator-public-source.zip HEAD
```

导出后先检查压缩包：必须包含模板、锁文件、迁移及第三方许可；不得包含真实绑定、私人文档、数据、备份、`.git` 或外层维护文件。解压到全新目录复验首次运行，再单独授权创建公开仓库；不要把私人仓库的 `.git` 复制过去。不要用整目录压缩、`git clone` 私人仓库或 `git push --mirror` 替代此快照流程。

## License

本项目原创代码采用 [MIT License](LICENSE)，Copyright (c) 2026 PengYuYan2024。

第三方代码与依赖仍遵守各自的许可证，不因顶层 MIT 声明而重新授权。必须保留 `build/sites-vite-plugin.LICENSE`（OpenAI）和 `vendor/shadcn-tailwind-4.13.0.LICENSE.md`（shadcn）。分发包含第三方依赖的构建产物时，也应遵守相应许可证的署名、通知和源码提供等适用要求。

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
