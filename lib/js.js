var UglifyJS = require('uglify-js');
var browserify = require('browserify');
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
}
