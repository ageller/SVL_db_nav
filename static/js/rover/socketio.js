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

	params.socket.on('reloadPage', function(msg) {
		if (params.appName == msg){
			console.log('reloading', msg);
			location.reload();
		}
	});
}