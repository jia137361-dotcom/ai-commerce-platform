module.exports = {
  rootDir: ".",
  testEnvironment: "node",
  transform: {
    "^.+\\.(t|j)sx?$": ["@swc/jest", {
      jsc: {
        parser: { syntax: "typescript", tsx: true },
        transform: { react: { runtime: "automatic" } },
      },
      module: { type: "commonjs" },
    }],
  },
  testMatch: ["<rootDir>/src/**/*.test.ts"],
}
