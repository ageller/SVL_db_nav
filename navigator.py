'''
This code runs a flask server that enables the individual and presenter modes of the SVL app.
The code here runs the "backend", and handles calls to WorldWide Telescope and VLC and also any communication needed between the app modes.
'''

##### NOTE: I need to rename the Power of Ten movie on the SVL computer to remove the "TM" superscript

from flask import Flask, render_template, session, jsonify
from flask_socketio import SocketIO
from threading import Lock

import requests
from requests.auth import HTTPBasicAuth

import xml.etree.ElementTree as ET

import time
import json

#get the server info.  Note: this is not on GitHub.
with open ('static/data/private/serverInfo.json') as f:
	data = json.load(f)

pw = data['pw']
namespace = data['namespace']
host = data['host']
port = data['port']
servers = data['server']

responseTimeout = 3


app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret! the quick brown fox jumps over the lazy DOG'

# Set this variable to "threading", "eventlet" or "gevent" to test the
# different async modes, or leave it set to None for the application to choose
# the best option based on installed packages.
async_mode = "eventlet"
socketio = SocketIO(app, async_mode=async_mode)
thread = None
thread_lock = Lock()



seconds = 0.1 #not sure what the best cadence is -- I want the time to move smoothly
threadRunning = False
threadServers = []


def initializeStatus():
#these are the values that I want to keep in the VLC status
#I initialize them to default blank values
	return {'fullscreen':True,
			'time':0,
			'length':0,
			'volume':0,
			'state':'',
			'loop':False,
			'repeat':False,
			'random':False,
			'serverUp':False}

#these will only hold the values for the active VLC playlist (Movies2D or Movies3D)

VLCplaylist = {'Movies2D':None, 'Movies3D':None}
VLCstatus = {'Movies2D':initializeStatus(), 'Movies3D':initializeStatus()}
VLCcurrent = {'Movies2D':{'name':None}, 'Movies3D':{'name':None}}


def getVLCplaylist(inputData):
#grab the VLC playlist from the VLC server

	iden = inputData['id']
	server = inputData['server']
	url = server + "/requests/playlist.xml"
	response = requests.get(url, auth=HTTPBasicAuth('', pw), timeout=responseTimeout)
	#print("RESPONSE", response.content)
	root = ET.fromstring(response.content)
	playlist = []
	for child in root:
		if (child.tag == 'node' and child.attrib['name'] == 'Playlist'):
			for child2 in child:
				if (child2.tag == 'leaf'):
					tmpDict = {'name':child2.attrib['name'], 'uri':child2.attrib['uri'], 'id':child2.attrib['id'], 'current':False}
					if ('current' in child2.attrib):
						tmpDict['current'] = True
					playlist.append(tmpDict)

	return playlist


def getVLCstatus(inputData):
#grab the VLC status from the VLC server

	iden = inputData['id']
	server = inputData['server']
	url = server + "/requests/status.xml"
	status = initializeStatus()

	try:
		response = requests.get(url, auth=HTTPBasicAuth('', pw), timeout=responseTimeout)
		response.raise_for_status()  # Raises a HTTPError if the status is 4xx, 5xxx
	except (requests.exceptions.ConnectionError, requests.exceptions.Timeout):
		print(iden + " server is down")
	# except requests.exceptions.HTTPError:
	# 	print "4xx, 5xx"
	else:
		status['serverUp'] = True
		#print("RESPONSE", response.content)
		root = ET.fromstring(response.content)
		for child in root:
			if (child.tag == 'fullscreen'): 
				status['fullscreen'] = child.text == 'true'
			if (child.tag == 'time'): 
				status['time'] = float(child.text)
			if (child.tag == 'length'): 
				status['length'] = float(child.text)
			if (child.tag == 'volume'): 
				status['volume'] = float(child.text)
			if (child.tag == 'state'): 
				status['state'] = child.text
			if (child.tag == 'loop'): 
				status['loop'] = child.text == 'true'
			if (child.tag == 'repeat'): 
				status['repeat'] = child.text == 'true'
			if (child.tag == 'random'): 
				status['random'] = child.text == 'true'

	return status

def isDiffStatus(s1, s2):
#check if one status is different from another (to streamline updating in app)

	for k in s1:
		if (s1[k] != s2[k]):
			return True

	return False

