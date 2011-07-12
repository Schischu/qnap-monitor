/*	Settings page handler - settings.js
 *	phil wigglesworth, Deltalink Technologies
 *	http://philwigglesworth.net
 *	------------------------------------------------------
 */
/*jsl:import lib/SettingsManager.js*/

var webPageUrl =  "http://google.de"; //philwigglesworth.net/BlogEngine.NET/post/2008/10/06/DNS-323-Windows-Vista-Gadget.aspx";
var downloadUrl = "http://google.de"; //philwigglesworth.net/downloads/";

var settingsObj =
{
	GroupName: "monitor",	// For ini file - mandatory.

	onDisplay:function ()
	{
		try
		{
			/* Pull up the settings and display them in the dialog box. */
			//~ debugOut("settingsObj.onDisplay " +System.Gadget.version);
			copyright.innerHTML = "&copy;&nbsp;<a href='" +webPageUrl +"'>Schischu 2010</a>";
			version.innerHTML = "Version {0}".replace( "{0}", System.Gadget.version);
			System.Gadget.onSettingsClosing = settingsObj.settingsClosing;				// Set event handler up for close.
			settingsObj.loadOrDefaultSettings();
			updateObj.checkForUpdates();												// Note: terminates asynchronously.
		}
		catch(error)
		{
		    debugOut("settings.onDisplay: "+error.name+" - "+error.message);
		}
	},

	loadOrDefaultSettings:function ()
	{
		debugOut("settingsObj.loadOrDefaultSettings");
		 
		// Assume all settings are textboxes (could be hidden), and all on this page.
		try
		{
			SettingsManager.loadFile();								// Get all into memory.
			var fields =Tabs.getElementsByTagName("input");		// Get list of the things to display.
			for (var field = 0; field< fields.length; field++)	// Write memory -> display.
				fields[field].value = SettingsManager.getValue(this.GroupName, fields[field].id, fields[field].value);
		}
		catch(error)
		{
			Nasaddress = "failed to load";
		    debugOut("settings.loadOrDefaultSettings: "+error.name+" - "+error.message);
		}
	},

	settingsClosing:function (event)
	{
		debugOut("settingsObj.settingsClosing, groupName = " +this.GroupName);
		if (event.closeAction == event.Action.commit)
			settingsObj.saveSettings();		// Note JS "closure" frig.
		event.cancel = false;
	},
	saveSettings:function ()
	{   
		try
		{
			//~ debugOut("settingsObj.saveSettings");
			var fields = Tabs.getElementsByTagName("input");
			for (var field = 0; field< fields.length; field++)
				SettingsManager.setValue(this.GroupName, fields[field].id, fields[field].value);
		}
		catch(error)
		{
		    debugOut("settings.saveSettings: "+error.name+" - "+error.message);
		}
		finally
		{
			SettingsManager.saveFile();  			  // Saves all settings persistently.
			debugOut("settingsObj.saveSettings, all saved");
		}
	},

	showTab: function ( controlName, tabName)
	{
		//~ debugOut("settingsObj.showTab, name: " +tabName);
		// Switch all tabs off then switch on the one they want...
		var tabs = getElementsByClassName( Tabs, "div", "tabcontents" );	// Can't just get divs as there are divs inside those!
		for (var tab = 0; tab < tabs.length; tab++)
			tabs[tab].style.display = "none";
		document.getElementById( tabName ).style.display = "block";

		// Then switch all controls to be unselected.
		var tabContainer = document.getElementById("TabContainer");
		var controls = tabContainer.getElementsByTagName("div");
		for ( var cont = 0; cont < controls.length; cont++)
			controls[cont].className = "tab";
		controlName.className = "selectedtab tab";
	}
};


var _httpHandle; // Needed to be persistent across callback, hence not in object.
var updateObj =
{
	checkForUpdates:function ()
	{
		try
		{
			/* Check if the file on the web site has the same version number as this current file. The
			 * format of the gadget file name is "NasMonitorx.y.Gadget", where "x.y" is the version number.
			 * The theory is that there should be only one version on the site.
			 */
			download.innerHTML = "checking for updates...";
			var url = downloadUrl +"NasMonitor{0}.Gadget".replace( "{0}", System.Gadget.version );
			_httpHandle = new XMLHttpRequest();
			_httpHandle.open( "HEAD", url, true);

			var currentThing = this;				// Closure frig.

			_httpHandle.onreadystatechange = function () {if (_httpHandle.readyState == 4) {currentThing.updateCallback();}};
			_httpHandle.send(null);	// Don't bother about timeout as who cares what happens if it comes in and times out.
		}
		catch(error)
		{
		    debugOut("settings.checkForUpdates: "+error.name+" - "+error.message);
		}
	},
	updateCallback: function ()
	{
		// If we're up to date this comes back with 200. If out of date 404, or just time out if the server's down (ignore that).
		//~ debugOut("updateCallback, status = " +this._httpHandle.status);
		if (_httpHandle.status == 404)
			download.innerHTML = "<a href='" +webPageUrl +"'>new version available</a>";
		else
			download.innerHTML = "this is the latest version";
	}

};