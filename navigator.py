##### NOTE: I need to rename the Power of Ten movie on the SVL computer to remove the "TM" superscript

from flask import Flask, render_template, session, jsonify
from flask_socketio import SocketIO
from threading import Lock

import requests
from requests.auth import HTTPBasicAuth

import xml.etree.ElementTree as ET

import time
import json

with open ('static/data/private/serverInfo.json') as f:
	data = json.load(f)

pw = data['pw']
namespace = data['namespace']
host = data['host']
port = data['port']

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


def initializeStatus():
	return {'fullscreen':True,
			'time':0,
			'length':0,
			'volume':0,
			'state':'',
			'loop':False,
			'repeat':False,
			'random':False,
			'serverUp':False}

#these will only hold the values for the active playlist (Movies2D or Movies3D)
VLCplaylist = None
VLCstatus = initializeStatus()
VLCcurrent = {'name':None}


def getVLCplaylist(inputData):
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
	for k in s1:
		if (s1[k] != s2[k]):
			return True

	return False

def getVLCcurrent(inputData):
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

#background thread to check when currently movie changes in VLC
#runs every X seconds
#will this work for both servers if they are running simultaneously?
def background_thread(inputData):

	global VLCcurrent, VLCstatus

	print('========= thread started', inputData)
	#initialize

	iden = inputData['id']
	server = inputData['server']

	checkCurrent = getVLCcurrent(inputData)
	socketio.emit('currentVLC'+iden, checkCurrent, namespace=namespace)
	VLCcurrent = checkCurrent

	checkStatus = getVLCstatus(inputData)
	socketio.emit('statusVLC'+iden, checkStatus, namespace=namespace)
	VLCstatus = checkStatus


	#run the loop
	while (threadRunning):
		socketio.sleep(seconds)

		#check the current playlist item
		checkCurrent = getVLCcurrent(inputData)
		if (checkCurrent['name'] != VLCcurrent['name']):
			print('========= current', iden, checkCurrent)
			socketio.emit('currentVLC'+iden, checkCurrent, namespace=namespace)
			VLCcurrent = checkCurrent


		#check the status
		checkStatus = getVLCstatus(inputData);
		if (isDiffStatus(checkStatus, VLCstatus)):
			#print('========= status changed', iden) #this will happen a lot because the time will change when the movie is playing
			socketio.emit('statusVLC'+iden, checkStatus, namespace=namespace)
			VLCstatus = checkStatus




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
	print('========= starting VLC loop')
	global thread, threadRunning

	stopVLCloop()
	socketio.sleep(2*seconds) #to make sure the thread stops

	if (not threadRunning):
		threadRunning = True
		with thread_lock:
			if thread is None:
				thread = socketio.start_background_task(background_thread, inputData)

#start the background thread for VLC
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
	VLCplaylist = playlist

	print("========= playlist"+iden)#+":",playlist)
	socketio.emit('playlistVLC'+iden, playlist, namespace=namespace)
	socketio.emit('navigatorReady'+iden, True, namespace=namespace)


#get the status from VLC
@socketio.on('statusVLC_request', namespace=namespace)
def statusVLC_request(inputData):
	global VLCstatus

	status = getVLCstatus(inputData)

	iden = inputData['id']
	VLCstatus = status

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


	socketio.emit('navigatorReady'+iden, True, namespace=namespace)

@socketio.on('currentVLC_request', namespace=namespace)
def currentVLC_request(inputData):	
	global VLCcurrent

	check = getVLCcurrent(inputData)

	iden = inputData['id']
	VLCcurrent = check

	print('========= current', check)
	socketio.emit('currentVLC'+iden, check, namespace=namespace)

#run http request
@socketio.on('sendHTTPCommand', namespace=namespace)
def sendHTTPCommand(inputData):
	iden = inputData['id']
	url = inputData['url']
	blocked = False
	if (isinstance(url,list)):
		if (len(url) > 1):
			blocked = True #on the JS side I expect to implement blocking so that other commands aren't sent while this is processing
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


#flask stuff
@app.route("/Movies2D")
def Movies2Dnavigator():  
	return render_template("index.html", input=json.dumps({'playlist':['Movies2D'], 'presenter':False}))

@app.route("/Movies3D")
def Movies3Dnavigator():  
	return render_template("index.html", input=json.dumps({'playlist':['Movies3D'], 'presenter':False}))

@app.route("/WWT")
def WWTnavigator():  
	return render_template("index.html", input=json.dumps({'playlist':['WWT'], 'presenter':False}))

@app.route("/Presenter")
def presenterNavigator():  
	return render_template("index.html", input=json.dumps({'playlist':['WWT', 'Movies2D', 'Movies3D'], 'presenter':True}))

if __name__ == "__main__":
	print('Starting server...')

	socketio.run(app, host=host, port=port)






