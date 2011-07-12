/*	Settings page handler - settings.js
 *	phil wigglesworth, Deltalink Technologies
 *	http://philwigglesworth.net
 *	------------------------------------------------------
 *  http://dotnetslackers.com/articles/net/SettingsManagerforWindowsVistaSidebarGadgets.aspx
 */

/*jsl:import lib/SettingsManager.js*/

// This url should link to the page were the plugin is beeing discussed, e.g. a webpage or a board
// At the moment the plain directory should suffice
var webPageUrl =  "http://forum.qnapclub.de/viewtopic.php?f=46&t=13036"; //philwigglesworth.net/BlogEngine.NET/post/2008/10/06/DNS-323-Windows-Vista-Gadget.aspx";
// This url is used to check if the current version is still the newest
var downloadUrl = "http://duckbox.info/qnap/QNAPMonitor/newest/"; //philwigglesworth.net/downloads/";

var settingsObj =
{
	GroupName: "monitor",	// For ini file - mandatory.

	onDisplay:function ()
	{
		try
		{
			/* Pull up the settings and display them in the dialog box. */
			//~ debugOut("settingsObj.onDisplay " + System.Gadget.version);
			copyright.innerHTML = "&copy;&nbsp;<a href='" +webPageUrl +"'>phil wigglesworth(2009) and Schischu(2010)</a>";
			version.innerHTML = "Version {0}".replace( "{0}", System.Gadget.version);
			System.Gadget.onSettingsClosing = settingsObj.settingsClosing;				// Set event handler up for close.
			// Start loading settings
			settingsObj.loadOrDefaultSettings();
			// Check for updates on entering settings
			updateObj.checkForUpdates();												// Note: terminates asynchronously.
		}
		catch(error)
		{
		    debugOut("settings.onDisplay: "+error.name+" - "+error.message);
		}
	},

	// Load settings from ini file or if no ini file exists set some default values
	// TODO: At the momenent it does not look like default values are being set
	loadOrDefaultSettings:function ()
	{
		debugOut("settingsObj.loadOrDefaultSettings");
		 
		// Assume all settings are textboxes (could be hidden), and all on this page.
		try
		{
			SettingsManager.loadFile();							// Get all into memory.
			// Look at the settings.html for what values we need to display
			var fields = Tabs.getElementsByTagName("input");
			// Walk through all needed values
			// Actually as good as this is, it will not help us if we are using muliple instances
			// So before doing anything else get the NASname which is basically or primary key
			// Not that this key is saved in the gadgetinstance settings and is beeing deleted if X is pressed
			/*NASname = System.Gadget.Settings.readString("_NASname");
			if (NASname == "") {
				NASname = "default";*/
			
			for (var field = 0; field < fields.length; field++)	// Write memory -> display
				try
				{
					// Lets add the primary key to ids if needed
					id = fields[field].id; //.replace("{NASname}", NASname);
					// Checkboxes have to be handelded differently form textboxes
					if (fields[field].type == "checkbox") {
						value = SettingsManager.getValue(this.GroupName, id, fields[field].checked);
						debugOut("settings: " + id + " = " + value);
						if (value == "true")
							fields[field].checked = value;
						else
							fields[field].checked = null;
					}
					else
						fields[field].value = SettingsManager.getValue(this.GroupName, id, fields[field].value);}
				catch(error)
				{
					Nasaddress = "failed to load";
					debugOut("settings.loadOrDefaultSettings: " + error.name + " - " + error.message);
				}
		}
		catch(error)
		{
			Nasaddress = "failed to load";
		    debugOut("settings.loadOrDefaultSettings: " + error.name + " - " + error.message);
		}
	},

	settingsClosing:function (event)
	{
		debugOut("settingsObj.settingsClosing, groupName = " + this.GroupName);
		if (event.closeAction == event.Action.commit)
			settingsObj.saveSettings();		// Note JS "closure" frig.
		event.cancel = false;
	},
	
	// Save all settings to the ini file
	saveSettings:function ()
	{   
		try
		{
			//~ debugOut("settingsObj.saveSettings");
			var fields = Tabs.getElementsByTagName("input");
		
			for (var field = 0; field < fields.length; field++) {
				
				// Do not save settings starting with a "_" with the SettingsManager but the SettingsClass
				if (fields[field].id[0] == '_') {
					continue;
				}
				
				
				if (fields[field].type == "checkbox")
					SettingsManager.setValue(this.GroupName, fields[field].id, fields[field].checked);
				else
					SettingsManager.setValue(this.GroupName, fields[field].id, fields[field].value);
			}
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

	// This displays the TABS in the settings dialog
	// Is being triggered by "<div class="tabcontents" style="display:none;" id="display" >"
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

// Checks for updates
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
			// Simply check if this version is still in the newest folder
			// http://duckbox.info/qnap/QNAPMonitor/newest/1.2/QnapMonitor.gadget
			var url = downloadUrl + System.Gadget.version + "/" + System.Gadget.name + ".gadget";
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
			download.innerHTML = "<a href='" + downloadUrl +"'>new version available</a>";
		else
			download.innerHTML = "this is the latest version";
	}

};