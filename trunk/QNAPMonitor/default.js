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
	this.nasArgs = nasArgs;	// Thing to send to the NAS
	this.output = output;			// Format string for output.
	this.paneName = paneName;		// Name of the pane to display this on.
	this.formatter = formatter;	// Format routine if special formatting required.
	this.pattern = pattern;		// Search pattern (use to search input).
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
var stateTable =
[
	new StateObject("/cgi-bin/management/manaRequest.cgi", "subfunc=netinfo", 	null, 					null, 						formatNetinfo, 	null, false),
	new StateObject("/cgi-bin/management/manaRequest.cgi", "subfunc=sysinfo", 	null, 					null, 						formatSysinfo, 	null, false),
    // The following aren't available from 1.06 firmware onwards...
	//~ new StateObject("/proc/version",	 	"<p style='padding-top:2px; color:Khaki'>Version: {0} </p>", 	"OsData", null, null, true ),
	//~ new StateObject("/proc/uptime", 	 	"<p style='padding-top:5px'>Up time: {0} </p>",  				"StatusData", formatUptime, null, true ),
	//~ new StateObject("/proc/net/arp", 	 	"<p style='padding-top:2px'>Client list:<br />{0}</p>",  		"ClientData", 	formatArp, null, true),
	//new StateObject("/goform/dhcp",		"<p>DHCP: {0}</p>", 	"ServerData", 				checkEnabled, 	'name="f_dhcpsvr_set" value="1"', false ),
	//new StateObject("/goform/iTunesServ", 	"<p>iTunes: {0}</p>", 	"ServerData", 				checkEnabled,	'name="iTurnServ" checked>Enable', false ),
	//new StateObject("/goform/adv_upnpav", 	"<p>UPnP: {0}</p>", 	"ServerData", 				checkEnabled, 	'name="f_UPNPAVServ" checked>Enable', false ),
	//new StateObject("/goform/adv_ftp_setting", "<p>FTP: {0}</p>", 	"ServerData", 				checkEnabled, 	"Started", false ),
	//new StateObject("/goform/Maint_LLTD", 	"<p>LLTD: {0}</p>", 	"ServerData", 				formatLLTDStatusPage, 'name="f_status" checked>Enable', true ), // Must be done after /goform/adv_status page.
	//new StateObject("/goform/adv_lan", 	"<p>{0}</p>", 			"NetworkData", 				formatLanSetup,	null, false  ),
	//new StateObject("/goform/adv_power_management", "<p>{0}</p>", 	"ServerData", 				formatPowerSetup, null, false),
	//new StateObject("/goform/formLogout", null, null, null, null, false)
];
var lastRefreshTime;
var firmwareVersion;	// Nasty global - set by /goform/adv_status and read by LLTD status.
var displayWidth = 90;	// Constant for the width of the display of graphic items (eg bars and graphs). Must match class ".bar".
var spaceGraphHandles;	// Multiple possible as multiple disks may be found.
var tempGraphHandle;
var dns323;         	// So far I've only two to worry about (DNS323 or CH3SNAS), so use a flag. Can't tell which it is until you've logged into it.
var qnapSidNull = "00000000";
var qnapSid = qnapSidNull;

// Test html output for NAS with two disks.
var testHTML = '<tr><td class="labelCell2">Volume Name:</td><td><strong>&nbsp;Volume_1<strong></td></tr>\n\
<tr><td class="labelCell2">Total Hard Drive Capacity:</td><td><strong>&nbsp;313995 MB</strong></td></tr>\n\
<tr><td class="labelCell2">Used Space:</td><td><strong>&nbsp;59937 MB</strong></td></tr>\n\
<tr><td class="labelCell2">Unused Space:</td><td><strong>&nbsp;254058 MB</strong></td></tr></table><hr>;\n \
<table border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse" bordercolor="#111111" width="505" id="AutoNumber24">\n\
<tr><td class="labelCell2">Volume Name:</td><td><strong>&nbsp;Volume_2<strong></td></tr>\n\
<tr><td class="labelCell2">Total Hard Drive Capacity:</td><td><strong>&nbsp;313995 MB</strong></td></tr>\n\
<tr><td class="labelCell2">Used Space:</td><td><strong>&nbsp;300000 MB</strong></td></tr>\n\
<tr><td class="labelCell2">Unused Space:</td><td><strong>&nbsp;13995MB</strong></td></tr></table><hr></DIV>       </DIV>';

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
		var ident = System.Gadget.name + " version " +System.Gadget.version;
		debugOut("**OncePerRunInit for " +ident +" System.Gadget.path = " +System.Gadget.path);
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

