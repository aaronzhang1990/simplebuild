var glob = require('glob');

exports.expandFiles = expandFiles;

exports.arrayBuild = function(fn){
	return function(arr){
		return arrayBuild(arr, fn);
	};
};

function arrayBuild(arr, buildFn) {
	var index = 0, finalResult = true;
	if(!Array.isArray(arr)) {
		arr = [arr];
	}
	return buildFn(arr[index]).then(function(result){
		finalResult = finalResult && result;
		if(index + 1 < arr.length) {
			return buildFn(arr[++index]);
		}
		return finalResult;
	});
}

function expandFiles(input) {
	var files = [];
	if(!Array.isArray(input)) {
		input = [input];
	}
	input.forEach(function(f){
		var has = glob.hasMagic(f, {noext: true, nobrace: true});
		var gfiles;
		if(has) {
			gfiles = files.concat(glob.sync(f, {}));
			gfiles.forEach(function(gf){
				if(files.indexOf(gf) === -1) {
					files.push(gf);
				}
			});
		} else {
			if(files.indexOf(f) === -1) {
				files.push(f);
			}
		}
	});
	return files;
}
