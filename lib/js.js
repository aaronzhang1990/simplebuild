var UglifyJS = require('uglify-js');
var browserify = require('browserify');
var es6ify = require('es6ify');
var path = require('path');
var fs = require('fs');

var utils = require('../utils');

exports.build = utils.arrayBuild(build);

/*
 *
 * @params config.input
 * @params config.output
 * @params config.commonjs
 * @params config.es6
 * @return Promise
 */
function build(config){
	var input = utils.expandFiles(config.input);
	var output = config.output, ps;
	if(config.commonjs) {
		ps = input.map(function(f){
			return bundle(f, config.es6);
		});
	} else {
		ps = input.map(function(f){
			return readp(f, config.es6);
		});
	}
	return Promise.all(ps, function(results){
		if(typeof config.callback === "function") {
			config.callback(joincode(results));
		} else {
			fs.writeFileSync(output, joincode(results));
		}
	});
}

function readp(input, es6) {
	return new Promise(function(resolve, reject){
		fs.readFile(input, function(err, buf){
			if(err) {
				reject(err);
			} else {
				// TODO: if es6 === true, transform code to es5
				resolve(buf);
			}
		});
	});
}

function bundle(input, es6) {
	var b = browserify(input, {});
	if(es6) {
		b.add(es6ify.runtime);
		b.transform(es6ify);
	}
	return new Promise(function(resolve, reject){
		b.bundle(function(err, buf){
			if(err) {
				reject(err);
			} else {
				resolve(buf);
			}
		});
	});
}

function joincode(names, arr) {
	var code = [];
	arr.forEach(function(buf, i){
		code.push('\n/////////////  ' + names[i] + '\n');
		if(Buffer.isBuffer(buf)) {
			code.push(buf.toString());
		} else {
			code.push(buf);
		}
	});
	return code.join('');
}
