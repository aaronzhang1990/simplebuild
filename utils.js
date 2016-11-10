
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

function expandFiles() {
	//
}
