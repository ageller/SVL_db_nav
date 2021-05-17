function createPlaylist(){

	var vals = getPlaylistData(params.activePlaylist);

	console.log('playlist', params.activePlaylist, params.playlistKey, vals.data)

	document.documentElement.style.setProperty('--title-color', vals.color);
	document.documentElement.style.setProperty('--button-background-color', vals.color);


	var input = vals.data.sorted[params.playlistKey];

	d3.select('#playlistLabel').html("");
	d3.select('#playlist').html("");

	d3.select('#playlistLabel').append('div')
		.attr('class','title')
		.text(params.playlistKey);

	var playlist = d3.select('#'+vals.id)

	if (!input) input = [];

	//now make the table
	//will need to size this based on window, and add this to resize
	if (input[0]){
		var tabFinished = false;
		var foo = makeTable(input, playlist)
		var tab = foo[0];
		tabFinished = foo[1];
		d3.selectAll('.playlistItem'+playlist.attr('id'))
			.on('click', function(){
				showIndex(parseInt(d3.select(this).node().dataset.index));
			})

		var intv = window.setInterval(function(){
			if (tabFinished) {
				clearInterval(intv);
				resizeTable(tab);

				if (params.activePlaylist.includes('Movies')){
					getVLCstatus();
					getVLCplaylist();
					startVLCloop();
					getVLCcurrent();
				} 
				if (params.activePlaylist == 'WWT'){
					populateShowing();
					stopVLCloop();
				}

			}
		},100)

	}


}


function formatInfo(d){
	//add the name and notes
	var notes = '';

	if (d['name']) notes = '<span class="hoverCellTitle"><b>' + d['name'] +'</b></span>';
	notes += '<br/><span class="hoverCellContent">'

	if (d['Notes']) notes += '<b>Description:</b> ' + d['Notes'];
	if (!d['Notes']) console.log('!! NO NOTES', d)

	params.headers.forEach(function(h,i){
		var txt = ''
		if (d[h]) txt = d[h];
		if (h == 'Distance'){
			if (d['Distance']){
				txt = d['Distance'];
				if (txt.indexOf('Wikipedia') != -1) txt = '';
			} 
		}
		if (h == 'Size'){
			txt = txt.replace('arcminutes', 'arcmin')
		}
		if (txt != '') notes += '<br/><b>'+h+':</b> '+txt
	})
	//if (d['wikipedia'])	notes = notes + '  <a href="' + d['wikipedia'] + '" target="_blank">Wikipedia</a>'

	notes += "</span>"
	return notes;
}

function highlightIndex(id){


	//first reset all highlighting
	var elem1 = d3.select('#' + id);
	if (elem1.node()){
		elem1.selectAll('.hoverCell').classed('hoverCellActive', false);
		elem1.selectAll('.hoverCellOther').classed('hoverCellOtherActive', false);
	}

	if (params.nowShowing[params.activePlaylist]){
		if ('index' in params.nowShowing[params.activePlaylist]){
			var index = params.nowShowing[params.activePlaylist].index;
			if (index){
				//highlight the correct box
				var elem2 = d3.select('#'+id).select('.dataIndex'+ index);
				if (elem2.node()){
					if (elem2.classed('hoverCell')){
						elem2.classed('hoverCellActive', true);
					}
					if (elem2.classed('hoverCellOther')){
						elem2.classed('hoverCellOtherActive', true);
					}
				}
			}

		}

	}



}

function showIndex(index){
	var vals = getPlaylistData(params.activePlaylist);

	params.nowShowing[params.activePlaylist] = vals.data.raw[index];

	if (params.activePlaylist == 'WWT') {
		flyWWT(params.nowShowing.WWT.WWTurl);
		populateShowing(); 
	}

	//populateShowing called within updateVLCplaylist(), which is called after the playlist is returned
	if (params.activePlaylist.includes('Movies')) playSingleVLCmovie(params.nowShowing[params.activePlaylist].movieLocation);
	
}

