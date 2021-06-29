//this code contains all the commands that are sent to and received from flask via web sockets

//https://blog.miguelgrinberg.com/post/easy-websockets-with-flask-and-gevent
//https://github.com/miguelgrinberg/Flask-SocketIO
function connectSocket(){
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

	params.socket.on('resetTimeout', function(msg) {
		console.log('resetting timeout', msg.time);
		params.instructionsTimeout = msg.time;
		restartInstructionsTimeout();
	});

	params.socket.on('reloadPage', function(msg) {
		if (params.appName == msg){
			console.log('reloading', msg);
			location.reload();
		}
	});

	params.availablePlaylists.forEach(function(p){

		if (p.includes('Movies')){
			//executed when socketio sends back the status
			params.socket.on('statusVLC' + p, function(msg) {
				params.VLCstatus[p] = msg;
				//console.log('====== VLCstatus', p, params.VLCstatus[p]);
				if (params.activePlaylist == p && params.presenter) updateVLCcontrols();
			});

			//executed when socketio sends back the playlist
			params.socket.on('playlistVLC' + p, function(msg) {
				var length0 = 0;
				var length1 = 0;
				if (params.VLCplaylist[p]) length0 = params.VLCplaylist[p].length;
				if (msg) length1 = msg.length;
				params.VLCplaylist[p] = msg;
				console.log('====== VLCplayist', p, params.VLCplaylist[p]);
				if (msg && (length0 != length1 || !d3.select('#currentVLCplaylist').node().hasChildNodes())){
					updateVLCplaylist();
				}
			});

			//executed when socketio sends back the current movie
			params.socket.on('currentVLC' + p, function(msg) {
				if (params.activePlaylist == p){
					console.log('====== have current', msg)
					if (msg){
						setCurrentByFileName(msg.name)
					}
				}
			});
		}

		//executed when the playlist is done being cleaned
		params.socket.on('navigatorReady' + p, function(msg) {
			params.navigatorReady[p] = true;

		});
	});

	//get the initial status for VLC
	if (params.activePlaylist.includes('Movies')){
		getVLCstatus();
		getVLCplaylist();
		startVLCloop();
		getVLCcurrent();
	}



}

///////////////// WWT controls
function flyWWT(cmd){
//send the http command through flask to move WorldWide telescope to the desired position
	var url = params.server.WWT + cmd
	console.log('flying WWT', url)
	params.socket.emit('sendHTTPCommand', {url:url, server:params.server.WWT, id:params.activePlaylist});
}
function showRandomWWT(){
//show a random object from the WorldWide telescope database
	var vals = getPlaylistData(params.activePlaylist);

	d3.select('#'+vals.id).selectAll('.hoverCell').classed('hoverCellActive', false);
	var index = parseInt(Math.random()*vals.data.raw.length);
	console.log('random ', index, vals.data.raw[index]);

	populateShowing(vals.data.raw[index]);

	flyWWT(vals.data.raw[index].WWTurl);

}



///////////////// VLC controls
function getVLCstatus(p=null){
//request the VLC status via flask
	if (!p) p = params.activePlaylist;
	console.log('requesting status', p)
	params.socket.emit('statusVLC_request', {id:p, server:params.server[p]}); 
}
function getVLCplaylist(p=null){
//request the VLC playlist via flask
	if (!p) p = params.activePlaylist;
	params.socket.emit('playlistVLC_request', {id:p, server:params.server[p]});
}
function getVLCcurrent(p=null){
//request the current VLC movie via flask
	if (!p) p = params.activePlaylist;
	params.socket.emit('currentVLC_request', {id:p, server:params.server[p]});
}

function setCurrentByFileName(name){
//find a movie by file name in the database
	var vals = getPlaylistData(params.activePlaylist);
	var haveCurrent = false;
	params.nowShowing[params.activePlaylist] = null;
	vals.data.raw.forEach(function(d, i){
		if (d['File Name'] == name){
			params.nowShowing[params.activePlaylist] = d;
			haveCurrent = true;
			populateShowing();
		}
		if (i == vals.data.raw.length - 1 && !haveCurrent){
			populateShowing();
		}
	})		
}

function startVLCloop(){
//this will start a background loop within flask to get regularly the current movie and status and send back here when there is a change
	params.socket.emit('startVLCloop',{'names':[params.activePlaylist]});
}

function stopVLCloop(){
//this will stop the background loop in flask
	params.socket.emit('stopVLCloop');
}

