//this runs on load to read in the server information and attach the buttons.

//window.addEventListener('touchstart', restartInstructionsTimeout);
window.addEventListener('click', restartInstructionsTimeout);


///////////////////////////
// runs on load
///////////////////////////
window.onload = function() {
	//first get the server information
	new Promise(function(resolve, reject) {
		d3.json('static/data/private/serverInfo.json').then(function(info){

			params.server = info.server['WWTRover'];
			attachButtons();
		});
	});

}
