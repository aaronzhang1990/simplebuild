var path = require('path');
var fs = require('fs');
var debug = require('debug')('sb:backend:local')

var utils = require('../utils');
// 导出为 middleware

module.exports = function(options){
    var prefix, root;
    if(typeof options === "string") {
        root = options;
        prefix = '/';
    } else {
        prefix = options.prefix || '/';
        root = options.root;
    }
    if(!root) {
        throw new Error("backend `local` must have root config!");
    }
    // \\ -> /
    if(process.platform === "win32") {
        root = root.replace(new RegExp("\\\\", "g"), '/');
    }
    if(root.endsWith('/')) {
        root = root.substring(0, root.length - 1);
    }
    return function(req, resp, next){
        var pathname = req.path, dir, file, last_slash, hit;
        if(pathname.indexOf(prefix) !== 0) {
            return next();
        }
        if(pathname.endsWith('/')) {
            pathname = pathname.substring(0, pathname.length - 1);
        }

        last_slash = pathname.lastIndexOf('/');
        dir = root + pathname.substring(0, last_slash);
        files = [
            req.method.toLowerCase() + '-' + pathname.substring(last_slash + 1) + '.json',
            pathname.substring(last_slash + 1) + '.json'
        ];
        hit = false;
        files.forEach(function(f){
            var full_path = dir + '/' + f;
            if(!hit && fs.existsSync(full_path)) {
                utils.make_response(resp, full_path);
                hit = true;
            }
        });
        if(!hit) {
            next();
        }
    }
};

