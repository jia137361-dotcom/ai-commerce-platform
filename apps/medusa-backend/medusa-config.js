"use strict"

/**
 * Medusa 通过 `require("<cwd>/medusa-config")` 加载配置（无扩展名），Node 不会自动解析 `.ts`。
 * 这里先注册 ts-node，再加载 `medusa-config.ts`。
 */
require("ts-node").register({
  transpileOnly: true,
  compilerOptions: {
    target: "ES2021",
    module: "CommonJS",
    moduleResolution: "Node",
    esModuleInterop: true,
    skipLibCheck: true,
    strict: true,
  },
})

try {
  require("tsconfig-paths/register")
} catch {
  // 可选依赖，缺失时忽略
}

const mod = require("./medusa-config.ts")
module.exports = mod.default ?? mod
