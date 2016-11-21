var express = require('express');
var path = require('path');
var http = require('http');
var fs = require('fs');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var app = express();
var utils = require('./utils');
var router = require('./router');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// 默认情况，先检测请求是否有对应的路由，如果没有将请求映射到本地文件
app.use(router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json({
        message: err.message,
        error: err
    });
});

module.exports = app;
module.exports.start = function(cfgfile){
	var config, server_options;
    process.chdir(path.dirname(cfgfile));
	config = utils.load_config(cfgfile);
	config.configfile = cfgfile;
    router.watch(config, app.get('env'));
	server_options = config.server || {host: '127.0.0.1', port: 6666};
	http.createServer(app).listen(server_options.port, server_options.host);
	console.log("server started at: http://%s:%d", server_options.host, server_options.port);
};

