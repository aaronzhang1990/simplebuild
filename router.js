var path = require('path');
var fs = require('fs');

var express = require('express');
var chokidar = require('chokidar');
var Mock = require('mockjs');
var router = express.Router();

var utils = require('./utils');
var watcher = start_watcher();
var configfile;


module.exports = router;

// 为了让程序简单点，不监听 cfgfile 发生的变化
// 这意味着，如果 cfgfile 发生了变化，必须重启开发服务器
router.watch = function(cfgfile, mode){
    if(configfile) {
        console.error("can't call watch() twice, ignore ...");
        return;
    }
    configfile = cfgfile;
    var config = utils.load_config(cfgfile);
    // 本地静态文件
    if(mode === "production") {
        router.use(config.css_url_prefix, express.static(config.css_dist_root));
        router.use(config.js_url_prefix, express.static(config.js_dist_root));
    } else {
        router.use(config.css_url_prefix, express.static(config.css_dev_root));
        router.use(config.js_url_prefix, express.static(config.js_dev_root));
    }
    // 动态更新的静态文件
    config.tasks.forEach(function(task){
        if(!task.route) { return; }
        add_route(task);
    });
    // ajax 请求映射请求
    router.use(ajax2local(path.dirname(cfgfile)));
};

function start_watcher() {
    var watcher = chokidar.watch([]);
    watcher.on('change', update_cache);
    return watcher;
}

function update_cache(path) {
    if(path === configfile) {}
    // 如果是 cfgfile 发生变化，重新读取 cfgfile
    // 如果读取失败，比如因为格式问题，忽略掉
    // 如果读取成功，计算与之前的差异
    //
    // 如果是某个 input 重新生成 output
}

function ajax2local(root) {
    root = path.resolve(root);
    return function(req, resp, next){
        var dir = 'ajax' + request.path, file, last_slash;
        dir = path.join(root, dir.trim());
        if(dir.endsWith('/')) {
            dir = dir.substring(0, dir.length - 1);
        }
        last_slash = dir.lastIndexOf('/');
        file = dir.substring(0, last_slash) + '/' + req.method.toLowerCase() + '-' + dir.substring(last_slash + 1) + '.json';
        if(fs.existsSync(file)) {
            return make_response(resp, file);
        }
        file = dir + '.json';
        if(fs.existsSync(file)) {
            return make_response(resp, file);
        }
        next();
    };
}

function make_response(resp, file) {
    var content = utils.readfile(file);
    resp.json(Mock.mock(JSON.parse(content)));
}


function add_route(task) {
    var output_cache;
    var last_update_time = -1;
    watch_file_change(task.input, function(){});
    // 第一次请求时，手动触发 on_file_change 获得 output 并缓存
    // 文件发生变更时，更新缓存
    router.get(task.route, function(req, resp){});
}

function watch_file_change(input, callback) {}
