function instructionsOn() {
	//reset to the default timeout interval	
	params.instructionsTimeout = params.instructionsTimeoutDefault;
	console.log('resetting instructions timeout', params.instructionsTimeout);

	populateInstructions();
	d3.selectAll('.instructions').transition().duration(500)
		.style('opacity',1)
		.on('start', function(){
			d3.select(this).style('display', 'block');
		});

	d3.select('#helpButton').transition().duration(500)
		.style('opacity',0)
		.on('end', function(){
			d3.select(this).style('display','none');
		});

}

function instructionsOff() {
	d3.selectAll('.instructions').transition().duration(500)
		.style('opacity',0)
		.on('end', function(){
			d3.select(this).style('display', 'none');
		})

	d3.select('#helpButton').transition().duration(500)
		.style('opacity',1)
		.on('start', function(){
			d3.select(this).style('display','block');
		});
}

function randomize(){

	///////////////// WWT
	if (params.activePlaylist == "WWT"){
		if (params.randomWWTinterval) clearInterval(params.randomWWTinterval);

		//begin randomly cycling through the entries
		showRandomWWT();
		params.randomWWTinterval = setInterval(function(){
			showRandomWWT()
		}, params.randomWWTduration)
	}

	///////////////// VLC
	startVLCloop();
	if (params.activePlaylist.includes('Movies')){

		window.setTimeout(function(){
			params.navigatorReady[params.activePlaylist] = false

			cleanVLCplaylist();		
			//when that is finished, add the random videos to the playlist
			var blocker = setInterval(function(){
				if (params.navigatorReady[params.activePlaylist]){
					clearInterval(blocker);

					addRandomVLC();
				}
			}, 1*1000)

		},5*1000);

	}
}

function restartInstructionsTimeout(){

	//when that is finished, add the random videos to the playlist
	var blocker = setInterval(function(){
		if (params.navigatorReady[params.activePlaylist]){
			console.log('restarting instructions timeout', params.instructionsTimeout);
			clearInterval(blocker);

			// then call setTimeout again to reset the timer
			params.instructionsTimeoutHandle = window.setTimeout(function(){
				//show the instructions
				instructionsOn();

				if (!params.presenter) randomize();

			}, params.instructionsTimeout);
		}
	}, 1*1000)

}
function resetInstructionsTimeout(){

	if (params.instructionsTimeoutHandle) window.clearTimeout(params.instructionsTimeoutHandle);
	if (params.randomWWTinterval) clearInterval(params.randomWWTinterval);

	var elem = document.elementFromPoint(event.clientX, event.clientY);
	var isDone = (elem.id == 'helpButton' || elem.parentNode.id == 'helpButton');

	if (params.presenter && !isDone){
		//send to flask to reset the timeout length
		params.navigatorReady[params.activePlaylist] = false;
		params.socket.emit('reset_timeout', {time: params.instructionsTimeoutPresenter}); 
	} else {
		params.navigatorReady[params.activePlaylist] = false;
		params.socket.emit('reset_timeout', {time: params.instructionsTimeoutDefault}); 
	}
}


function populateInstructions(){
	var elem = d3.select('#instructionsText');
	elem.html('');

	if (params.presenter){
		d3.select('#instructionsMask')
			.classed('instructionsMask', false)
			.classed('instructionsMaskSimple', true);

		d3.select('#helpButton')
			.classed('buttonDiv',true)
			.style('width','100px')
			.style('right','100px')
			.style('color','var(--button-foreground-color)')
			.style('margin-top','-2px')
			.select('span')
				.attr('class','')
				.text('Done')

		elem.append('div')
			.style('position', 'absolute')
			.style('top','300px')
			.style('left','10%')
			.style('width','80%')
			.style('font-size','80px')
			.style('text-align','left')
			.text('Touch this screen to begin.');

	}
	else {
		d3.select('#instructionsMask')
			.classed('instructionsMaskSimple', false)
			.classed('instructionsMask', true);

		if (params.showingMenu){
			elem.append('div')
				.style('position', 'absolute')
				.style('top','10px')
				.style('right','100px')
				.style('width','300px')
				.style('font-size','30px')
				.style('text-align','left')
				.text('Close this menu by touching here.');

			elem.append('div')
				.style('position', 'absolute')
				.style('top','0px')
				.style('right','100px')
				.append('span')
					.attr('class','material-icons-outlined')
					.style('font-size','100px')
					.style('line-height','110px')
					.text('arrow_right_alt')


			elem.append('div')
				.style('position', 'absolute')
				.style('top','300px')
				.style('left','10%')
				.style('width','80%')
				.style('font-size','80px')
				.style('text-align','left')
				.text('Touch this screen to begin.  Then touch one of these buttons to choose a category.  On the next screen, touch a row in the table to view the object on the TV.');


		} else {
			elem.append('div')
				.style('position', 'absolute')
				.style('top','10px')
				.style('right','160px')
				.style('width','300px')
				.style('font-size','30px')
				.style('text-align','left')
				.text('Change categories by touching this menu.');

			elem.append('div')
				.style('position', 'absolute')
				.style('top','0px')
				.style('right','100px')
				.append('span')
					.attr('class','material-icons-outlined')
					.style('font-size','100px')
					.style('line-height','110px')
					.text('arrow_right_alt')

			elem.append('div')
				.style('position', 'absolute')
				.style('top','300px')
				.style('left','10%')
				.style('width','80%')
				.style('font-size','80px')
				.style('text-align','left')
				.text('Touch this screen to begin.  Then touch a row in this table to view the object on the TV.');
		}
	}


}