function populateShowing(){
	var vals = getPlaylistData(params.activePlaylist);

	highlightIndex(vals.id);
	highlightIndex('currentVLCplaylist');

	console.log('now showing', params.nowShowing)
	if (params.nowShowing[params.activePlaylist]){
		var info = formatInfo(params.nowShowing[params.activePlaylist]);
	} else { 
		var tp = 'a movie';
		if (params.activePlaylist == 'WWT') tp = 'an object'
		info = '(Please select ' + tp + ' to view.)';
	}

	var pd = 20;
	if (params.presenter && params.activePlaylist != "WWT") pd = 0;
	d3.select('#nowShowing').style('padding-top',pd + 'px')

	d3.select('#nowShowing').select('.showingContent').html(info)

	var h1 = getShowingHeight();
	var th = (params.windowHeight - d3.select('#playlist').node().getBoundingClientRect().top) - h1 - 20;
	d3.select('#currentVLCplaylist').select('.table-wrapper').style('max-height', th + 'px');
	var t = params.windowHeight - h1;
	if (!params.nowShowingExpanded) d3.select('#nowShowing').transition().duration(300).style('top', t + 'px')


	var h3 = 0
	if (params.presenter) h3 = d3.select('.buttonPicker').node().getBoundingClientRect().height;

	if (params.showingMenu){
		d3.select('#objectMenu').transition().duration(300).style('height',h - h3 - 4 - 40 + 'px')
	} else {
		d3.select('#objectMenu').style('height',t - h3 - 4 - 40 + 'px')
	}
	var rect = d3.select('#playlist').select('.table-wrapper').node().getBoundingClientRect();
	var th = params.windowHeight - rect.top - h1;
	d3.select('#playlist').select('.table-wrapper').transition().duration(300).style('max-height', th + 'px');

	var hide = true;
	if (params.presenter && params.activePlaylist.includes('Movies')) hide = false;
	d3.select('#currentVLCplaylist').classed('hidden', hide);
	
}


function compileCategoriesFromCSV(inp){
	//convert the csv input into the original (json) format that I started writing this code with
	console.log('compiling categories from', inp, [inp.length, inp[0].length]);

	outDict = [];

	inp.forEach(function(input){
		//get the unique categories
		clist = [];
		raw = [];
		index = 0;
		input.forEach(function(d,i){
			if (d.Category.trim() != "") {
				var dt = d;
				dt.index = index;
				input.index = index;
				index += 1;
				raw.push(dt);
			}
			foo = d.Category.split(",");
			foo.forEach(function(x){
				if (x.trim() != ""){
					clist.push(x.trim());
				}

			}) 
		})
		uclist = clist.unique().sort();
		console.log('unique categories', uclist)

		sorted = {}
		uclist.forEach(function(c, i){
			sorted[c] = [];
			input.forEach(function(d){
				if (d.Category.includes(c)){
					use = {};
					use.rawIndex = d.index;
					keys = Object.keys(d);
					keys.forEach(function(k){
						if (k != 'Category'){
							if (k == 'images'){
								use[k] = [d[k]]; //can remove this if I fix the rest of the code
							} else {
								use[k] = d[k];
							}
						}
					})
					sorted[c].push(use)
				}
			});
			var haveCat = false;
			if (params.categories.length == 0) params.categories.push(c)
			params.categories.forEach(function(cc, ii){
				if (c == cc) haveCat = true;
				if (ii == params.categories.length - 1 && !haveCat) params.categories.push(c);
			});
		});
		params.categories = params.categories.unique().sort();
		outDict.push({raw:raw, sorted:sorted})
	})

	return outDict;

}

