/*	Gagdet Finite State Machine - default.js
 *	phil wigglesworth, Deltalink Technologies
 *	http://philwigglesworth.net
 *
 * Windows Vista gadget to monitor the Dlink DNS323 NAS and similar.
 * Logs into the NAS and accesses the status page and various other (insecure!) *nix
 * commands. Sucks the required values out of that lot and then display them in the gadget.
 * There are a number of ways to do this - I just log in and then suck all the data out in one shot.
 * I store it in the HTML, of which only one "pane" is visible at once. So pane switching
 * is fast, but you have to hit "refresh" if you want the very latest data.
 * There's a a timer to get all the stats every configurable period, so they're reasonably fresh.
 * A note on settings:
 * This is complicated because there seem to be two memory spaces here, one for the default html page
 * and the other for "settings" page. As I'm now using SettingsManager, I can forget about that and
 * just pull the data I need in each place from the settings file or memory directly. I do need to make
 * sure that the in-memory copy is up to date however.
 */
/*jsl:import display.js*/
/*jsl:import nasobject.js*/
/*jsl:import utils.js*/
/*jsl:import formatters.js*/
/*jsl:import lib/SettingsManager.js*/

/* Data etc..
 * -------------------------------------------------------------------------------------------------------------------
 */
function StateObject(nasCommand, nasArgs, output, paneName, formatter, pattern, dns323only)
{
	this.nasCommand = nasCommand;	// Thing to send to the NAS
	this.nasArgs = nasArgs;			// Thing to send to the NAS
	this.output = output;			// Format string for output.
	this.paneName = paneName;		// Name of the pane to display this on.
	this.formatter = formatter;		// Format routine if special formatting required.
	this.pattern = pattern;			// Search pattern (use to search input).
	this.dns323only = dns323only; 	// Everything is run for the DNS-323 (for now). Anything with this flag set is disabled for other devices.
}

/* State table  & variable - static. Only get each page once, so if several values are needed from one server page, the "formatter" for that page
 * does multiple things. Note that (thanks to Iain K) it's necesary to GET the forms directly for these things, rather than just GETing the web
 * pages. The pages seem to be cached by the NAS, so they're no good for much of this. /goform/ is the forms handler compiled into the server,
 * and tests show that this actually causes stuff to be run rather than pulled from cache.
 * Note that if the page address is specified with "http" at th estart then the NAS address is not auto-magically added. That allows you to
 * hard code test server page addresses below so you can test HTML you can't get from your NAS.
*/
var state;

/// <summary>
/// In this table are all request to the box handeld, the hole table is waked every refresh
/// </summary>
var stateTable =
[
	new StateObject("/cgi-bin/management/manaRequest.cgi", "subfunc=netinfo",  null,  null,  formatNetinfo, null, false),
	new StateObject("/cgi-bin/management/manaRequest.cgi", "subfunc=sysinfo",  null,  null,  formatSysinfo, null, false),
	new StateObject("/cgi-bin/disk/device_info.cgi",       "todo=get_vol",     null,  null,  formatDeviceinfoGetVol, null, false),
];
var lastRefreshTime;
var firmwareVersion;	// Nasty global - set by /goform/adv_status and read by LLTD status.
var displayWidth = 90;	// Constant for the width of the display of graphic items (eg bars and graphs). Must match class ".bar".
var spaceGraphHandles;	// Multiple possible as multiple disks may be found.
var tempGraphHandle;
var dns323;         	// So far I've only two to worry about (DNS323 or CH3SNAS), so use a flag. Can't tell which it is until you've logged into it.
var qnapSidNull = "00000000";
var qnapSid = qnapSidNull;

/* Initialization etc..
 * -------------------------------------------------------------------------------------------------------------------
 */
window.attachEvent('onload', OncePerRunInit);