def getVLCcurrent(inputData):
#get the movie that is currently playing in VLC, from the playlist

	iden = inputData['id']
	server = inputData['server']
	url = server + "/requests/playlist.xml"

	response = requests.get(url, auth=HTTPBasicAuth('', pw), timeout=responseTimeout)
	#print("RESPONSE", response.content)
	root = ET.fromstring(response.content)
	cur = {'name':None}
	for child in root:
		if (child.tag == 'node' and child.attrib['name'] == 'Playlist'):
			for child2 in child:
				if (child2.tag == 'leaf'):
					if ('current' in child2.attrib): 
						cur = {'name':child2.attrib['name'], 'uri':child2.attrib['uri'], 'id':child2.attrib['id'], 'current':False}
	return cur


def background_thread():
#background thread to check when currently movie changes in VLC
#runs every X seconds, as defined above
#I hard-coded in the two IDs ('Movies2D' and 'Movies3D')

	global VLCcurrent, VLCstatus, threadServers

	print('========= thread started', threadServers)
	#initialize


	checkCurrent = {}
	checkStatus = {}
	names = threadServers #['Movies2D', 'Movies3D']

	for iden in names:

		inputData = {'id':iden, 'server':servers[iden]}

		checkCurrent[iden] = getVLCcurrent(inputData)
		socketio.emit('currentVLC'+iden, checkCurrent[iden], namespace=namespace)
		VLCcurrent[iden] = checkCurrent[iden]

		checkStatus[iden] = getVLCstatus(inputData)
		socketio.emit('statusVLC'+iden, checkStatus[iden], namespace=namespace)
		VLCstatus[iden] = checkStatus[iden]


	#run the loop
	while (threadRunning):
		socketio.sleep(seconds)
		for iden in names:
			inputData = {'id':iden, 'server':servers[iden]}

			#check the current playlist item
			checkCurrent[iden] = getVLCcurrent(inputData)
			if (checkCurrent[iden]['name'] != VLCcurrent[iden]['name']):
				print('========= current', iden, checkCurrent[iden])
				socketio.emit('currentVLC'+iden, checkCurrent[iden], namespace=namespace)
				VLCcurrent[iden] = checkCurrent[iden]


			#check the status
			checkStatus[iden] = getVLCstatus(inputData);
			if (isDiffStatus(checkStatus[iden], VLCstatus[iden])):
				#print('========= status changed', iden) #this will happen a lot because the time will change when the movie is playing
				socketio.emit('statusVLC'+iden, checkStatus[iden], namespace=namespace)
				VLCstatus[iden] = checkStatus[iden]


############################
#Below here are web-socket calls.  They will be initiated by javascript.
#Many also return values to javascipt
#Some will print messages to the terminal

#a test on the js side
@socketio.on('connection_test', namespace=namespace)
def connection_test(message):
	print('connection_test', message)
	session['receive_count'] = session.get('receive_count', 0) + 1
	socketio.emit('connectionResponse',{'data': message['data'], 'count': session['receive_count']}, namespace=namespace)
	for p in ['WWT','Movie2D', 'Movies3D', 'Uniview']:
		socketio.emit('navigatorReady' + p, True, namespace=namespace)

#a test on the python side
@socketio.on('connect', namespace=namespace)
def from_navigator():
	print('connected')

#send the new timeout interval to all 
@socketio.on('reset_timeout', namespace=namespace)
def reset_timeout(message):
	print('reset_timeout', message)
	socketio.emit('resetTimeout',message, namespace=namespace)
	for p in ['WWT','Movie2D', 'Movies3D', 'Uniview']:
		socketio.emit('navigatorReady' + p, True, namespace=namespace)



#start the background thread for VLC
@socketio.on('startVLCloop', namespace=namespace)
def startVLCloop(inputData):
	print('========= starting VLC loop', inputData)
	global thread, threadRunning, threadServers

	stopVLCloop()
	socketio.sleep(2*seconds) #to make sure the thread stops

	if (not threadRunning):
		threadRunning = True
		with thread_lock:
			if thread is None:
				threadServers = inputData['names']
				thread = socketio.start_background_task(background_thread)

#stop the background thread for VLC
@socketio.on('stopVLCloop', namespace=namespace)
def stopVLCloop():
	print('========= stopping VLC loop')
	global thread, threadRunning
	threadRunning = False
	thread = None


#get the playlist from VLC
@socketio.on('playlistVLC_request', namespace=namespace)
def playlistVLC_request(inputData):
	global VLCplaylist

	playlist = getVLCplaylist(inputData)

	iden = inputData['id']
	VLCplaylist[iden] = playlist

	print("========= playlist"+iden)#+":",playlist)
	socketio.emit('playlistVLC'+iden, playlist, namespace=namespace)
	socketio.emit('navigatorReady'+iden, True, namespace=namespace)


