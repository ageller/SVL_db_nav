import time

#########toggle WWT fullscreen. 

#https://stackoverflow.com/questions/12996985/send-some-keys-to-inactive-window-with-python
#https://stackoverflow.com/questions/55547940/how-to-get-a-list-of-the-name-of-every-open-window
#https://docs.microsoft.com/en-us/windows/win32/inputdev/virtual-key-codes

import win32gui
import win32con
import win32api


hwndMain = None
searchString = "WorldWide Telescope"

def findProc(hwnd, foo):
	global hwndMain
	if win32gui.IsWindowVisible(hwnd):
		name = win32gui.GetWindowText(hwnd)
		if (searchString in name):
			hwndMain = hwnd
			print(hwnd, name)


def toggleWWTfullscreen():
	#find the unique ID of the WWT app
	win32gui.EnumWindows(findProc, None)
	if (hwndMain is None):
		return False

	#find the unique ID of the sub/child
	hwndChild = win32gui.GetWindow(hwndMain, win32con.GW_CHILD)

	#send F11 for fullscreen
	_ = win32api.PostMessage(hwndChild, win32con.WM_KEYDOWN, win32con.VK_F11, 0)

	return True


#########For turning off the slide show (easiest to do this when it is not in fullscreen mode)

from pynput.mouse import Button, Controller

def toggleWWTslideshow(inFullscreen = True):
	#easiest to do this when the app isn't in full screen!	So I will toggle on and off.
	if (inFullscreen):
		_ = toggleWWTfullscreen()

	mouse = Controller()
	#print(mouse.position)

#these are probably dependent on the monitor.  (Will need to update for 4K TV.)
	pExplore = [190, 50]
	pMenu = [190, 145]
	pMid = [1000, 400] #somewhere in middle
	pEnd = [1920, 0] #upper right corner


	mouse.position = pExplore
	time.sleep(3) #wait for the menu to open
	mouse.click(Button.left)
	time.sleep(1)
	mouse.position = pMenu
	time.sleep(1)
	mouse.click(Button.left)
	
	if (inFullscreen):
		time.sleep(1)
		_ = toggleWWTfullscreen()
	
	mouse.position = pMid
	time.sleep(3) #allow menu to fade, then hide mouse
	mouse.position = pEnd


#############################################################
if __name__ == '__main__':

	#check if WWT is running\
	print('Checking that WWT is running...')
	running = False
	while (not running):
		win32gui.EnumWindows(findProc, None)
		if (hwndMain is not None):
			running = True
			break
		print('... WWT is not running.')
		time.sleep(5)
		
	#wait a bit to make sure that WWT is fully loaded
	time.sleep(15)	 
	
	print('Turning off WWT slideshow...')
	toggleWWTslideshow()
	