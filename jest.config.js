const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const customJestConfig = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    // Handle CSS/image imports
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif|webp|avif|ico|bmp|svg)$": "<rootDir>/__mocks__/fileMock.js",
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
  transform: {
    "^.+\\.(js|jsx)$": ["babel-jest", { presets: ["next/babel"] }],
  },
  transformIgnorePatterns: ["/node_modules/(?!(js-cookie)/)"],
};

module.exports = createJestConfig(customJestConfig);
