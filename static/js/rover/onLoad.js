//this runs on load to read in the server information and attach the buttons.

//window.addEventListener('touchstart', restartInstructionsTimeout);
window.addEventListener('click', restartInstructionsTimeout);


///////////////////////////
// runs on load
///////////////////////////
function init(inp) {
	input = JSON.parse(inp);
	console.log('input', inp, input);
	
	if ('name' in input) params.appName = input.name;

	//first get the server information
	new Promise(function(resolve, reject) {
		d3.json('static/data/private/serverInfo.json').then(function(info){

			params.namespace = info.namespace;
			params.socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + params.namespace);
			params.server = info.server['WWTRover'];

			//set up the web sockets
			connectSocket();

			attachButtons();
		});
	});

}
