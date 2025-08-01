// THIS FILE IS A COPY OF https://github.com/facebook/react-native/blob/v0.76.9/packages/assets/path-support.js
// As of 0.77, we should be using `@react-native/community-cli-plugin` instead.

/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 *  strict
 */

'use strict';


const androidScaleSuffix = {
  '0.75': 'ldpi',
  '1': 'mdpi',
  '1.5': 'hdpi',
  '2': 'xhdpi',
  '3': 'xxhdpi',
  '4': 'xxxhdpi',
};

const ANDROID_BASE_DENSITY = 160;

/**
 * FIXME: using number to represent discrete scale numbers is fragile in essence because of
 * floating point numbers imprecision.
 */
function getAndroidAssetSuffix(scale) {
  if (scale.toString() in androidScaleSuffix) {
    // $FlowFixMe[invalid-computed-prop]
    return androidScaleSuffix[scale.toString()];
  }
  // NOTE: Android Gradle Plugin does not fully support the nnndpi format.
  // See https://issuetracker.google.com/issues/72884435
  if (Number.isFinite(scale) && scale > 0) {
    return Math.round(scale * ANDROID_BASE_DENSITY) + 'dpi';
  }
  throw new Error('no such scale ' + scale.toString());
}

// See https://developer.android.com/guide/topics/resources/drawable-resource.html
const drawableFileTypes = new Set([
  'gif',
  'jpeg',
  'jpg',
  'ktx',
  'png',
  'svg',
  'webp',
  'xml',
]);

function getAndroidResourceFolderName(
  asset,
  scale,
) {
  if (!drawableFileTypes.has(asset.type)) {
    return 'raw';
  }
  const suffix = getAndroidAssetSuffix(scale);
  if (!suffix) {
    throw new Error(
      "Don't know which android drawable suffix to use for scale: " +
        scale +
        '\nAsset: ' +
        JSON.stringify(asset, null, '\t') +
        '\nPossible scales are:' +
        JSON.stringify(androidScaleSuffix, null, '\t'),
    );
  }
  return 'drawable-' + suffix;
}

function getAndroidResourceIdentifier(asset) {
  return (getBasePath(asset) + '/' + asset.name)
    .toLowerCase()
    .replace(/\//g, '_') // Encode folder structure in file name
    .replace(/([^a-z0-9_])/g, '') // Remove illegal chars
    .replace(/^assets_/, ''); // Remove "assets_" prefix
}

function getBasePath(asset) {
  const basePath = asset.httpServerLocation;
  return basePath.startsWith('/') ? basePath.slice(1) : basePath;
}

module.exports = {
  getAndroidResourceFolderName,
  getAndroidResourceIdentifier,
  getBasePath,
};
