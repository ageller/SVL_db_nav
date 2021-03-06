//these functions are used to resize the divs on load and if the user resizes the window 
//this will also recreate the playlist for the given category so that everything aligns properly

function getShowingHeight(){
	var h = parseFloat(d3.select('#nowShowing').style('padding-top'));
	var bb = d3.select('#showingStubContainer').node().getBoundingClientRect();
	h += bb.height;
	h += parseFloat(d3.select('#showingStubContainer').style('padding-bottom'));

	return h;
}

function resizeDivs(){
	params.windowWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
	params.windowHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

	// set all the sizes
	console.log('resizing...')

	d3.select('#playlistDiv')
		.style('left','0px')
		.style('top','0px')
		.style('width',params.windowWidth + 'px')
		.style('height',params.windowHeight + 'px')

	//var h1 = d3.select('#nowShowing').node().getBoundingClientRect().height;
	var h1 = getShowingHeight();
	var top = d3.select('#playlist').node().getBoundingClientRect().top;
	d3.select('#nowShowing')
		.style('height',(params.windowHeight - top) + 'px')
		.style('top',(params.windowHeight - h1) + 'px');


	var h2 = params.windowHeight - h1;
	d3.select('#objectMenu')
		.style('left',params.menuLeft + 'px')
		.style('width',params.menuWidth - 4 + 'px')//to account for 2px border
		.style('height',h2 - 4 - 40 + 'px')//to account for 2px border and padding on top

	d3.select('#objectMenu').selectAll('.buttonDiv')
		.style('width',params.windowWidth/3. - 50. + 'px')



	if (params.availablePlaylists.length > 1){
		//top tab bar
		//d3.selectAll('.buttonPicker').style('width',(params.windowWidth/params.availablePlaylists.length - 10*(params.availablePlaylists.length - 1)) + 'px');
		d3.selectAll('.buttonPicker').style('width',(params.windowWidth/params.availablePlaylists.length) + 'px');
		var h3 = d3.select('.buttonPicker').node().getBoundingClientRect().height;
		d3.select('#objectMenu').style('height', h2 - h3 - 4 - 40 + 'px');
		d3.select('#playlistDiv').style('top', h3 + 'px'); 
	}

	if (params.presenter){
		d3.select('#nowShowingExpander')
			.on('click', showHideExpander)
			.classed('hidden',params.activePlaylist == 'WWT');
		d3.select('#VLCcontrols').classed('hidden',params.activePlaylist == 'WWT');
	} else {
		d3.select('#nowShowingExpander').classed('hidden',true);
		d3.select('#VLCcontrols').classed('hidden',true);
	}

	createPlaylist();
}



