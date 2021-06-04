//This is run when the page loads and is responsible for reading in all the data and initiating the calls to 
//other functions (in other files) that build the DOM elements to flesh out the app.  
//This file also adds some useful additional functionality to D3 selections and the standard Javascript Arrays. 
//I think not all of the initial functions are used in the code currently, but they may be helpful later, so I will keep them

//add some functionality to d3 selections
d3.selection.prototype.first = function() { 
	return d3.select(this.nodes()[0]); 
}; 
d3.selection.prototype.second = function() { 
	return d3.select(this.nodes()[1]); 
}; 
d3.selection.prototype.last = function() {
//https://stackoverflow.com/questions/25405359/how-can-i-select-last-child-in-d3-js
	var last = this.size() - 1;
	return d3.select(this.nodes()[last]); 
}; 

//add some functionality to the standard javascript Array
Array.prototype.remove = function() {
//https://stackoverflow.com/questions/3954438/how-to-remove-item-from-array-by-value
	var what, a = arguments, L = a.length, ax;
	while (L && this.length) {
		what = a[--L];
		while ((ax = this.indexOf(what)) !== -1) {
			this.splice(ax, 1);
		}
	}
	return this;
};
Array.prototype.contains = function(v) {
	for (var i = 0; i < this.length; i++) {
	if (this[i] === v) return true;
	}
	return false;
};

Array.prototype.unique = function() {
//https://stackoverflow.com/questions/11246758/how-to-get-unique-values-in-an-array
	var arr = [];
	for (var i = 0; i < this.length; i++) {
	if (!arr.contains(this[i])) {
		arr.push(this[i]);
	}
	}
	return arr;
}

function superEncodeURI(url) {
//add URI encoding so that all characters can be interpreted properly
//https://stackoverflow.com/questions/44429173/javascript-encodeuri-failed-to-encode-round-bracket

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

function parseRGBA(input){
//interpret a CSS RGBA color and return it as an Array
//https://stackoverflow.com/questions/11068240/what-is-the-most-efficient-way-to-parse-a-css-color-in-javascript
	m = input.match(/^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+\.\d+)\s*\)/i);
	if (m) {
		return [m[1],m[2],m[3],m[4]];
	}
}


//When the user clicks anywhere on the screen I will resent the timeout for the instructions screen
//Note also that when the instructions screen comes on, the VLC and WorlWide Telescope servers start a randomized show
//window.addEventListener('touchstart', resetInstructionsTimeout);
window.addEventListener('click', resetInstructionsTimeout);


function getPlaylistData(p){
//return data for each specific playlist so that I can keep the rest of the code more general
//Note that the csv files are not included on GitHub
	out = {}
	out.id = 'playlist'
	switch(p){
		case 'Movies2D':
			//out.id = 'playlistMovies2D';
			out.dataFile = 'static/data/private/allMovies2D.csv';
			out.data = params.Movies2Ddata;
			out.color = '#29FF5E';
			break;
		case 'Movies3D':
			//out.id = 'playlistMovies3D';
			out.dataFile = 'static/data/private/allMovies3D.csv';
			out.data = params.Movies3Ddata;
			out.color = '#F75454';
			break;
		case 'WWT':
			//out.id = 'playlistWWT';
			out.dataFile = 'static/data/private/allWWTObjects.csv';
			out.data = params.WWTdata;
			out.color = '#FFCE34';
			break;
		case 'Uniview':
			//out.id = 'playlistWWT';
			out.dataFile = null;
			out.data = null;
			out.color = '#7651FE';
			break;
		default:
			out.dataFile = null;
			out.data = null;
			out.color = '#FFFFFF';
	}

	return out
}

///////////////////////////
// runs on load, called from index.html
///////////////////////////
function init(inp) {
	input = JSON.parse(inp);
	console.log('input', inp, input);

	params.availablePlaylists = input.playlist;
	if ('presenter' in input) params.presenter = input.presenter;
	if ('tabNames' in input) params.tabNames = input.tabNames;
	if ('name' in input) params.appName = input.name;

	params.activePlaylist = params.availablePlaylists[0];

	if (params.availablePlaylists.length > 1){
		console.log('Have multiple playlists', params.availablePlaylists);
		createPlaylistPicker();
	}

	var titleAddon = params.availablePlaylists[0];
	if (params.presenter) titleAddon = 'Presenter';

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

	//when the window resizes, call my resize function
	d3.select(window).on("resize", resizeDivs);

	//when the user clicks the hamburger symbol, show or hide the menu that shows the different categories
	d3.select('#showMenuButton').on('click',showHideMenu);



	//set up promised that will read in the data
	const readPromises = []
	params.availablePlaylists.forEach(function(d,i){
		var v = getPlaylistData(d);
		if (v.dataFile)	readPromises.push( new Promise(function(resolve, reject) {d3.csv(v.dataFile).then(resolve)}) );
	})

	//first get the server information
	new Promise(function(resolve, reject) {
		d3.json('static/data/private/serverInfo.json').then(function(info){

			params.server = info.server;
			params.movieLocationPrefix = info.movieLocationPrefix;
			params.namespace = info.namespace;
			params.socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + params.namespace);

			//set up the web sockets
			connectSocket();

			//now read in all the available objects and movies and compile the different categories
			Promise.all(readPromises).then(function(data0) {
				new Promise(function(resolve, reject) {
					if (data0.length > 0) {
						resolve(compileCategoriesFromCSV(data0));
					} else {
						resolve()
					}
				}).then(function(data1){
					console.log('have compiled data', data1);
					params.availablePlaylists.forEach(function(d,i){
						var v = getPlaylistData(d);
						if (v.data){
							v.data.sorted = data1[i].sorted;
							v.data.raw = data1[i].raw;
						}
					});
					//populate the menu with all the categories
					populateMenu();

					//create the active playlist
					createPlaylist();

					//start the randomized presentation for the active playlist (unless in presenter mode)
					if (!params.presenter) randomize();
				})
			});


		})

	}) ;





}
