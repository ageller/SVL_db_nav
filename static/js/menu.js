//these functions create the buttons that allow the user to choose different categories

function populateMenu(){
//create the menu with all the buttons, based on all the unique categories

	var menu = d3.select('#objectMenu');
	params.categories.forEach(function(key){
		var id = key.replace(/\s/g, '');
		menu.append('div')
			.attr('class','buttonMenu subTitle buttonDiv ')
			.attr('id',id)
			.style('cursor','pointer')
			.style('margin-left', '20px')
			.style('width',params.windowWidth/3. - 50. + 'px')
			.style('padding-top','20px')
			.style('padding-bottom','20px')
			.style('float','left')
			.text(key)
			.on('click', function(e){
				//show/hide objects
				params.playlistKey = this.innerHTML;
				createPlaylist();
				showHideMenu();
				//highlight the  button
				d3.selectAll('.buttonMenu').classed('buttonDivActive',false)
				d3.select(this).classed('buttonDivActive', true)


			})

	});

	//resize them to all be the same height
	var h = 0;
	d3.selectAll('.buttonMenu').each(function(d) {
		var hh = this.getBoundingClientRect().height;
		if (hh > h) h = hh;
	});
	d3.selectAll('.buttonMenu').style('height', h-40. + 'px'); //-40 because of padding


	d3.select('#objectMenu')
		.style('left',params.windowWidth)
		.style('width',params.windowWidth)


	//set the rest of the div sizes
	resizeDivs();

	//highlight the starting menu
	d3.select('#'+params.playlistKey.replace(/\s/g, '')).classed('buttonDivActive', true)

}


function showHideMenu(){
//show of hide the menu.  This is connected to the hamburger symbol in the upper right of the page.

	params.showingMenu = !params.showingMenu;

	if (params.showingMenu){
		params.menuLeft = 0;
	} else {
		params.menuLeft = params.windowWidth;
	}

	d3.select('#showMenuButton').node().classList.toggle("change");

	d3.select('#objectMenu').transition().duration(400).style('left',params.menuLeft + 'px');

}