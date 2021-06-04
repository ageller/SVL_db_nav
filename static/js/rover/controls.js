//functions in here will attach commands to the buttons and execute those commands via an XMLHttpRequest


function attachButtons(){
//attach commands to all the buttons

//do I need to do this for touch also?


	//pan
	d3.selectAll('.pan').on('click',function(){
		var dir = d3.select(this).attr('id');
		moveWWT(dir);
	});
	d3.selectAll('.pan').on('mousedown',function(){
		d3.select(this).classed('buttonDivActive',true);
		var dir = d3.select(this).attr('id');

		//a bit choppy, but I think this is best that can be done with the Layer Controls API
		params.movingInterval = setInterval(function(){
			moveWWT(dir)
		}, params.movingDuration)

	});

	//zoom
	d3.selectAll('.zoom').on('click',function(){
		var dir = d3.select(this).attr('id');
		moveWWT(dir);
	});
	d3.selectAll('.zoom').on('mousedown',function(){
		d3.select(this).classed('buttonDivActive',true);
		var dir = d3.select(this).attr('id');

		//a bit choppy, but I think this is best that can be done with the Layer Controls API
		params.movingInterval = setInterval(function(){
			moveWWT(dir)
		}, params.movingDuration)

	});

	//next image
	//I'm not sure how to change the image (need to add)
	d3.selectAll('.img').on('click',function(){
		var dir = d3.select(this).attr('id').replace('Image','');
		console.log('changing image', dir);
	});
	d3.selectAll('.img').on('mousedown',function(){
		d3.select(this).classed('buttonDivActive',true);
	});

	window.onmouseup = function(){
		if (params.movingInterval) clearInterval(params.movingInterval);
		d3.selectAll('.buttonDiv').classed('buttonDivActive',false);
	};


}


function moveWWT(dir){
//use the WWT Layer Controls API to send the move command (when a button is clicked)

	var cmd = params.server + '/layerAPI.aspx?cmd=move&move=' + dir
	console.log(cmd);
	params.socket.emit('sendHTTPCommand', {url:cmd, server:params.server, id:'WWT'});

//Note that this gives CORS errors in the browser console, but still appears to work. 
//Since I've now included this Rover app with the main navigator app, I will use flask instead
	// var http = new XMLHttpRequest();
	// http.open("GET", cmd);//.replace("http:", "https:"));
	// http.send();
	// http.onreadystatechange = function(){ //this does not fire because the command is blocked...
	// 	console.log('WWT state = ', this.readyState, this.status)
	// 	if (this.readyState == 4){// && this.status == 200){ //I don't think this reaches "success" ==200
	// 		console.log('finished moving WWT')
	// 	}
	// }
}