/*
 * Copyright 2016 Resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var imageWrite = require('resin-image-write');
var Promise = require('bluebird');
var umount = Promise.promisifyAll(require('umount'));
var fs = require('fs');
var os = require('os');
var isWindows = os.platform() === 'win32';

if (isWindows) {
  var removedrive = Promise.promisifyAll(require('removedrive'));
}

/**
 * @summary Get image readable stream
 * @function
 * @private
 *
 * @description
 * This function adds a custom `.length` property
 * to the stream which equals the image size in bytes.
 *
 * @param {String} image - path to image
 * @returns {ReadableStream} image stream
 *
 * @example
 * var stream = writer.getImageStream('foo/bar/baz.img');
 */
exports.getImageStream = function(image) {
  'use strict';

  var stream = fs.createReadStream(image);
  stream.length = fs.statSync(image).size;
  return stream;
};

/**
 * @summary Write an image to a disk drive
 * @function
 * @public
 *
 * @description
 * See https://github.com/resin-io/resin-image-write for information
 * about the `state` object passed to `onProgress` callback.
 *
 * @param {String} image - path to image
 * @param {Object} drive - drive
 * @param {Function} onProgress - on progress callback (state)
 *
 * @returns {Promise}
 *
 * @example
 * writer.writeImage('path/to/image.img', {
 *   device: '/dev/disk2'
 * }, function(state) {
 *   console.log(state.percentage);
 * }).then(function() {
 *   console.log('Done!');
 * });
 */
exports.writeImage = function(image, drive, onProgress) {
  'use strict';

  return umount.umountAsync(drive.device).then(function() {
    var stream = exports.getImageStream(image);
    return imageWrite.write(drive.device, stream);
  }).then(function(writer) {
    return new Promise(function(resolve, reject) {
      writer.on('progress', onProgress);
      writer.on('error', reject);
      writer.on('done', resolve);
    });
  }).then(function() {
    if (isWindows && drive.mountpoint) {
      return removedrive.ejectAsync(drive.mountpoint);
    } else {
      return umount.umountAsync(drive.device);
    }
  });
};
