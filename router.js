var path = require('path');
var fs = require('fs');

var express = require('express');
var debug = require('debug')('sb:router')
var router = express.Router();

var utils = require('./utils');
var watch = require('./watcher');


module.exports = router;

router.init = function(config, mode){
    // 本地静态文件
    if(mode === "production") {
		// 部署模式下仅仅代理 html 文件
		config.tasks.forEach(function(task){
			var type = path.extname(task.output_minify);
			if(type === ".html") {
				add_dist_route(task);
			}
		});
        router.use(config.css_url_prefix, express.static(config.css_dist_root));
        router.use(config.js_url_prefix, express.static(config.js_dist_root));
    } else {
		// 监听文件变化，重新缓存
		watch(config);
		// 开发模式下代理脚本，样式表和 html 文件
		config.tasks.forEach(add_dev_route);
        router.use(config.css_url_prefix, express.static(config.css_dev_root));
        router.use(config.js_url_prefix, express.static(config.js_dev_root));
    }
    // ajax 请求映射请求
    router.use(ajax2local(path.dirname(config.configfile)));
};


function ajax2local(root) {
    root = path.resolve(root);
    return function(req, resp, next){
        var dir = 'ajax' + req.path, file, last_slash;
        dir = path.join(root, dir.trim());
        if(dir.endsWith('/')) {
            dir = dir.substring(0, dir.length - 1);
        }
        last_slash = dir.lastIndexOf('/');
        file = dir.substring(0, last_slash) + '/' + req.method.toLowerCase() + '-' + dir.substring(last_slash + 1) + '.json';
        if(fs.existsSync(file)) {
            return utils.make_response(resp, file);
        }
        file = dir + '.json';
        if(fs.existsSync(file)) {
            return utils.make_response(resp, file);
        }
        next();
    };
}


function add_dev_route(task){
	router.get(task.route, function(req, resp) {
		var time = req.get('if-modified-since') || -1;
		var type = path.extname(task.output || task.output_minify);
		// 说明：如果浏览器端禁用了缓存，将看不到缓存的效果
		if(task.last_cache_time > time) {
			resp.set('Last-Modified', new Date(task.last_cache_time));
			resp.type(type);
			resp.end(task.output_cache);
		} else {
			resp.status(304).end();
		}
	});
}

function add_dist_route(task) {
	router.get(task.route, function(req, resp){
		resp.sendFile(task.output_minify);
	});
}