function playSingleVLCmovie(location){
//this will play a single movie and remove all others from the playlist
	//stopVLCloop();

	var server = params.server[params.activePlaylist];
	var file = params.movieLocationPrefix[params.activePlaylist] + superEncodeURI(location);
	var urls = [];

	//check if the movie is already in the playlist and if so don't add it again
	var plID = -1;
	if (params.VLCplaylist[params.activePlaylist]){
		params.VLCplaylist[params.activePlaylist].forEach(function(d,i){
			if (d.uri.includes(location)) plID = d.id;
			if (i == params.VLCplaylist[params.activePlaylist].length - 1){
				if (plID == -1){
					urls.push(server + '/requests/status.xml?command=in_play&input=' + file);
				} else {
					urls.push(server + '/requests/status.xml?command=pl_play&id=' + plID);
				}
			}
		});
 	} else {
		urls.push(server + '/requests/status.xml?command=in_play&input=' + file);
	}

	if (params.VLCstatus[params.activePlaylist]){
		//make sure the loop is on
		if (!params.VLCstatus[params.activePlaylist].loop) urls.push(server + '/requests/status.xml?command=pl_loop');

		//make sure the fullscreen is on
		if (!params.VLCstatus[params.activePlaylist].fullscreen) urls.unshift(server + '/requests/status.xml?command=fullscreen');
	}


	//add the movie to the playlist and play
	console.log('playing movie', urls)

	params.socket.emit('sendHTTPCommand', {url:urls, server:server, id:params.activePlaylist, blocked:true});

	//when that is finished, update the status and playlist
	var blocker = setInterval(function(){
		if (params.navigatorReady[params.activePlaylist]){
			clearInterval(blocker);

			getVLCplaylist();
			getVLCstatus();

			//wait 5sec to allow VLC to load the movie then remove all other items from the playlist
			if (!params.presenter) window.setTimeout(cleanVLCplaylist,5*1000);
		}
	}, 1*1000)



}

function cleanVLCplaylist(elem=null){
//remove all items from the playlist that are not currently playing
	params.navigatorReady[params.activePlaylist] = false
	var server = params.server[params.activePlaylist]
	params.socket.emit('cleanVLCplaylist', {server:server, id:params.activePlaylist});

	if (elem) {
		//triggered from button click
		elem.style('background-color','var(--hovercell-foreground-color)');
		window.setTimeout(function(){
			elem.style('background-color','var(--button-background-color)')
		},400);
	}
}

function addRandomVLC(){
//this will add a random movie to the end of the playlist
	var vals = getPlaylistData(params.activePlaylist);

	d3.select('#'+vals.id).selectAll('.hoverCell').classed('hoverCellActive', false);

	var server = params.server[params.activePlaylist];
	var urls = [];
	for (var i=0; i<params.nRandomVLC; i++) {

		var index = parseInt(Math.random()*vals.data.raw.length);
		console.log('random ', index, vals.data.raw[index]['File Name']);

		var file = params.movieLocationPrefix[params.activePlaylist] + superEncodeURI(vals.data.raw[index].movieLocation);
		urls.push(server + '/requests/status.xml?command=in_enqueue&input=' + file);
	}

	//if it is not already playing, then append the play command
	if (params.VLCstatus[params.activePlaylist].state != 'playing') urls.push(server + '/requests/status.xml?command=pl_play');

	//if it is not already in fullscreen, then append the fullscreen command
	if (!params.VLCstatus[params.activePlaylist].fullscreen) urls.push(server + '/requests/status.xml?command=fullscreen');

	//make sure the loop is on
	if (!params.VLCstatus[params.activePlaylist].loop) urls.push(server + '/requests/status.xml?command=pl_loop');

	params.socket.emit('sendHTTPCommand', {url:urls, server:server, id:params.activePlaylist});

	params.navigatorReady[params.activePlaylist] = false;

	//when that is finished, update the status and playlist
	var blocker = setInterval(function(){
		if (params.navigatorReady[params.activePlaylist]){
			clearInterval(blocker);

			getVLCplaylist();
			getVLCstatus();
		}
	}, 1*1000)

}

