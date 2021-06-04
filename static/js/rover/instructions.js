//functions in here control the instructions screen.  
//When the app is inactive for params.instructionsTimeout seconds, the instructions will come back on.
//These instructions can also be made visible by clicking the ? symbol in the upper right of the page.

function instructionsOn() {
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

	restartInstructionsTimeout();
}

function restartInstructionsTimeout(){

	if (params.instructionsTimeoutHandle) window.clearTimeout(params.instructionsTimeoutHandle);

	// then call setTimeout again to reset the timer
	params.instructionsTimeoutHandle = window.setTimeout(function(){
		//show the instructions
		instructionsOn();

	}, params.instructionsTimeout);
}
