var express = require('express');
var path = require('path');
var http = require('http');
var fs = require('fs');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var colors = require('colors');

var app = express();
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
    res.end([
		'<h1 style="color:red;">Error: ',
		err.message,
		'</h1>',
        err.stack.replace(/\n/g, '<br/>')
	].join(''));
});

module.exports = app;
module.exports.start = function(config){
	var server_options, host, port, mode;
	mode = app.get('env');
	try {
	    router.init(config, mode);
	} catch(e) {
		console.log(e.message.red);
		console.log(e.stack.red);
		process.exit();
	}
	server_options = config.server || {};
	host = server_options.host || '127.0.0.1';
	port = server_options.port || 8080;
	http.createServer(app).listen(port, host);
	console.log("[%s] server started at: http://%s:%d".green, mode, host, port);
};