function setVLCtimeFromFrac(frac){
//set the VLC time slider and numerical value from the fraction of the length
	if (params.activePlaylist.includes('Movies') && params.VLCstatus[params.activePlaylist]){
		var time = frac*params.VLCstatus[params.activePlaylist].length;
		var min = Math.floor(time/60.);
		var sec = Math.round(time - min*60);

		//safety check
		if (isNaN(min)) min = 0;
		if (isNaN(sec)) sec = 0;
		if (min == 0 && sec == 0) frac = 0;

		d3.select('#VLCtime').text(String(min).padStart(2,'0') + ':' + String(sec).padStart(2,'0'));

		d3.select('#VLCseeker').attr('value', frac*100);
		d3.select('#VLCseeker').node().value = frac*100;
	}
}

function updateVLCcontrols(){
//update all the VLC controls that the presenter sees, based on the current status
	if (params.VLCstatus[params.activePlaylist].state == 'paused') d3.select('#VLCplaypause').text('play_circle');
	if (params.VLCstatus[params.activePlaylist].state == 'playing') d3.select('#VLCplaypause').text('pause_circle');

	if (params.VLCstatus[params.activePlaylist].random) d3.select('#VLCrandom').text('shuffle_on');
	if (!params.VLCstatus[params.activePlaylist].random) d3.select('#VLCrandom').text('shuffle');

	if (params.VLCstatus[params.activePlaylist].repeat) d3.select('#VLCrepeat').text('repeat_one');
	if (!params.VLCstatus[params.activePlaylist].repeat) d3.select('#VLCrepeat').text('repeat');
	if (!params.VLCstatus[params.activePlaylist].repeat && !params.VLCstatus[params.activePlaylist].loop) d3.select('#VLCrepeat').style('color','var(--hovercell-foreground-color)');


	if (!params.VLCseeking){
		var frac = params.VLCstatus[params.activePlaylist].time/params.VLCstatus[params.activePlaylist].length;
		d3.select('#VLCseeker').transition(d3.easeLinear).duration(500).tween('value', function(d){
			var elem = d3.select(this);
			var startValue = parseFloat(elem.attr('value'))/100.;
			var interp = d3.interpolateNumber(startValue, frac);
			return function(t) { 
				if (!params.VLCseeking)	setVLCtimeFromFrac(interp(t));
			};
		});
	}

}

function sendVLCcontrolsCommand(cmd, p=null, getStatus=true, blocked=true, getPlaylist=false){
//send a command to VLC via flask that comes from the presenter's controls

	if (!p) p = params.activePlaylist;

	var server = params.server[p];
	var url = [];
	cmd.forEach(function(c){
		url.push(server + '/requests/status.xml?command='+c);
	})
	params.socket.emit('sendHTTPCommand', {url:url, server:server, id:p, blocked:blocked});

	//wait  and then update the status
	if (getStatus){
		params.navigatorReady[p] = false;
		var blocker = setInterval(function(){
			if (params.navigatorReady[p]){
				clearInterval(blocker);
				getVLCstatus(p);
				if (getPlaylist) getVLCplaylist(p);
			}
		}, 1*1000)
	}
}

function blinkControlButton(elem){
//change the color of the controls button and then revert to default, when the user clicks
	elem.style('color','var(--hovercell-foreground-color)');
	window.setTimeout(function(){
		elem.style('color','var(--button-background-color)')
	},400);
}

