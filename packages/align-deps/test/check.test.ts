import { checkPackageManifest } from "../src/commands/check";
import { defaultConfig } from "../src/config";
import { profile as profile_0_68 } from "../src/presets/microsoft/react-native/profile-0.68";
import { profile as profile_0_69 } from "../src/presets/microsoft/react-native/profile-0.69";
import { profile as profile_0_70 } from "../src/presets/microsoft/react-native/profile-0.70";
import { packageVersion } from "./helpers";

jest.mock("fs");

const defaultOptions = {
  presets: defaultConfig.presets,
  loose: false,
  migrateConfig: false,
  noUnmanaged: false,
  verbose: false,
  write: false,
};

const writeOptions = {
  ...defaultOptions,
  write: true,
};

describe("checkPackageManifest({ kitType: 'library' })", () => {
  const rnxKitConfig = require("@rnx-kit/config");
  const fs = require("fs");

  const consoleLogSpy = jest.spyOn(global.console, "log");
  const consoleWarnSpy = jest.spyOn(global.console, "warn");
  const consoleErrorSpy = jest.spyOn(global.console, "error");

  const mockManifest = {
    name: "@rnx-kit/align-deps",
    version: "0.0.1",
  };

  const react_v68_v69_v70 = [
    packageVersion(profile_0_68, "react"),
    packageVersion(profile_0_69, "react"),
    packageVersion(profile_0_70, "react"),
  ].join(" || ");

  const v68_v69_v70 = [
    packageVersion(profile_0_68, "core"),
    packageVersion(profile_0_69, "core"),
    packageVersion(profile_0_70, "core"),
  ].join(" || ");

  beforeEach(() => {
    fs.__setMockContent({});
    rnxKitConfig.__setMockConfig();
    consoleLogSpy.mockReset();
    consoleWarnSpy.mockReset();
    consoleErrorSpy.mockReset();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("returns error code when reading invalid manifests", () => {
    const result = checkPackageManifest("package.json", defaultOptions);
    expect(result).toBe("invalid-manifest");
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test("returns early if 'rnx-kit' is missing from the manifest", () => {
    fs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
    });

    const result = checkPackageManifest("package.json", defaultOptions);

    expect(result).toBe("not-configured");
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test("prints warnings when detecting bad packages", () => {
    fs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
      peerDependencies: {
        "react-native": profile_0_70["core"],
      },
      devDependencies: {
        "react-native": profile_0_70["core"],
      },
    });
    rnxKitConfig.__setMockConfig({
      alignDeps: { requirements: ["react-native@0.70"] },
    });

    const result = checkPackageManifest("package.json", defaultOptions);

    expect(result).toBe("success");
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test("prints warnings when detecting bad packages (with version range)", () => {
    fs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
    });
    rnxKitConfig.__setMockConfig({
      alignDeps: { requirements: ["react-native@^0.69.0 || ^0.70.0"] },
    });

    const result = checkPackageManifest("package.json", defaultOptions);

    expect(result).toBe("success");
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test("returns early if no capabilities are defined", () => {
    fs.__setMockContent(mockManifest);
    rnxKitConfig.__setMockConfig({
      alignDeps: { requirements: ["react-native@0.70"] },
    });

    const result = checkPackageManifest("package.json", defaultOptions);

    expect(result).toBe("success");
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test("returns if no changes are needed", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
      devDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
    });
    rnxKitConfig.__setMockConfig({
      alignDeps: {
        requirements: ["react-native@0.70"],
        capabilities: ["core-ios"],
      },
    });

    const result = checkPackageManifest("package.json", defaultOptions);

    expect(result).toBe("success");
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test("prints additional information with `--verbose`", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
      devDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
    });
    rnxKitConfig.__setMockConfig({
      alignDeps: {
        requirements: ["react-native@0.70"],
        capabilities: ["core-ios"],
      },
    });

    const result = checkPackageManifest("package.json", {
      ...defaultOptions,
      verbose: true,
    });

    expect(result).toBe("success");
    expect(consoleLogSpy).toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test("returns if no changes are needed (write: true)", () => {
    let didWriteToPath = false;

    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
      devDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
    });
    fs.__setMockFileWriter((p, _content) => {
      didWriteToPath = p;
    });
    rnxKitConfig.__setMockConfig({
      alignDeps: {
        requirements: ["react-native@0.70"],
        capabilities: ["core-ios"],
      },
    });

    expect(checkPackageManifest("package.json", writeOptions)).toBe("success");
    expect(didWriteToPath).toBe(false);
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test("returns error code if changes are needed", () => {
    fs.__setMockContent(mockManifest);
    rnxKitConfig.__setMockConfig({
      alignDeps: {
        requirements: ["react-native@0.70"],
        capabilities: ["core-ios"],
      },
    });

    const result = checkPackageManifest(
      "package.json",
      defaultOptions,
      undefined,
      (message) => {
        expect(message).toBe(`package.json
      ├── peerDependencies["react"]: dependency is missing, expected "18.1.0"
      ├── peerDependencies["react-native"]: dependency is missing, expected "^0.70.0"
      ├── devDependencies["react"]: dependency is missing, expected "18.1.0"
      ├── devDependencies["react-native"]: dependency is missing, expected "^0.70.0"
      └── Re-run with '--write' to fix them
`);
      }
    );

    expect(result).not.toBe("success");
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test("writes changes back to 'package.json'", () => {
    let didWriteToPath = false;

    fs.__setMockContent(mockManifest);
    fs.__setMockFileWriter((p, _content) => {
      didWriteToPath = p;
    });
    rnxKitConfig.__setMockConfig({
      alignDeps: {
        requirements: ["react-native@0.70"],
        capabilities: ["core-ios"],
      },
    });

    expect(checkPackageManifest("package.json", writeOptions)).toBe("success");
    expect(didWriteToPath).toBe("package.json");
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test("preserves indentation in 'package.json'", () => {
    let output = "";

    fs.__setMockContent(mockManifest, "\t");
    fs.__setMockFileWriter((_, content) => {
      output = content;
    });
    rnxKitConfig.__setMockConfig({
      alignDeps: {
        requirements: ["react-native@0.70"],
        capabilities: ["core-ios"],
      },
    });

    expect(checkPackageManifest("package.json", writeOptions)).toBe("success");
    expect(output).toMatchSnapshot();
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test("returns appropriate error code if package is excluded", () => {
    fs.__setMockContent(mockManifest);
    rnxKitConfig.__setMockConfig({
      alignDeps: {
        requirements: ["react-native@0.70"],
        capabilities: ["core-ios"],
      },
    });

    const result = checkPackageManifest("package.json", {
      ...defaultOptions,
      excludePackages: ["@rnx-kit/align-deps"],
    });

    expect(result).toBe("excluded");
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test("uses minimum supported version as development version", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v68_v69_v70,
        "react-native": v68_v69_v70,
      },
      devDependencies: {
        react: packageVersion(profile_0_68, "react"),
        "react-native": packageVersion(profile_0_68, "core"),
      },
    });
    rnxKitConfig.__setMockConfig({
      alignDeps: {
        requirements: ["react-native@0.68 || 0.69 || 0.70"],
        capabilities: ["core-ios"],
      },
    });

    const result = checkPackageManifest("package.json", defaultOptions);

    expect(result).toBe("success");
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test("uses declared development version", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v68_v69_v70,
        "react-native": v68_v69_v70,
      },
      devDependencies: {
        react: packageVersion(profile_0_69, "react"),
        "react-native": packageVersion(profile_0_69, "core"),
      },
    });
    rnxKitConfig.__setMockConfig({
      alignDeps: {
        requirements: {
          development: ["react-native@0.69"],
          production: ["react-native@0.68 || 0.69 || 0.70"],
        },
        capabilities: ["core-ios"],
      },
    });

    const result = checkPackageManifest("package.json", defaultOptions);

    expect(result).toBe("success");
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test("handles development version ranges", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v68_v69_v70,
        "react-native": v68_v69_v70,
      },
      devDependencies: {
        react: packageVersion(profile_0_69, "react"),
        "react-native": packageVersion(profile_0_69, "core"),
      },
    });
    rnxKitConfig.__setMockConfig({
      alignDeps: {
        requirements: {
          development: ["react-native@0.69"],
          production: ["react-native@0.68 || 0.69 || 0.70"],
        },
        capabilities: ["core-ios"],
      },
    });

    const result = checkPackageManifest("package.json", defaultOptions);

    expect(result).toBe("success");
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test("allows exact versions", () => {
    const mods = /^[^\d]*/;
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v68_v69_v70,
        "react-native": v68_v69_v70,
      },
      devDependencies: {
        react: packageVersion(profile_0_69, "react").replace(mods, ""),
        "react-native": packageVersion(profile_0_69, "core").replace(mods, ""),
      },
    });
    rnxKitConfig.__setMockConfig({
      alignDeps: {
        requirements: {
          development: ["react-native@0.69"],
          production: ["react-native@0.68 || 0.69 || 0.70"],
        },
        capabilities: ["core-ios"],
      },
    });

    const result = checkPackageManifest("package.json", {
      ...defaultOptions,
      diffMode: "allow-subset",
    });

    expect(result).toBe("success");
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  test("allows version range subsets", () => {
    const patch = /\.\d*$/;
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v68_v69_v70,
        "react-native": v68_v69_v70,
      },
      devDependencies: {
        react: packageVersion(profile_0_69, "react"),
        "react-native": packageVersion(profile_0_69, "core").replace(
          patch,
          ".9999"
        ),
      },
    });
    rnxKitConfig.__setMockConfig({
      alignDeps: {
        requirements: {
          development: ["react-native@0.69"],
          production: ["react-native@0.68 || 0.69 || 0.70"],
        },
        capabilities: ["core-ios"],
      },
    });

    const result = checkPackageManifest("package.json", {
      ...defaultOptions,
      diffMode: "allow-subset",
    });

    expect(result).toBe("success");
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});

describe("checkPackageManifest({ kitType: 'library' }) (backwards compatibility)", () => {
  const rnxKitConfig = require("@rnx-kit/config");
  const fs = require("fs");

  const mockManifest = {
    name: "@rnx-kit/align-deps",
    version: "0.0.1",
  };

  const react_v68_v69_v70 = [
    packageVersion(profile_0_68, "react"),
    packageVersion(profile_0_69, "react"),
    packageVersion(profile_0_70, "react"),
  ].join(" || ");

  const v68_v69_v70 = [
    packageVersion(profile_0_68, "core"),
    packageVersion(profile_0_69, "core"),
    packageVersion(profile_0_70, "core"),
  ].join(" || ");

  beforeEach(() => {
    fs.__setMockContent({});
    rnxKitConfig.__setMockConfig();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("returns error code when reading invalid manifests", () => {
    const result = checkPackageManifest("package.json", defaultOptions);
    expect(result).not.toBe("success");
  });

  test("returns early if 'rnx-kit' is missing from the manifest", () => {
    fs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
    });

    const result = checkPackageManifest("package.json", defaultOptions);

    expect(result).toBe("not-configured");
  });

  test("prints warnings when detecting bad packages", () => {
    fs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
      peerDependencies: {
        "react-native": profile_0_70["core"],
      },
      devDependencies: {
        "react-native": profile_0_70["core"],
      },
    });
    rnxKitConfig.__setMockConfig({ reactNativeVersion: "0.70.0" });

    const result = checkPackageManifest("package.json", defaultOptions);

    expect(result).toBe("success");
  });

  test("prints warnings when detecting bad packages (with version range)", () => {
    fs.__setMockContent({
      ...mockManifest,
      dependencies: { "react-native-linear-gradient": "0.0.0" },
    });
    rnxKitConfig.__setMockConfig({ reactNativeVersion: "^0.69.0 || ^0.70.0" });

    const result = checkPackageManifest("package.json", defaultOptions);

    expect(result).toBe("success");
  });

  test("returns early if no capabilities are defined", () => {
    fs.__setMockContent(mockManifest);
    rnxKitConfig.__setMockConfig({ reactNativeVersion: "0.70.0" });

    const result = checkPackageManifest("package.json", defaultOptions);

    expect(result).toBe("success");
  });

  test("returns if no changes are needed", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
      devDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "0.70.0",
      capabilities: ["core-ios"],
    });

    const result = checkPackageManifest("package.json", defaultOptions);

    expect(result).toBe("success");
  });

  test("returns if no changes are needed (write: true)", () => {
    let didWriteToPath = false;

    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
      devDependencies: {
        react: packageVersion(profile_0_70, "react"),
        "react-native": packageVersion(profile_0_70, "core"),
      },
    });
    fs.__setMockFileWriter((p, _content) => {
      didWriteToPath = p;
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "0.70.0",
      capabilities: ["core-ios"],
    });

    expect(checkPackageManifest("package.json", writeOptions)).toBe("success");
    expect(didWriteToPath).toBe(false);
  });

  test("returns error code if changes are needed", () => {
    fs.__setMockContent(mockManifest);
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "0.70.0",
      capabilities: ["core-ios"],
    });

    const result = checkPackageManifest("package.json", defaultOptions);

    expect(result).toBe("unsatisfied");
  });

  test("writes changes back to 'package.json'", () => {
    let didWriteToPath = false;

    fs.__setMockContent(mockManifest);
    fs.__setMockFileWriter((p, _content) => {
      didWriteToPath = p;
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "0.70.0",
      capabilities: ["core-ios"],
    });

    expect(checkPackageManifest("package.json", writeOptions)).toBe("success");
    expect(didWriteToPath).toBe("package.json");
  });

  test("preserves indentation in 'package.json'", () => {
    let output = "";

    fs.__setMockContent(mockManifest, "\t");
    fs.__setMockFileWriter((_, content) => {
      output = content;
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "0.70.0",
      capabilities: ["core-ios"],
    });

    expect(checkPackageManifest("package.json", writeOptions)).toBe("success");
    expect(output).toMatchSnapshot();
  });

  test("uses minimum supported version as development version", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v68_v69_v70,
        "react-native": v68_v69_v70,
      },
      devDependencies: {
        react: packageVersion(profile_0_68, "react"),
        "react-native": packageVersion(profile_0_68, "core"),
      },
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "^0.68 || ^0.69 || ^0.70",
      capabilities: ["core-ios"],
    });

    const result = checkPackageManifest("package.json", defaultOptions);

    expect(result).toBe("success");
  });

  test("uses declared development version", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v68_v69_v70,
        "react-native": v68_v69_v70,
      },
      devDependencies: {
        react: packageVersion(profile_0_69, "react"),
        "react-native": packageVersion(profile_0_69, "core"),
      },
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "^0.68 || ^0.69 || ^0.70",
      reactNativeDevVersion: "0.69.4",
      capabilities: ["core-ios"],
    });

    const result = checkPackageManifest("package.json", defaultOptions);

    expect(result).toBe("success");
  });

  test("handles development version ranges", () => {
    fs.__setMockContent({
      ...mockManifest,
      peerDependencies: {
        react: react_v68_v69_v70,
        "react-native": v68_v69_v70,
      },
      devDependencies: {
        react: packageVersion(profile_0_69, "react"),
        "react-native": packageVersion(profile_0_69, "core"),
      },
    });
    rnxKitConfig.__setMockConfig({
      reactNativeVersion: "^0.68 || ^0.69 || ^0.70",
      reactNativeDevVersion: "^0.69.4",
      capabilities: ["core-ios"],
    });

    const result = checkPackageManifest("package.json", defaultOptions);

    expect(result).toBe("success");
  });
});