function makeTable(input, elem, width=null, height=null, fill='default', extraControl=false){

	if (!width){
		width = params.windowWidth - 2; //2 for border (?)
	}
	if (!height){
		var rect = elem.node().getBoundingClientRect();
		var h = d3.select('#nowShowing').node().getBoundingClientRect().height
		height = params.windowHeight - rect.top - h;// - 55; //55 for the header row
	}

	//get the extra
	console.log('table input', input, input[0])
	var tab;
	if (input.length > 0){
		params.headers = Object.keys(input[0]);
		params.headers.remove('WWTurl');
		params.headers.remove('');
		params.headers.remove('Category');
		params.headers.remove('images');
		params.headers.remove('captions');
		params.headers.remove('wikipedia');
		params.headers.remove('movieLocation');
		params.headers.remove('Notes');
		params.headers.remove('name');
		params.headers.remove('uri');
		params.headers.remove('VLCplaylistID');
		params.headers.remove('dir1');
		params.headers.remove('dir2');
		params.headers.remove('dir3');
		params.headers.remove('dir4');
		params.headers.remove('Stereo Mode');
		params.headers.remove('In SVL Database');
		params.headers.remove('File Name');
		params.headers.remove('index');

		//check to make sure that at least one row has data in each header column (otherwise remove the header)
		params.headersClean = [];
		params.headers.forEach(function(h,j){
			use = false;
			input.forEach(function(d, i){
				if (d[h] != null && d[h] != "") use = true;
			});	
			if (use) params.headersClean.push(h);
		});
		params.headers = params.headersClean

		var tab = elem.append('div').attr('class','tableElement')


		tabContent = tab.append('div').attr('class','table-wrapper scrollable tableElement')
			.style('width', width + 'px')
			.style('max-height', height + 'px')
			.append('table');

		//content from database
		input.forEach(function(d, i){
			var row = tabContent.append('tr')
			row.node().dataset.fillStyle = fill;
			row.node().dataset.index = d.index; 
			if (d.hasOwnProperty('movieLocation')) row.node().dataset.movieLocation = d.movieLocation;
			if (d.hasOwnProperty('VLCplaylistID')) row.node().dataset.VLCplaylistID = d.VLCplaylistID;
			row.attr('id',elem.attr('id')+i)
				.attr('class','playlistItem'+elem.attr('id'))
			if (fill == 'default'){
				row.classed('hoverCell', true)
			} else {
				row.classed('hoverCellOther', true)
			}
			col = row.append('td');

			var ecw = 0;
			if (extraControl){
				ecw = 50;
				var extra = col.append('div')
					.attr('class','extraControl tableElement')
					.style('width','50px')
					.style('float','left')
					.append('span')
						.attr('class','material-icons extraControl')
						.text('cancel')
						.on('click',function(){
							removeFromVLCplaylist(this);
						})
				if (d.hasOwnProperty('VLCplaylistID')) extra.node().dataset.VLCplaylistID = d.VLCplaylistID;

			}

			//add the image
			if (d.hasOwnProperty('images')){
				if (d['images'] != null){
					var imgUse = d['images'];
					if (Array.isArray(imgUse)) imgUse = d['images'][0];
					var img = col.append('div')
						.style('float','left')
						.attr('class','playImage tableElement')
						.append('img')
							.attr('src','static/'+imgUse)
							.style('width', params.imageWidth)
							.on('load', function(){
								var hRow = Math.max(row.node().getBoundingClientRect().height, params.minRowHeight);
								var hImg = d3.select(this).node().getBoundingClientRect().height;
								var offset = Math.max((hRow - hImg)/2. - 4, 0.); //I think there's 4px padding somewhere
								d3.select(this)
									.style('margin-top',offset + 'px')
									.style('margin-bottom',offset + 'px');
							})
				}
			}


			var notes = formatInfo(d);

			col.classed('tableElement', true);
			var playNotes = col.append('div')
				.attr('class','playNotes tableElement')
				.style('padding-left',(params.imageWidth + ecw + 20) + 'px')
				.style('padding-top','4px')
				.style('padding-bottom','4px')
				.html(notes); 



			//center the text vertically within the cell
			var hRow = Math.max(row.node().getBoundingClientRect().height, params.minRowHeight);
			var hNotes = playNotes.node().getBoundingClientRect().height;
			var offset = Math.max((hRow - hNotes)/2. - 4, 0.); //I think there's 4px padding somewhere
			playNotes.style('margin-top',offset + 'px').style('margin-bottom',offset + 'px');
			if (extraControl) row.select('.extraControl').select('span').style('line-height',hRow + 'px');

			row.classed('dataIndex' + row.node().dataset.index, true);

		})


	}

	return [tab, true];

}

