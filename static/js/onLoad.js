//https://stackoverflow.com/questions/25405359/how-can-i-select-last-child-in-d3-js
d3.selection.prototype.first = function() { 
	return d3.select(this.nodes()[0]); 
}; 
d3.selection.prototype.second = function() { 
	return d3.select(this.nodes()[1]); 
}; 
d3.selection.prototype.last = function() {
	var last = this.size() - 1;
	return d3.select(this.nodes()[last]); 
}; 
//https://stackoverflow.com/questions/3954438/how-to-remove-item-from-array-by-value
Array.prototype.remove = function() {
	var what, a = arguments, L = a.length, ax;
	while (L && this.length) {
		what = a[--L];
		while ((ax = this.indexOf(what)) !== -1) {
			this.splice(ax, 1);
		}
	}
	return this;
};

//https://stackoverflow.com/questions/44429173/javascript-encodeuri-failed-to-encode-round-bracket
//to fix the parentheses, but I may need to fix others!
function superEncodeURI(url) {

	var encodedStr = '', encodeChars = ["(", ")", "&", ",", "!"];
	url = encodeURI(url);

	for(var i = 0, len = url.length; i < len; i++) {
		if (encodeChars.indexOf(url[i]) >= 0) {
			var hex = parseInt(url.charCodeAt(i)).toString(16);
			encodedStr += '%' + hex;
		} else {
			encodedStr += url[i];
		}
	}

	// console.log("here's the uri",url)
	return encodedStr;
}

//https://stackoverflow.com/questions/11068240/what-is-the-most-efficient-way-to-parse-a-css-color-in-javascript
function parseRGBA(input){
	m = input.match(/^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+\.\d+)\s*\)/i);
	if (m) {
		return [m[1],m[2],m[3],m[4]];
	}
}

//https://stackoverflow.com/questions/11246758/how-to-get-unique-values-in-an-array
Array.prototype.contains = function(v) {
	for (var i = 0; i < this.length; i++) {
	if (this[i] === v) return true;
	}
	return false;
};

Array.prototype.unique = function() {
	var arr = [];
	for (var i = 0; i < this.length; i++) {
	if (!arr.contains(this[i])) {
		arr.push(this[i]);
	}
	}
	return arr;
}

//window.addEventListener('touchstart', resetInstructionsTimeout);
window.addEventListener('click', resetInstructionsTimeout);


function getPlaylistData(p){
	out = {}
	out.id = 'playlist'
	if (p == 'Movies2D'){
		//out.id = 'playlistMovies2D';
		out.dataFile = 'static/data/private/allMovies2D.csv';
		out.data = params.Movies2Ddata;
		out.color = '#29FF5E';
	}
	if (p == 'Movies3D'){
		//out.id = 'playlistMovies3D';
		out.dataFile = 'static/data/private/allMovies3D.csv';
		out.data = params.Movies3Ddata;
		out.color = '#F75454';
	}
	if (p == 'WWT'){
		//out.id = 'playlistWWT';
		out.dataFile = 'static/data/private/allWWTObjects.csv';
		out.data = params.WWTdata;
		out.color = '#FFCE34';
	}

	return out
}

///////////////////////////
// runs on load
///////////////////////////
function init(inp) {
	input = JSON.parse(inp);
	console.log('input', inp, input);

	params.availablePlaylists = input.playlist;
	params.presenter = input.presenter;
	params.activePlaylist = params.availablePlaylists[0];

	if (params.availablePlaylists.length > 1){
		console.log('Have multiple playlists', params.availablePlaylists);
		createPlaylistPicker();
	}

	var titleAddon = params.availablePlaylists[0];
	if (params.presenter) {
		titleAddon = 'Presenter';
	} 

	//get specific values based on the playlist type
	vals = getPlaylistData(params.activePlaylist);
	console.log('Values for ', params.activePlaylist, vals);

	//set the color
	document.documentElement.style.setProperty('--title-color', vals.color);
	document.documentElement.style.setProperty('--button-background-color', vals.color);
	//set the page title
	document.title = document.title + ' ' + titleAddon;

	populateInstructions();

	if (params.availablePlaylists.includes('Movies2D') || params.availablePlaylists.includes('Movies3D')){
		console.log('============= setting up VLC')
		setupVLCcontrols();
	}

	d3.select(window).on("resize", resizeDivs);

	d3.select('#showMenuButton').on('click',showHideMenu);



	//read in the data and compile the categories

	const readPromises = []
	params.availablePlaylists.forEach(function(d,i){
		var v = getPlaylistData(d);
		readPromises.push( new Promise(function(resolve, reject) {d3.csv(v.dataFile).then(resolve)}) );
	})

	//get the server information
	new Promise(function(resolve, reject) {
		d3.json('static/data/private/serverInfo.json').then(function(info){

			console.log('==info', info)
			params.server = info.server;
			params.movieLocationPrefix = info.movieLocationPrefix;
			params.namespace = info.namespace;
			params.socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + params.namespace);
			connectSocket();

			Promise.all(readPromises).then(function(data0) {
				new Promise(function(resolve, reject) {
					resolve(compileCategoriesFromCSV(data0));
				}).then(function(data1){
					console.log('have compiled data', data1);
					params.availablePlaylists.forEach(function(d,i){
						var v = getPlaylistData(d);
						v.data.sorted = data1[i].sorted;
						v.data.raw = data1[i].raw;
					});
					populateMenu();
					createPlaylist();
					if (!params.presenter) randomize();
				})
			});


		})

	}) ;





}
