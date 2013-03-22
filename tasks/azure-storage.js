'use strict';

module.exports = function(grunt) {
  var azure = require('azure');
  var util = require('util');
  var path = require('path');
  var zlib = require('zlib');
  var fs = require('fs');
  var os = require('os');
  var crypto = require('crypto');
  var mime = require('mime');

  grunt.registerMultiTask('azure-storage', 'Copy files to azure storage blob', function() {
    var options = this.options({
      serviceOptions: [], // custom arguments to azure.createBlobService
      containerName: null, // container name, required
      containerDelete: false, // deletes container if it exists
      containerOptions: {publicAccessLevel: "blob"}, // container options
      metadata: {}, // file metadata properties
      gzip: false // gzip files
    });

    if (!options.containerName) {
      grunt.fatal("containerName is required");
    }

    var blobService = azure.createBlobService.apply(azure, options.serviceOptions);

    // set up async callback
    var that = this;
    var done = (function() {
      var async = that.async();
      var count = that.files.length;

      return function() {
        if (--count === 0) {
          async();
        }
      };
    })();


    // create container and insert files
    var create = function() {
      blobService.createContainerIfNotExists(options.containerName, options.containerOptions, function(err) {
        if (err) {
          if (err.code === 'ContainerBeingDeleted') {
            grunt.log.writeln("Container being deleted, retrying in 10 seconds");
            return setTimeout(create, 10000);
          }
          grunt.warn(err);
        }

        // loop files
        that.files.forEach(function(f) {
          grunt.util.async.forEachSeries(f.src, function(source, next) {
            var destination = path.basename(source);
            var metadata = options.metadata;
            var tmp = source;

            // copy file
            var copy = function() {
              blobService.createBlockBlobFromFile(options.containerName, destination, tmp, metadata, function(err) {
                if (err) {
                  grunt.warn(err);
                }

                var act = options.gzip ? 'Gzipped' : 'Copied';
                var msg = util.format('%s %s to azure (%s/%s)', act, source, options.containerName, destination);
                grunt.log.writeln(msg);

                if (options.gzip) {
                  fs.unlink(tmp, next);
                } else {
                  next();
                }
              });
            };

            // gzip
            if (options.gzip) {
              tmp = os.tmpDir()+'/grunt-azure-storage-'+crypto.randomBytes(4).readUInt32LE(0);
              if (typeof(metadata.contentType) === 'undefined') {
                metadata.contentType = mime.lookup(source);
              }

              zlib.gzip(fs.readFileSync(source), function(err, buffer) {
                fs.writeFile(tmp, buffer, copy);
              });
            } else {
              copy();
            }
          }, done);
        });
      });
    };

    // execute container creation after optionally deleting the current container
    if (options.containerDelete) {
      var msg = util.format("Deleting container '%s'", options.containerName);
      grunt.log.writeln(msg);
      blobService.deleteContainer(options.containerName, create);
    } else {
      create();
    }
  });
};
