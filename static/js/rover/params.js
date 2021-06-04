//I will use the params object to contain all the global variables that I want access to throughout the javascript code.

let params;
function defineParams(){
	params = new function() {

		this.server;
		this.namespace;
		this.socket;

		//timing to show instructions and random WWT entries
		this.instructionsTimeoutHandle = null;
		this.instructionsTimeout = 5*60*1000; //five minutes in units of ms

		this.moving = false;
		this.movingInterval = null;
		this.movingDuration = 1*1000;//1 seconds in units of ms
	};
}
defineParams();