function setupVLCcontrols(){
//connect all the VLC presenter controls to the appropriate functions

	//play-pause
	d3.select('#VLCplaypause')
		.on('click', function(){
			console.log('toggling play/pause');
			blinkControlButton(d3.select(this));
			//if currently paused, then play the movie
			if (params.VLCstatus[params.activePlaylist].state == 'paused'){
				//it's possible that this will not work, and that I will have to provide the playlist ID (and current time?)
				sendVLCcontrolsCommand(['pl_play']);
			//if currently playing, then pause the movie
			} else {
				sendVLCcontrolsCommand(['pl_pause']);
			}
	})

	//next
	d3.select('#VLCnext').on('click', function(){
		console.log('next movie');
		blinkControlButton(d3.select(this));
		sendVLCcontrolsCommand(['pl_next']);
	})

	//previous
	d3.select('#VLCprevious').on('click', function(){
		console.log('previous movie');
		blinkControlButton(d3.select(this));
		sendVLCcontrolsCommand(['pl_previous']);
	})

	//random
	d3.select('#VLCrandom').on('click', function(){
		console.log('toggling random');
		blinkControlButton(d3.select(this));
		sendVLCcontrolsCommand(['pl_random']);
	})

	//repeat
	d3.select('#VLCrepeat').on('click', function(){
		console.log('toggling repeat');
		blinkControlButton(d3.select(this));
		var cmd = ['pl_repeat'];
		//make sure the overall loop stays on
		if (params.VLCstatus[params.activePlaylist].repeat && !params.VLCstatus[params.activePlaylist].loop) cmd.push('pl_loop'); 
		sendVLCcontrolsCommand(cmd);
	})

	//fullscreen
	d3.select('#VLCfullscreen').on('click', function(){
		if (!params.VLCstatus[params.activePlaylist].fullscreen){
			console.log('toggling fullscreen');
			blinkControlButton(d3.select(this));
			sendVLCcontrolsCommand(['fullscreen']);
		}
	})

	//seeker (this may break things with too many calls to VLC?)
	function getVLCseekFrac(){
		var rect = d3.select('#VLCseeker').node().getBoundingClientRect();
		var frac = parseFloat(d3.event.offsetX)/parseFloat(rect.width);
		var time = frac*params.VLCstatus[params.activePlaylist].length;
		return [frac, time]
	}
	d3.select('#VLCseeker')
		.on('mousedown', function(){
			params.VLCseeking = true;
			var ft = getVLCseekFrac();
			setVLCtimeFromFrac(ft[0]);
			params.navigatorReady[params.activePlaylist] = false;
			sendVLCcontrolsCommand(['seek&val='+Math.round(ft[1])], params.activePlaylist, false, true);
		})
		.on('mouseup', function(){
			params.VLCseeking = false;
		})
		.on('mousemove', function(){
			if (params.VLCseeking){
				var ft = getVLCseekFrac();
				setVLCtimeFromFrac(ft[0]);
				if (params.navigatorReady[params.activePlaylist]){
					params.navigatorReady[params.activePlaylist] = false;
					sendVLCcontrolsCommand(['seek&val='+Math.round(ft[1])], params.activePlaylist, false, true);
				}
			}
		})
}

function removeFromVLCplaylist(elem){
//remove a movie from the current VLC playlist
//should users be able to remove the one that is playing?  It will show the VLC window.  But then they can just play another one
	console.log('====== removing from VLC playlist', elem);
	sendVLCcontrolsCommand(['pl_delete&id=' + elem.dataset.VLCplaylistID], params.activePlaylist, true, true, true);

}

function updateVLCplaylist(){
//(re)make the current VLC playlist that is shown to presenters
//first will need to find the movies that are in the playlist
//I may be able to make this more efficient if I check to see if the playlist has changed before deleting everything (but maybe that will already be taken care of with the rest of the code timing?)

	console.log('=== creating VLC playlist div')
	//for safety
	if (params.activePlaylist.includes('Movies')){
		var playlist = d3.select('#currentVLCplaylist');
		playlist.node().innerHTML = '';

		var vals = getPlaylistData(params.activePlaylist);

		var input = [];

		if (params.VLCplaylist[params.activePlaylist].length > 0){
			params.VLCplaylist[params.activePlaylist].forEach(function(dd,i){
				//these nested loops may be inefficient, but I'm not quite sure how to handle it otherwise
				vals.data.raw.forEach(function(d, i){
					if (d['File Name'] == dd.name){
						var data = d;
						data.VLCplaylistID = dd.id;
						input.push(data);
					}
				})

				if (i == params.VLCplaylist[params.activePlaylist].length -1 ){

					//now make the table using the same function that creates the categories
					if (input[0]){
						var tabFinished = false;
						var th = (params.windowHeight - d3.select('#playlist').node().getBoundingClientRect().top) - getShowingHeight() - 20;
						var tw = d3.select('#nowShowing').node().getBoundingClientRect().width - 2.*parseFloat(d3.select('#nowShowing').style('padding-left'));
						var foo = makeTable(input, playlist, width=tw, height=th, fill='default', extraControl=true);
						var tab = foo[0];
						tabFinished = foo[1];
						d3.selectAll('.playlistItem'+playlist.attr('id'))
							.on('click', function(){
								if (!d3.select(document.elementFromPoint(event.clientX, event.clientY)).classed('extraControl')) showIndex(parseInt(d3.select(this).node().dataset.index));
							})

						var intv = window.setInterval(function(){
							if (tabFinished) {
								clearInterval(intv);
								resizeTable(tab);
								populateShowing(); 
								//tab.style('padding-top','20px');
							}
						},100)
					}

				}
			})

		}
	}

}