function reload()
{
	// Once per cycle initialization. .. soft reset processing, called on start up and per timer tick.
	try
	{
		debugOut('*reload');
		GadgetName.innerText = System.Gadget.name;	

		SettingsManager.loadFile();  			  // Load all settings to memory.
		if ( SettingsManager.getKeyCount(settingsObj.GroupName) == 0 )
		{
			debugOut("No settings file found!");
			displayObject.displayMessage (-2, "no settings");
		}
		else
		{
			displayObject.displayMessage (200, "started up");

            // If a CH3NAS then switch image to that.
            dns323 = SettingsManager.getValue(settingsObj.GroupName, "DNS323" );
            displayObject.setIcon( dns323 );
                
			NasImage.href = 'http://' +SettingsManager.getValue(settingsObj.GroupName, "NASaddress")+":" + SettingsManager.getValue(settingsObj.GroupName, "NASport");
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
function settingsClosed(p_event)
{
	if (p_event.closeAction == p_event.Action.commit)
	{
		clearInterval( nasObject.timerHandle );
		reload();
	}
}

/* Restart, shut down and similar NAS commands
 * -------------------------------------------------------------------------------------------------------------------
 */
function commandNas(	flag,			// prompt (default)  or cancel (false)  or do it (true)
						prompt, 		// Text to prompt with.
						command )	// Handler for the login response - thing which does the work.
{
	try
	{
		debugOut("commandNas, flag = " +flag +". prompt = " +prompt +". command = " +command );		// EG null as called from html - means "ask for confirmation".
		switch (flag)
		{
			case true:	// do it.
				displayObject.clearMessage();		// remove prompt.
				if ( command == "doShutdown" )		// Kind of nasty but you can't just pass the "command" as a parameter.
					doShutdown(0,"");
				else if ( command == "doRestart" )
					doRestart(0,"");
				else if ( command == "doWakeup" )
					doWakeup(0,"");
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

function doWakeup( status, text )
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
	//nasObject.makeServerRequest( "/cgi-bin/restart.cgi",  "GET", restartComplete, null ); 	// Tell it to restart!
}

// From 1.06 onwards you have to log in first, then execute these commands.. so this is the login response handler.
function doRestart( status, text )
{
	debugOut("doRestart");
	nasObject.makeServerRequest( "/cgi-bin/restart.cgi",  "GET", restartComplete, null ); 	// Tell it to restart!
}
function doShutdown( status, text )
{
	debugOut("doShutdown");
	nasObject.makeServerRequest( "/cgi-bin/restart.cgi?option=shutdown",  "GET", shutDownComplete, null ); 	// Tell it to shut down!
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


/* Extraction and processing of data from the NAS web server
 * -------------------------------------------------------------------------------------------------------------------
 */
function login( andThen )	// input is callback method.
{
	if (qnapSid != qnapSidNull)
	{
		andThen(200, null)
		return true;
	}
	user = SettingsManager.getValue(settingsObj.GroupName, "account");
	user = encodeURIComponent(user);
	pwd = SettingsManager.getValue(settingsObj.GroupName, "password");
	pwd = encodeURIComponent(ezEncode(utf16to8(pwd)));
	url = '/cgi-bin/authLogin.cgi?count=' + Math.random() + '&user=' + user + '&pwd=' + pwd + '&admin=1'
	
	nasObject.makeServerRequest( url,  "GET", andThen, null );
	
	return false;	// Don't refresh the whole page!
}

function loginComplete(text)
{
	//try
	//{
		qnapSid = extractXMLValue('authSid', text);
		//debugOut("loginComplete: " + text);
		debugOut("loginComplete: " + qnapSid);
	//}
	//catch(error)
	//{
	//	debugOut("loginComplete: "+error.name+" - "+error.message);
	//}
}

function getNasStatus( status, text ) // Input is content of previous response (for callbacks) or null for straight calls - it's ignored.
{
	//debugOut("getNasStatus: " + status);
	debugOut("getNasStatus: " + text);
	displayObject.displayMessage(status, "log on");
	//displayObject.displayMessage(200, status);	// Login failed, set error code and terminate.
	if (status == 200)				// Response received ok, but did the login work ok?
	{
		if (text != null) {
			
			text = text.replace(/\s|\r\n/g,"");	// Strip all whitespace and carriage returns.
			if ( text.indexOf("errorValue") == -1 )		// It's the same string for both NAS types.
			{
				loginComplete(text);
	            /* Logged into something... It could be:
				 * (a) "<TITLE>Conceptronic CH3SNAS</TITLE>"; or
				 * (b)  a DNS323 in which case the title is the device name set by user, but it's
				 * 		got "DNS-323" in "<TD width="100%">Product Page:&nbsp;DNS-323</TD>".
				 * Assume DNS323 by default, look for the string in (a).*/
	            //if ( text.indexOf("<TITLE>ConceptronicCH3SNAS</TITLE>") != -1 )
	            //    dns323 = false;
	            //else
	                dns323 = true;
	            displayObject.setIcon( dns323 );
	            
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
			if ( !dns323 )			// Gobble any disabled states.
			{
				while ( state !== stateTable.length && stateTable[state].dns323only )	// It's not a 323, and this is a 323 only command, so suppress it.
					state++;
				if ( state == stateTable.length )
					endSequence();
			}
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
