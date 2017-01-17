var chokidar = require('chokidar');
var fs = require('fs');
var path = require('path');
var debug = require('debug')('sb:config_wrapper');
var utils = require('./utils');

exports.initConfig = initConfig;

function initConfig (file){
    var buildfile = path.resolve(file || process.env.BUILDFILE || './build.json');
    var mode = process.env.NODE_ENV;
    var data;
    try {
        data = JSON.parse(utils.readfile(buildfile));
    } catch(e) {
        throw new Error("加载配置文件失败：" + e.message);
    }
    exports.server = data.server;
    exports.backend = data.backend;
	if(!mode) {
		mode = process.env.NODE_ENV = "development";
	}
    Object.assign(exports, data[mode === 'build' ? 'development' : mode]);
    process.chdir(path.dirname(file));
	if(mode === "development") {
		debug("init watcher ...");
		initWatcher(buildfile);
	}
	if(exports.dynamic_assets) {
		exports.dynamic_assets = DynamicAsset.fromConfig(exports.dynamic_assets);
	}
}

function initWatcher(buildfile){
	var watcher = chokidar.watch([buildfile], {
		usePolling: process.platform === "linux"
	});

	watcher.on('change', function(file){
		var stack = DynamicAsset._stack;
		var data;
		if(file === buildfile) {
			try {
				data = JSON.parse(utils.readfile(buildfile));
			} catch(e) {
				throw new Error("加载配置文件失败：" + e.message);
			}
			DynamicAsset.reset();
			// 仅仅调整此字段
			exports.dynamic_assets = DynamicAsset.fromConfig(data.development.dynamic_assets);
			return;
		}
		stack.forEach(function(arr){
			var input = arr[0], fn = arr[1];
			if(input.indexOf(file) !== -1) {
				try {
					fn();
				} catch(e) {
					console.error("未处理的错误：", e.message);
					console.error(e.stack);
				}
			}
		});
	});
	// 暂时不处理文件被删除
	watcher.on('unlink', function(){});
	DynamicAsset._watcher = watcher;
}

var TYPE_ALIAS = {
	htm: 'html',
	javascript: 'js'
};

function DynamicAsset(options) {
	var input = options.input;
	var output = options.output;
	var type;
	if(!input) {
		throw new Error("找不到 input");
	}
	if(!output) {
		debug("warning: 没有 output");
	}
	if(!Array.isArray(input)) {
		input = [input];
	}
	input.forEach(function(file){
		var stat, error;
		try {
			stat = fs.lstatSync(file);
			if(!stat.isFile()) {
				error = new Error("input error: 不是文件 " + file);
			}
		} catch(e) {
			error = e;
		}
		if(error) {
			throw error;
		}
	});
	type = path.extname(input[0]).substring(1).toLowerCase();
	if(TYPE_ALIAS.hasOwnProperty(type)) {
		type = TYPE_ALIAS[type];
	}
	this.type = type;
	this._lib = require('./lib/' + type);
	this.input = input.map(function(file){
		return path.resolve(file);
	});
	this.output = output;
	this.output_minify = options.output_minify;
	if(type === "js") {
		utils.copyAttributes(['es6', 'commonjs'], this, options);
	} else if(type === "css") {
		utils.copyAttributes(['rebase'], this, options);
	} else if(type === "html") {
		// 当前没有要复制的属性
	}
	utils.copyAttributes(['url'], this, options);
	if(process.env.NODE_ENV === "development") {
		DynamicAsset.watch(this.input, function(){
			this.buildCache();
		}.bind(this));
		this.buildCache();
	}
}

DynamicAsset.prototype.getType = function(){
	return this.type;
};

DynamicAsset.prototype.canRoute = function(){
	if(this.url) {
		if(this.output) {
			return true;
		} else {
			if(this.type === "html") {
				return true;
			}
		}
	}
	return false;
};

DynamicAsset.prototype.canMinify = function(){
	return !!this.output_minify;
};

DynamicAsset.prototype.buildCache = function(){
	var asset = this;
	var lib = asset._lib;
	debug("build cache for: " + this.url);
	lib.buildInMemory(this).then(function(cache){
		asset._lastCache = cache.code;
		asset._lastCacheTime = Date.now();
		debug("build cache success!!!");
	}).catch(function(e){
		console.error("build cache error:", e.message);
		debug(e.stack);
	});
};

DynamicAsset.prototype.minify = function(){};

DynamicAsset.prototype.onRequest = function(req, resp){
	var pathname = req.path, time;
	if(pathname === this.url) {
		time = req.get('if-modified-since') || -1;
		// 说明：如果浏览器端禁用了缓存，将看不到缓存的效果
		if(this._lastCacheTime > time) {
			resp.set('Last-Modified', new Date(this._lastCacheTime));
			resp.type(this.type);
			resp.end(this._lastCache);
		} else {
			resp.status(304).end();
		}
		return false;
	}
};

DynamicAsset.prototype.onFileChange = function(file){
	debug("file changed:", file);
	this.buildCache();
};

DynamicAsset._stack = [];

DynamicAsset.fromConfig = function(config){
	if(Array.isArray(config)) {
		return config.map(function(o){
			return new DynamicAsset(o);
		});
	} else {
		return [new DynamicAsset(config)];
	}
};

DynamicAsset.watch = function(input, callback){
	var stack = DynamicAsset._stack;
	var watcher = DynamicAsset._watcher;
	watcher.add(input);
	stack.push([input, callback]);
};

DynamicAsset.reset = function(){
	var stack = DynamicAsset._stack;
	var watcher = DynamicAsset._watcher;
	stack.forEach(function(arr){
		var input = arr[0];
		input.forEach(function(file){
			watcher.unwatch(file);
		});
	});
	DynamicAsset._stack = [];
};