function resizeTable(tab){
	//resize everything so that the header aligns 

	var wTable = parseFloat(tab.select('.table-wrapper').style('width'));
	
	var wNotes = wTable - params.imageWidth - 34; //margin

	//check if there is a scrollbar
	var dv = tab.select('.table-wrapper').node()
	var vs = dv.scrollHeight > dv.clientHeight;
	if (vs) wNotes -= 6;
			
	//check for the extra controls column
	var extra = tab.select('.extraControl');
	if (extra.node()) wNotes -= (parseFloat(extra.style('width')));

	tab.selectAll('.playNotes').style('width',wNotes +'px')
	
	w = d3.select('#nowShowing').select('.showingTitle').node().offsetWidth
	d3.select('#nowShowing').style('width',params.windowWidth - 40); //40 for margins

}

function getColumnWidth(elem, selection){
	var w = 0.
	elem.selectAll(selection).each(function(){
		var ch = d3.select(this)
		w = Math.max(w, getTextWidth(ch));
	});
	return Math.round(w);
}

function getTextWidth(elem){
	var test = d3.select('#Test')
	test.style('font-size', elem.style('font-size')).text(elem.text())
	return Math.round(test.node().getBoundingClientRect().width);
}


function createPlaylistPicker(){
	var picker = d3.select('#playlistPicker')

	d3.select('#playlistLabel').style('margin-top','10px');

	var cb = getComputedStyle(document.body).getPropertyValue('--hovercell-background-color');
	var cf = getComputedStyle(document.body).getPropertyValue('--hovercell-foreground-color');

	params.availablePlaylists.forEach(function(d){
		vals = getPlaylistData(d);
		picker.append('div')
			.attr('class','buttonPicker subTitle buttonDiv')
			.attr('id','playlistPicker'+d)
			.style('cursor','pointer')
			.style('width',(params.windowWidth/params.availablePlaylists.length - 10*(params.availablePlaylists.length - 1)) + 'px')
			.style('padding','10px')
			.style('margin', '0px')
			.style('float','left')
			.style('background-color',cb)
			.style('color',cf)
			.style('transition', '0.4s')
			.attr('data-color', vals.color)
			.text(d)
			.on('click', function(){
				params.activePlaylist = d3.select(this).attr('id').replace('playlistPicker','');
				console.log('changing playlist to ', params.activePlaylist);
				createPlaylist();

				d3.selectAll('.buttonPicker')
					.style('background-color',cb)
					.style('color',cf)

				var c = d3.select(this).attr('data-color')
				d3.select(this)
					.style('background-color',c)
					.style('color','black');

				d3.select('#nowShowingExpander').classed('hidden',params.activePlaylist == 'WWT');
				d3.select('#VLCcontrols').classed('hidden',params.activePlaylist == 'WWT');
				d3.select('#currentVLCplaylist').classed('hidden',params.activePlaylist == 'WWT');
			})
	})

	var c = d3.select('#playlistPicker'+params.activePlaylist).attr('data-color')
	d3.select('#playlistPicker'+params.activePlaylist)
		.style('background-color',c)
		.style('color','black');

	var h = d3.select('.buttonPicker').node().getBoundingClientRect().height;
	d3.select('#showMenuButton').style('top',(h + 5) + 'px');
	d3.select('#helpButton').style('top',(h + 5) + 'px');
	d3.select('#objectMenu').style('top', (h - 4) + 'px'); //I think the 2 pixels here is for the border?
	d3.select('#playlistDiv').style('top', h + 'px'); 

}

function showHideExpander(){
	if (params.activePlaylist != 'WWT'){
		params.nowShowingExpanded = !params.nowShowingExpanded;
	}

	var elem = d3.select('#nowShowing')
	var top = parseFloat(elem.style('top'));
	var height = params.windowHeight - top;

	if (params.nowShowingExpanded){
		getVLCplaylist();
		top = d3.select('#playlist').node().getBoundingClientRect().top;
		elem.transition().duration(400).style('top',top + 'px');
	} else {
		var h = getShowingHeight();
		top = params.windowHeight - h;
		elem.transition().duration(400).style('top',top + 'px')
	}

}