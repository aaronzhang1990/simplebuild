var path = require('path');
var fs = require('fs');

var express = require('express');
var debug = require('debug')('sb:router')
var router = express.Router();

var utils = require('./utils');
var config = require('./config_wrapper');

init(process.env.NODE_ENV);

module.exports = router;

function init(mode){
    var url, localpath, stat;
    // 动态缓存路由
    if(mode === "development" && config.dynamic_assets) {
		router.use(function(req, resp, next){
			var assets = config.dynamic_assets;
			var find = false;
			assets.forEach(function(asset){
				if(!find && asset.canRoute()) {
					var ret = asset.onRequest(req, resp);
					if(ret === false) {
						find = true;
						return false;
					}
				}
			});
			if(!find) {
				next();
			}
		});
    }
    // 静态配置的路由
    for(url in config.urlmaps) {
        localpath = path.resolve(config.urlmaps[url]);
		debug("prepare route `" + url + "` for localpath: " + localpath);
        stat = fs.lstatSync(localpath);
        if(stat.isFile()) {
            router.get(url, createFileHandler(localpath));
        } else if(stat.isDirectory()) {
            router.use(url, express.static(localpath));
        } else {
            debug("stat 错误，忽略 " + url);
        }
    }
    /**
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
    */
};

function createFileHandler(file) {
    return function(req, resp){
        resp.sendFile(file);
    };
}

