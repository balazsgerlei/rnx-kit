# @rnx-kit/metro-plugin-cyclic-dependencies-detector

[![Build](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml/badge.svg)](https://github.com/microsoft/rnx-kit/actions/workflows/build.yml)
[![npm version](https://img.shields.io/npm/v/@rnx-kit/metro-plugin-cyclic-dependencies-detector)](https://www.npmjs.com/package/@rnx-kit/metro-plugin-cyclic-dependencies-detector)

`@rnx-kit/metro-plugin-cyclic-dependencies-detector` detects cyclic import
chains that may cause issues in your bundle.

## Usage

Import and add the plugin to `MetroSerializer` in your `metro.config.js`, and
optionally configure it to your liking:

```diff
 const { makeMetroConfig } = require("@rnx-kit/metro-config");
+const {
+  CyclicDependencies,
+} = require("@rnx-kit/metro-plugin-cyclic-dependencies-detector");
+const { MetroSerializer } = require("@rnx-kit/metro-serializer");

 module.exports = makeMetroConfig({
   serializer: {
+    customSerializer: MetroSerializer([
+      CyclicDependencies({
+        includeNodeModules: false,
+        linesOfContext: 1,
+        throwOnError: true,
+      }),
+    ]),
   },
 });
```

If you are not using `@rnx-kit/metro-serializer`, you can still use the plugin
directly in your `metro.config.js`. This is useful if you are using Expo which
uses its own custom serializer:

```js
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.serializer.customSerializer = async (
  entryPoint,
  preModules,
  graph,
  options
) => {
  CyclicDependencies({
    // Options
  })(entryPoint, preModules, graph, options);
  return await config.serializer.customSerializer(
    entryPoint,
    preModules,
    graph,
    options
  );
};

module.exports = config;
```

## Options

| Key                | Type    | Default | Description                                   |
| :----------------- | :------ | :------ | :-------------------------------------------- |
| includeNodeModules | boolean | `false` | Whether to scan `node_modules`.               |
| linesOfContext     | number  | 1       | Number of extra modules to print for context. |
| throwOnError       | boolean | `true`  | Whether to throw when cycles are detected.    |
