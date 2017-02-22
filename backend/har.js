var path = require('path');
var fs = require('fs');
var parseUrl = require('url').parse;
var debug = require('debug')('sb:backend:har')

var utils = require('../utils');
// 导出为 middleware

module.exports = function(options){
    var prefix, harfile;
    if(typeof options === "string") {
        harfile = options;
        prefix = '/';
    } else {
        prefix = options.prefix || '/';
        harfile = options.file;
    }
	if(!fs.lstatSync(harfile).isFile()) {
		throw new Error("backend error:\ninvalid harfile: " + harfile);
	}
	var cache = getEntries(harfile);
	if(cache === null) {
		console.error("warning: empty entries!");
		cache = [];
	}
    return function(req, resp, next){
		var matched = [];
		var pathname = req.path;
		cache.forEach(function(item){
			if(item.url.indexOf(pathname) > -1) {
				matched.push(item);
			}
		});
		if(matched.length > 1) {
			matched = matched.filter(function(item){
				if(item.method !== req.method) {
					return false;
				}
				if(Array.isArray(item.query)) {
					var pass = true;
					item.query.forEach(function(arg){
						if(arg.value !== req.query[arg.name]) {
							pass = false;
						}
					});
					return pass;
				}
				return true;
			});
		}
		if(matched.length > 0) {
			matched = matched[0];
			resp.status(matched.status);
			resp.set('Content-Type', matched.mimeType);
			resp.end(matched.data);
		} else {
			resp.status(404).end("Not Found");
		}
    }
};

function getEntries(harfile) {
	var entries;
	try {
		entries = JSON.parse(fs.readFileSync(harfile, 'utf-8')).log.entries;
		return entries.map(function(entry){
			var request = entry.request;
			var response = entry.response;
			var url = parseUrl(request.url).path;
			return {
				url: url,
				method: request.method,
				status: response.status,
				mimeType: response.content.mimeType,
				data: new Buffer(response.content.text, response.content.encoding || 'utf-8')
			};
		});
	} catch(e) {
		console.error("unhandled error:", e);
	}
	return null;
}
