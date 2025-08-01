import { error, info } from "@rnx-kit/console";
import { readPackage } from "@rnx-kit/tools-node/package";
import * as path from "path";
import { migrateConfig } from "../compatibility/config";
import { loadConfig } from "../config";
import { diff, stringify } from "../diff";
import { isError } from "../errors";
import { modifyManifest } from "../helpers";
import { updatePackageManifest } from "../manifest";
import { resolve } from "../preset";
import type { Command, ErrorCode, Options } from "../types";
import { checkPackageManifestUnconfigured } from "./vigilant";

/**
 * Checks the specified package manifest for misaligned dependencies.
 *
 * There are essentially two modes of operation depending on whether the package
 * is an app or a library.
 *
 * - For libraries, only dependencies that are declared under capabilities are
 *   checked. `align-deps` will ensure that `peerDependencies` and
 *   `devDependencies` are correctly used to satisfy the declared capabilities.
 * - For apps, its dependencies and the dependencies of its dependencies are
 *   checked. `align-deps` will ensure that `dependencies` and `devDependencies`
 *   are correctly used to satisfy the declared capabilities. Additionally,
 *   requirements may only resolve to a single profile. If multiple profiles
 *   satisfy the requirements, the command will fail.
 *
 * Note that this function mutates the manifest when `write` is `true`.
 *
 * @see {@link updatePackageManifest}
 *
 * @param manifestPath Path to the package manifest to check
 * @param options Command line options
 * @param inputConfig Configuration in the package manifest
 * @param logError Function for outputting changes
 * @returns `success` when everything is in order; an {@link ErrorCode} otherwise
 */
export function checkPackageManifest(
  manifestPath: string,
  options: Options,
  inputConfig = loadConfig(manifestPath, options),
  logError = error
): ErrorCode {
  if (isError(inputConfig)) {
    return inputConfig;
  }

  const config = migrateConfig(inputConfig, manifestPath, options);
  const { devPreset, prodPreset, capabilities } = resolve(
    config,
    path.dirname(manifestPath),
    options
  );
  const { kitType, manifest } = config;

  if (kitType === "app" && Object.keys(prodPreset).length !== 1) {
    return "invalid-app-requirements";
  } else if (capabilities.length === 0) {
    return "success";
  }

  if (options.verbose) {
    if (kitType === "app") {
      info(
        `${manifestPath}: Aligning your app's dependencies according to the following profiles:`,
        Object.keys(prodPreset).join(", ")
      );
    } else {
      info(
        `${manifestPath}: Aligning your library's dependencies according to the following profiles:\n` +
          `\t- Development: ${Object.keys(devPreset).join(", ")}\n` +
          `\t- Production: ${Object.keys(prodPreset).join(", ")}`
      );
    }
  }

  const updatedManifest = updatePackageManifest(
    manifestPath,
    manifest,
    capabilities,
    prodPreset,
    devPreset,
    kitType
  );

  const allChanges = diff(manifest, updatedManifest, options);
  if (allChanges) {
    if (options.write) {
      // The config object may be passed to other commands, so we need to
      // update it in-place to ensure consistency.
      inputConfig.manifest = updatedManifest;
      modifyManifest(manifestPath, updatedManifest);
    } else {
      const violations = stringify(allChanges, [manifestPath]);
      logError(violations);
      return "unsatisfied";
    }
  }

  return "success";
}

/**
 * Creates the check command. This is the default command no other flags are
 * specified.
 *
 * In normal mode, `align-deps` will only check packages that have a
 * configuration, and only listed capabilities.
 *
 * In vigilant mode, `align-deps` will check all packages in the workspace,
 * regardless of whether they have a configuration. For packages that do have a
 * configuration, the listed capabilities will be checked first as usual. The
 * remaining capabilities will then be checked, but are treated as unconfigured.
 *
 * @see {@link checkPackageManifest}
 * @see {@link checkPackageManifestUnconfigured}
 *
 * @param options Command line options
 * @returns The check command
 */
export function makeCheckCommand(options: Options): Command {
  const { presets, requirements } = options;
  if (!requirements) {
    return (manifest: string) => checkPackageManifest(manifest, options);
  }

  return (manifest: string) => {
    const inputConfig = loadConfig(manifest, options);
    const config = isError(inputConfig)
      ? inputConfig
      : migrateConfig(inputConfig, manifest, options);

    // If the package is configured, run the normal check first.
    if (!isError(config)) {
      const output: string[] = [];
      const logError = (message: string) => {
        output.push(message);
      };
      const res1 = checkPackageManifest(manifest, options, config, logError);
      const res2 = checkPackageManifestUnconfigured(
        manifest,
        options,
        config,
        logError
      );
      for (const message of output) {
        error(message);
      }
      return res1 !== "success" ? res1 : res2;
    }

    // Otherwise, run the unconfigured check only.
    if (config === "invalid-configuration" || config === "not-configured") {
      // In "vigilant" mode, we allow packages to declare which presets should
      // be used in config, overriding the `--presets` flag.
      return checkPackageManifestUnconfigured(manifest, options, {
        kitType: "library",
        alignDeps: {
          presets,
          requirements,
          capabilities: [],
        },
        manifest: readPackage(manifest),
      });
    }

    return config;
  };
}
