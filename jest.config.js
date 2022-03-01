module.exports = require("next/jest")({ dir: "./" })({
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: "jest-environment-jsdom",
  moduleDirectories: ["node_modules", "<rootDir>"],
  moduleNameMapper: {
    // Path aliase
    "^@/(.*)$": "<rootDir>/$1",
  },
})