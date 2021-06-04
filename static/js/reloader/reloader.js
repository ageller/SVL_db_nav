//this file contains all the functions needed for the reloader.  
//It will send a reload command via flask to the other app page when that button is clicked.

 
//I will use the params object to contain all the global variables that I want access to throughout the javascript code.
let params;
function defineParams(){
	params = new function() {

		this.namespace = null;
		this.socket = null

	};
}
defineParams();


function connectSocket(){
//connect the web sockets to communicate with flask
	console.log('connecting socket...', params.socket)

	// Event handler for new connections.
	// The callback function is invoked when a connection with the
	// server is established.
	params.socket.on('connect', function() {
		params.socket.emit('connection_test', {data: 'I\'m connected!'});
	});
	params.socket.on('connectionResponse', function(msg) {
		console.log('Connected to socket', msg)
	});



}

function flashButton(elem, dur=100){
//flash the color from black to normal (to give some feedback to user)
	var bg = d3.select(elem).style('background-color');
	d3.select(elem).style('background-color','black');
	d3.select(elem).transition().duration(dur).style('background-color',bg);
}

function attachButtons(){
//attach commands to all the buttons

	d3.selectAll('.buttonDiv').on('mousedown',function(){
		var id = d3.select(this).attr('id').replace('reload','')
		params.socket.emit('reload_app', {page:id});
		flashButton(this)
	});
}



  

///////////////////////////
// runs on load
///////////////////////////
window.onload = function() {
	//first get the server information
	new Promise(function(resolve, reject) {
		d3.json('static/data/private/serverInfo.json').then(function(info){

			params.namespace = info.namespace;
			params.socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port + params.namespace);

			//set up the web sockets
			connectSocket();

			//attach the reload commands to the buttons
			attachButtons();
		});
	});

}






