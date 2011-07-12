/*	Message and data output - display.js
 *	phil wigglesworth, Deltalink Technologies
 *	http://philwigglesworth.net
 *	------------------------------------------------------
 *
 * Display things ...
 */

var displayObject =
{
	timerHandle: null,

	displayToolTip : function ( text ) { ToolTips.innerHTML = "<p>"+ text +"</p>"; },
	clearToolTip: function() { ToolTips.innerHTML = ""; },

	displayMessage : function ( status, text, persistent )
	{
		/* Status = http status	text = the message		persistent = leave message; no timeout
		 *  Status codes are basically http - 200 is success. Note always leaves error messages visible; they do not auto-clear even if requested.  */

		var currentThing = this;				// Closure frig.
		clearTimeout( currentThing.timerHandle );	// In case there's a pending timer..

		if ( status == 200 )
		{
			Panes.className = "";	// No graying out if it worked.
			if (!persistent)
			{
				Messages.innerHTML = "<p class='good'>" +text +" ok</p>";
				currentThing.timerHandle = setTimeout( function() {currentThing.clearMessage() ;}, 5000);
			}
			else	// Don't want the "ok" thing in green sitting around there, so just dump the persistent (good) message out.
				Messages.innerHTML = text;
		}
		else
		{
			Panes.className = "old"; // Gray out data
			switch ( status )
			{
				case 0:	// Asynch http status code for "timeout".
					Messages.innerHTML = "<p class='error'>" +text +" timeout</p>";
					break;

				case -1:	// My own status code for "login failed".
					Messages.innerHTML = "<p class='error'>" +text +" failed</p>";
					break;

				default:
					Messages.innerHTML = "<p class='error'>" +text +" error " +status +"</p>";
					break;
			}
		}
		Messages.style.display = "block";
	},

	displayPrompt : function ( text )
	{
		var currentThing = this;		// Closure frig.
		clearTimeout( currentThing.timerHandle );	// In case there's a pending timer..

		Messages.innerHTML = text;
		Messages.style.display = "block";
	},

	clearMessage: function ()
	{
		//~ debugOut("clear message");
		Messages.style.display = "none";
	},


	showPane: function (  paneName, clickedControl )		// Displays the requested pane, suppresses the other one(s).
	{
		try
		{
			//~ debugOut("showPane showing " +paneName );
			// Switch all panes off then switch on the one they want...
			var panes = getElementsByClassName( Panes, "div", "Pane");	// Can't just get divs as there are divs inside those!
			for (var pane = 0; pane < panes.length; pane++)
				panes[pane].style.display = "none";
			System.Gadget.document.getElementById( paneName ).style.display = "block";			// switch selected pane on.

			// Special code required for the graph pane - that one has VML crap in it, which needs to be drawn when the pane is rendered (not in the background). So do it now.
			if ( paneName == "GraphData" )
				graphObject.drawGraph();

			/* And then, because I can't get CSS to do it, set up the tabs to look pretty. Note that the default tab is
			 * set statically in the html (active/ inactive classes) */
			var anchors = PaneControls.getElementsByTagName("a");
			for (var tab = 0; tab < anchors.length; tab++)
				anchors[tab].className = "inactive";		// switch them all off.

			if ( clickedControl !== null )					// Test for optional parameter not present.
				clickedControl.className = "active";		// switch them all off.
			else
				System.Gadget.document.getElementById( "default" ).className = "active";
		}
		catch(error)
		{
			debugOut("extractDisksUsage: " + error.name + " - " + error.message);
		}
		return false; // don't reload if called from html.
	},
    
    setIcon: function ( device )
    {
        SettingsManager.setValue(settingsObj.GroupName, "NASDevice", device);  // Remember NAS type.
        SettingsManager.saveFile();   
        
        //if (dns323 == "false")  // Laborious as it may be null.
        //{
        //    backgroundImage.src = 'images/CH3SNAS_back.png';	// Display correct logo.
        //    BlueFlasher.style.left = "99px";
        //}
    }
};