function OncePerRunInit()
{
	// Once per program load. Can be re-run by clicking on the title bar of the gadget however.
	try
	{
		// Note: run after html and all that stuff is available.
		var ident = System.Gadget.name + " v" + System.Gadget.version;
		debugOut("**OncePerRunInit for " + ident +" System.Gadget.path = " + System.Gadget.path);
		document.title = ident;

		GadgetName.innerText = System.Gadget.name;		// needs HTML to be available.
		System.Gadget.settingsUI = 'settings.html';		// Use standard gadget settings stuff.
		System.Gadget.onSettingsClosed = settingsClosed;

		/* It is slightly tricky to set up the graph at this point as I don't actually know here if I have a single disk or multiple...
		 * Let's try this: set up two lines one for each disk, then I will only display captions etc later if there's data in the series.
		 * NOTE that as the last series here may be removed (if later I don't need it), the order of the additions is key! A bit hack: think of something better later. */
		graphObject.initialize( displayWidth, 70);	// The second parameter is the display height for the graph.
		tempGraphHandle =  graphObject.addSeries( "temperature", 15, 60, "#FFF62A", true );	// Last parameter is "autoRange".
		spaceGraphHandles = new Array();
		spaceGraphHandles.push( graphObject.addSeries( "space used 1", 0, 100, "#e09c79", false ) );
		spaceGraphHandles.push( graphObject.addSeries( "space used 2", 0, 100, "#00ccae", false ) );

		reload();
	}
	catch(error)
	{
		debugOut("OncePe2rRunInit: "+error.name+" - "+error.message);
	}
}

/// <summary>
/// Checks if NAS is reachable and inits the login timer.
/// Called once at startup or by clicking on the gadget title.
/// </summary>
function reload()
{
	// Remove any active timer
	try
	{
		clearInterval( nasObject.timerHandle );
	}
	catch(error)
	{
		debugOut("reload: "+error.name+" - "+error.message);
	}

	// Once per cycle initialization. .. soft reset processing, called on start up and per timer tick.
	try
	{
		debugOut('*reload');
		GadgetName.innerText = System.Gadget.name;	

		// Reload the settings
		SettingsManager.loadFile();  			  // Load all settings to memory.
		if ( SettingsManager.getKeyCount(settingsObj.GroupName) == 0 )
		{
			debugOut("No settings file found!");
			displayObject.displayMessage (-2, "no settings");
		}
		else
		{
			displayObject.displayMessage (200, "started up");

            displayObject.setIcon( "qnap" );
			//TODO: What is that? 
			//NasImage.href = 'http://' +SettingsManager.getValue(settingsObj.GroupName, "NASaddress")+":" + SettingsManager.getValue(settingsObj.GroupName, "NASport");
			// Get the stats, and then set a timer to do the same thing again every interval.
			login( getNasStatus );
			var interval = SettingsManager.getValue( settingsObj.GroupName, "interval" ) * 1000;
			if ( interval > 0 )	// Zero => don't poll.
				nasObject.timerHandle = setInterval ( "login( getNasStatus )", interval );
		}

		displayObject.showPane( "StatusData", null);
	}
	catch(error)
	{
		debugOut("reload: "+error.name+" - "+error.message);
	}
}

/// <summary>
/// Called by System.Gadget.onSettingsClosed when the settings dialog is being closed
function settingsClosed(p_event)
{
	// If save was selected
	if (p_event.closeAction == p_event.Action.commit)
	{
		// reload the hole plugin
		reload();
	}
}

/* 
 * -------------------------------------------------------------------------------------------------------------------
 */
/// <summary>
/// This function sends commands to the NAS
/// </summary>
function commandNas(	flag,		// prompt (default)  or cancel (false)  or do it (true)
						prompt, 	// Text to prompt with.
						command )	// Handler for the login response - thing which does the work.
{
	try
	{
		debugOut("commandNas, flag = " +flag +". prompt = " +prompt +". command = " +command );		// EG null as called from html - means "ask for confirmation".
		switch (flag)
		{
			case true:	// do it.
				displayObject.clearMessage(); // remove prompt.
				if ( command == "doShutdown" )
					doShutdown();
				else if ( command == "doRestart" )
					doRestart();
				else if ( command == "doWakeup" )
					doWakeup();
				break;
			case false:
				displayObject.displayMessage( 200, "cancelled");		// Tell them it cancelled ok.
				break;

			default:
				displayObject.displayPrompt( "<p>" +prompt +"&nbsp;<a href='#' onClick='return commandNas(true,  null, \"" +command +"\");'>Yes</a> / <a href='#' onClick='return commandNas(false, null, null);'>No</a></p>" );
				break;
		}
	}
	catch(error)
	{
		debugOut("commandNas: "+error.name+" - "+error.message);
	}
	return false;	// Don't refresh the whole page!
}

