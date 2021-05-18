//these functions control the instructions overlay that will appear when the app is inactive for a set amount of time
//If the app is inactive, then random objects and/or Movies will be shown.
//The default timeout is set to 5 minutes.
//When the presenter uses the app, the timeout is reset to 60 minutes.   
//If the presenter used the app and then is finished, once the presenter app has been inactive for 60 minutes, the timeout resets to 5 minutes.


function instructionsOn() {
//turn on the instructions, ,and reset the default timeout interval (in case it was made longer by the presenter)

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
//fade off the instructions page, when the user click on it (connected directly in the HTML)

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
//initiate the random slideshow or movie playlist

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
//(re)start the timeout for the instructions.  
//this is called after flask returns from the reset_timeout call
//When the timeout finishes, turn on the instructions screen and start the randomized show

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
//reset the timeout interval.  This is called each time the user clicks on the screen
//for the presenter, if they click done, this will reset the timeout back to the default (5 mins)

	if (params.instructionsTimeoutHandle) window.clearTimeout(params.instructionsTimeoutHandle);
	if (params.randomWWTinterval) clearInterval(params.randomWWTinterval);

	var elem = document.elementFromPoint(event.clientX, event.clientY);
	var isDone = (elem.id == 'helpButton' || elem.parentNode.id == 'helpButton');

	//send to flask to reset the timeout length
	if (params.presenter && !isDone){
		params.navigatorReady[params.activePlaylist] = false;
		params.socket.emit('reset_timeout', {time: params.instructionsTimeoutPresenter}); 
	} else {
		params.navigatorReady[params.activePlaylist] = false;
		params.socket.emit('reset_timeout', {time: params.instructionsTimeoutDefault}); 
	}
}


function populateInstructions(){
//add the appropriate text to the instructions div based on what is showing and who is the user

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