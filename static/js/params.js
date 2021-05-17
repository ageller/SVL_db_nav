let params;
function defineParams(){
	params = new function() {
		// raw holds the data that is read in (useful for choosing random entries more easily)
		// sorted holds broken down by categories and is used to populate the menu
		this.WWTdata = {raw:null, sorted:null}; 
		this.Movies2Ddata = {raw:null, sorted:null}; 
		this.Movies3Ddata = {raw:null, sorted:null}; 

		this.presenter = false;

		//sizes for the tables
		this.imageWidth = 100;//pixels
		this.minRowHeight = 100;//pixels

		//size and location for the menu div (defined by window size)
		this.menuLeft;
		this.showingMenu = false;

		//window size (will be reset if resized)
		this.windowWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
		this.windowHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

		//for playlists
		this.playlistKey = 'Star Clusters';
		this.activePlaylist = null; //WWT, Movies2D, Movies3D (now set from the index file and into init)
		this.availablePlaylists;

		//timing to show instructions and random WWT entries
		this.instructionsTimeoutHandle = null;
		this.instructionsTimeout = 5*60*1000; //five minutes in units of ms
		this.instructionsTimeoutDefault = 5*60*1000; //five minutes in units of ms
		this.instructionsTimeoutPresenter = 60*60*1000; //60 minutes in units of ms

		// this.instructionsTimeoutDefault = 10*1000; //five minutes in units of ms
		// this.instructionsTimeoutPresenter = 30*1000; //60 minutes in units of ms

		//for showing random WWT objects in a loop
		this.randomWWTinterval = null;
		this.randomWWTduration = 60*1000;//1 minute in units of ms

		//for random sampling of VLC movies
		this.nRandomVLC = 20; //number of random videos to add to the playlist when instructions times out

		this.categories = [];

		this.nowShowing = {'WWT':null,'Movies2D':null,'Movies3D':null,'Uniview':null};
		this.nowShowingExanded = false;
		
		this.headers;

		//for VLC
		this.VLCstatus = {'Movies2D':null, 'Movies3D':null};
		this.VLCplaylist = {'Movies2D':null, 'Movies3D':null};
		this.VLCseeking = false;

		this.navigatorReady = {'WWT':false,'Movies2D':false, 'Movies3D':false, 'Uniview':false};

	};


}
defineParams();