/// <summary>
/// We use WOL to wake up the device
/// </summary>
function doWakeup()
{
	debugOut("doWakeup");
	
	mac = SettingsManager.getValue( settingsObj.GroupName, "NASMACaddress" );
	ip = SettingsManager.getValue( settingsObj.GroupName, "NASaddress" );
	try {
		var objsh = new ActiveXObject("WScript.Shell");
		debugOut("doWakeup: " + "1");
		var line = '\"' + System.Gadget.path + '\\bin\\mc-wol.exe\" ' + mac
		debugOut("doWakeup: " + "2");
		line = line + ' /a ' + ip;
		debugOut("doWakeup: " + line);
		objsh.run(line, 0);
		debugOut("doWakeup: " + "done");
	}
	catch(error)
	{
		debugOut("doWakeup: "+error.name+" - "+error.message);
	}
}

/// <summary>
/// Restarting is done be calling restart.cgi script. Only works if preior to this authenitcated
/// func restartComplete is called after sending the request
/// </summary>
function doRestart()
{
	debugOut("doRestart");
	// Old till feb2011
	//nasObject.makeServerRequest( "/cgi-bin/restart.cgi",  "GET", restartComplete, null ); 	// Tell it to restart!
	url = "/cgi-bin/sys/sysRequest.cgi" + '?count=' + Math.random() + "&sid=" + encodeURIComponent(qnapSid) + "&subfunc=power_mgmt";
	action = "&apply=restart";
	nasObject.makeServerRequest( url + action,  "GET", processStateTable, null );
}

/// <summary>
/// Shuting down is done be calling restart.cgi script. Only works if preior to this authenitcated
/// func shutDownComplete is called after sending the request
/// </summary>
function doShutdown()
{
	debugOut("doShutdown");
	// Old till feb2011
	//nasObject.makeServerRequest( "/cgi-bin/restart.cgi?option=shutdown",  "GET", shutDownComplete, null ); 	// Tell it to shut down!
	url = "/cgi-bin/sys/sysRequest.cgi" + '?count=' + Math.random() + "&sid=" + encodeURIComponent(qnapSid) + "&subfunc=power_mgmt";
	action = "&apply=shutdown";
	nasObject.makeServerRequest( url + action,  "GET", processStateTable, null );
}

function restartComplete( status, text)
{
	displayObject.displayMessage( status, "restart" );
}
function shutDownComplete( status, text)
{
	displayObject.displayMessage( status, "shut down");
	if (status == 200 ) 	// Success, it's gone, so stop polling the thing.
		clearInterval( nasObject.timerHandle );
}


/* 
 * -------------------------------------------------------------------------------------------------------------------
 */

/// <summary>
/// Here comes the login and authentication stuff
/// </summary>
var old_user = "";
var old_pwd = "";
var old_ssl = "";

/// <summary>
/// This is called form a timer all <interval> sec. 
function login( andThen )	// input is callback method.
{
	user = SettingsManager.getValue(settingsObj.GroupName, "account");
	pwd = SettingsManager.getValue(settingsObj.GroupName, "password");
	ssl = SettingsManager.getValue(settingsObj.GroupName, "NASSecureLogin");
	
	if(user != old_user || pwd != old_pwd || ssl != old_ssl) {
		qnapSid = qnapSidNull;
		debugOut("login: " + "changed");
	}
	
	if (qnapSid != qnapSidNull)
	{
		andThen(200, null)
		return true;
	}
	
	debugOut("login: " + "do");
	
	old_user = user;
	old_pwd = pwd;
	old_ssl = ssl;
	
	user = encodeURIComponent(user);
	pwd = encodeURIComponent(ezEncode(utf16to8(pwd)));
	url = '/cgi-bin/authLogin.cgi?count=' + Math.random() + '&user=' + user + '&pwd=' + pwd + '&admin=1'
	
	nasObject.makeServerRequest( url,  "GET", andThen, null );
	
	return false;	// Don't refresh the whole page!
}