#get the status from VLC
@socketio.on('statusVLC_request', namespace=namespace)
def statusVLC_request(inputData):
	global VLCstatus

	status = getVLCstatus(inputData)

	iden = inputData['id']
	VLCstatus[iden] = status

	print("========= status "+iden)#+":",status)
	socketio.emit('statusVLC'+iden, status, namespace=namespace)
	socketio.emit('navigatorReady'+iden, True, namespace=namespace)


#remove everything in the VLC playlist that isn't the current one
@socketio.on('cleanVLCplaylist', namespace=namespace)
def cleanVLCplaylist(inputData):	
	print('cleaning playlist')
	iden = inputData['id']
	server = inputData['server']
	playlist = getVLCplaylist(inputData)

	while (len(playlist) > 1):
		i = 0
		if (playlist[i]['current']):
			i = 1
		url = server + '/requests/status.xml?command=pl_delete&id='+playlist[i]['id'];
		inputData['url'] = url
		check = sendHTTPCommand(inputData)
		playlist = getVLCplaylist(inputData)

	socketio.emit('playlistVLC'+iden, playlist, namespace=namespace)
	socketio.emit('navigatorReady'+iden, True, namespace=namespace)


#get the current playlist movie from VLC
@socketio.on('currentVLC_request', namespace=namespace)
def currentVLC_request(inputData):	
	global VLCcurrent

	check = getVLCcurrent(inputData)

	iden = inputData['id']
	VLCcurrent[iden] = check

	print('========= current', check)
	socketio.emit('currentVLC'+iden, check, namespace=namespace)

#run http request (generic, and works for either WorldWide Telescope or VLC, and could work for any other)
@socketio.on('sendHTTPCommand', namespace=namespace)
def sendHTTPCommand(inputData):
	iden = inputData['id']
	url = inputData['url']
	#on the JS side I implemented blocking so that other commands aren't sent while this is processing
	#If blocked is True, then the JS will wait until it receives the navigatorReady signal before sending the next command in a sequence
	blocked = False
	if (isinstance(url,list)):
		if (len(url) > 1):
			blocked = True 
	else:
		url = [url]

	if ('blocked' in inputData):
		blocked = True

	print('blocked', blocked)
	print('sending http command ', iden, url)

	if (iden == 'WWT'):
		for u in url:
			response = requests.post(u)
	else: #VLC
		for u in url:
			response = requests.post(u, auth=HTTPBasicAuth('', pw), timeout=responseTimeout)

	if (blocked):
		socketio.emit('navigatorReady'+iden, True, namespace=namespace)

	return True

#send the reload command to the given app webpage
@socketio.on('reload_app', namespace=namespace)
def reloadApp(inputData):
	print(inputData)
	socketio.emit('reloadPage', inputData['page'], namespace=namespace)
	#in case the combined VLC page is open
	if ('Movies' in inputData['page']):
		socketio.emit('reloadPage', 'Movies', namespace=namespace)

############################
#below here is where flask defines what url each part of the app will occupy and sends the necessary input values
@app.route("/Movies2D")
def Movies2Dnavigator():  
	return render_template("index.html", input=json.dumps({'playlist':['Movies2D'], 'presenter':False, 'name':'Movies2D'}))

@app.route("/Movies3D")
def Movies3Dnavigator():  
	return render_template("index.html", input=json.dumps({'playlist':['Movies3D'], 'presenter':False, 'name':'Movies3D'}))

@app.route("/Movies")
def MoviesNavigator():  
	return render_template("index.html", input=json.dumps({'playlist':['Movies2D','Movies3D'], 'presenter':False, 'tabNames':['Top TV','Bottom TV'], 'name':'Movies'}))

@app.route("/WWT")
def WWTnavigator():  
	return render_template("index.html", input=json.dumps({'playlist':['WWT'], 'presenter':False, 'name':'WWT'}))

@app.route("/Uniview")
def UniviewNavigator():  
	return render_template("index.html", input=json.dumps({'playlist':['Uniview'], 'presenter':False, 'name':'Uniview'}))

@app.route("/Presenter")
def presenterNavigator():  
	return render_template("index.html", input=json.dumps({'playlist':['WWT', 'Movies2D', 'Movies3D', 'Uniview'], 'presenter':True, 'name':'Presenter'}))

@app.route('/Rover')
def rover():  
	return render_template('rover.html', input=json.dumps({'name':'Rover'}))

@app.route('/Reloader')
def reloader(): 
	return render_template('reloader.html')

#This is run on load
if __name__ == "__main__":
	print('Starting server...')

	socketio.run(app, host=host, port=port)