function loginComplete(text)
{
	qnapSid = extractXMLValue('authSid', text);
	debugOut("loginComplete: " + qnapSid);
}

function getNasStatus( status, text ) // Input is content of previous response (for callbacks) or null for straight calls - it's ignored.
{
	//debugOut("getNasStatus: " + status);
	debugOut("getNasStatus: (" + status + ") " + text);
	displayObject.displayMessage(status, "log on");
	//displayObject.displayMessage(200, status);	// Login failed, set error code and terminate.
	if (status == 200) // Response received ok, but did the login work ok?
	{
		if (text != null) {
			
			text = text.replace(/\s|\r\n/g,"");	// Strip all whitespace and carriage returns.
			if ( text.indexOf("errorValue") == -1 )		// It's the same string for both NAS types.
			{
				loginComplete(text);
	            // Check which device this is. At the moment not active
	            //if ( text.indexOf("<TITLE>ConceptronicCH3SNAS</TITLE>") != -1 )
	            //    dns323 = false;
	            //else
	            //    dns323 = true;
	            displayObject.setIcon( "qnap" );
	            
	            debugOut("getNasStatus: " + "OK");
	            
				processStateTable(null, null);		// Login ok, so go and do all the real work.
			}
		}
		else
		{
			processStateTable(null, null);		// Login ok, so go and do all the real work.
		}
	}
	else
	{
		displayObject.displayMessage(-1, "log on");	// Login failed, set error code and terminate.
		BlueFlasher.style.display ="none";
		// STOPS HERE here if login fails.
	}
}

function processStateTable( status, textResp)
{
	/* I'm getting devious here, which is probably a bad idea. This is the callback for a chain of commands and their processing, as defined
	 * by the static state table at the top of the page. If you call this with (null, null) then that sets the sequence off; it then runs to
	 * completion or the first error.
	*/
	//~ debugOut("processStateTable has status = " +status );
	if ( status === null )	// Sequence start command, not a callback. Come here once per table sweep.
	{
		// Wipe any old data off the screen for the fields where it builds up if ya don't!
		ClientData.innerHTML = "";
		ServerData.innerHTML = "";

		state = -1;			// Start here (gets incremented in a minute).
		goToNextState();
	}
	else	// This is a callback: part way through the table.
	{
		stateTable[state].nasCommand.match( /(.*\/)([^.]*)/ );	// Strip all except server command (file) name
		displayObject.displayMessage(status, RegExp.$2 );			// .. and display briefly.
		if ( status == 200 ) 	// -> success, continue processing
		{
			if ( stateTable[state].formatter !== null )		// Null if no work required.
				textResp = stateTable[state].formatter( textResp, stateTable[state].pattern );

			if (  stateTable[state].paneName  !== null)		// It's null for the status page where I have to split output over two panes.
				System.Gadget.document.getElementById( stateTable[state].paneName ).innerHTML += stateTable[state].output.replace("{0}", textResp );	// Output results.

			goToNextState();
		}
		else {
			qnapSid = qnapSidNull;
		}
		// Stop here if intermediate command fails.
	}

	function goToNextState()
	{
		state++;
		if ( state == stateTable.length )
			endSequence();
		else
		{
			nasObject.makeServerRequest( stateTable[state].nasCommand + '?count=' + Math.random() + "&sid=" + encodeURIComponent(qnapSid) + "&" + stateTable[state].nasArgs,  "GET", processStateTable, null ); 	// More work to do.
		}

		function endSequence()
		{
			// Remember the time we last read all the data, and display a permanent message to alert people about it.
			var now = new Date();
			lastRefreshTime = now.toString().replace( /(.*)UTC(.*)/, "$1") ;	// Dump everything after UTC. I know where I live!
			displayObject.displayMessage (200,  "<span style='color:gray'>"+lastRefreshTime +"</span>", true);
			debugOut(" last refresh time was = " + lastRefreshTime );
			BlueFlasher.style.display ="none";

			// And finally, if the visible pane is the graph pane, then update it.
			if ( GraphData.style.display == "block" )
				graphObject.drawGraph();
		}
	}
}
