/*	OInput parsing and output formatting - formatters.js
 *	phil wigglesworth, Deltalink Technologies
 *	http://philwigglesworth.net
 *	------------------------------------------------------
 *
 * Response handlers etc. To add a new command then you need to add a line into the FSM table, then
 * add any handlers into here.
 */

function formatStatus( text )
{
	text = text.replace(/\s|\r\n/g,"");	// Strip all whitespace and carriage returns for the status page - reduce dependence on Taiwan's web expertise.

	// Handles status page response.
	NetworkData.innerHTML = getNetworkStuff( text );    // No longer possible after 1.06
    ServerData.innerHTML = getServerStuff( text );    // No longer possible after 1.06
    
    var NasName =  extractXMLValue( "modelName", text);
    var Description = extractXMLValue( "internalModelName", text );
	StatusData.innerHTML = "<p style='padding-top:2px' onmouseover='displayObject.displayToolTip(\"" +Description +"\");' onmouseout='displayObject.clearToolTip();' >" +NasName +"</p>" ;    
	StatusData.innerHTML  += extractDisksUsage (text );
	//~ StatusData.innerHTML += extractDisksUsage (testHTML.replace(/\s|\r\n/g,"") );		// Uncomment to test two disks..

	// System temperature is a funny field in the web page - returned "hidden" and then displayed via JS.
	//StatusData.innerHTML += extractTempValue( text ) ;
    
	StatusData.innerHTML += "<span style='color:Khaki'>FW version: " +extractXMLValue( "version", text ) +"</span>";
        
	function getNetworkStuff( sourceText )
	{
		var fields  = new Array("eth0Ipaddress", "eth0Gateway", "eth0Hwaddr", "MTU", "eth0Speedtype", "eth0_speed" );
		var titles   = new Array("IP: ", "GW: ", "MAC: ", "MTU: ", "SpeedType: ", "Speed: " );
		var styles = new Array("", "", "", "", "color:Khaki; padding-top:2px", "color:Khaki" );
		return buildString  (sourceText, fields, titles, styles );
	}
	function getServerStuff( sourceText )
	{
		var fields  = new Array(/*"workgroup", "winsEnabled", "domainEnabled", */"appletalkEnabled", /*"appleZone", */
			"nfsEnabled", "webfsEnabled", "ftpEnabled", /*"ftpPort", "ftpMaxinstances", */"qphotoEnabled", "itunesEnabled",
			"upnpEnabled", /*"downloadEnabled", "webserverEnabled", "webserverPort", "regGlobalsEnabled", "ddnsEnabled", */
			"mysqlEnabled", "mysqlNetworking"/*, "sysPort", "qsurveillanceEnable", "bServiceEnable", "servicePort"*/ );
		
		//var titles   = new Array("IP: ", "GW: ", "MAC: ", "SpeedType: ", "Speed: ", "MTU: " );
		return buildString  (sourceText, fields, fields, null );
	}
	function buildString( sourceText, fields, titles, styles )
	{
		var output = "";	// Place to build output html in.
		for (var x = 0; x < fields.length; x++) {
			if (styles != null) {
				style = styles[x];
			} else {
				style = "";
			}
			output += "<p style='" +style +"'>" +titles[x]  +extractXMLValue( fields[x], sourceText )  +"</p>";		// Each one a new paragraph.
		}
		return output;
	}
	function extractPageValue( fieldName, fromThis)
	{
		/* Extract and return the value requested from the passed in html data. I'm sure you could do this more efficiently, but it's all a pain...
		 * This assumes that the form of the web page containing this stuff is as follows (this example is for the "Description" field):
		 *	<td align="right"><strong>Description:</strong></td>
		 *	<td><strong>&nbsp;DNS-323 NAS</strong></td>
		 * or for hard disk data (note missing closing tag on volume name strong, but not other disk data!):
		 * 	<tr><td class="labelCell2">Volume Name:</td><td><strong>&nbsp;Volume_1<strong></td></tr>
		 * The "fieldName" as input is used to pick this out.
		 */
		try
		{
			//var regEx = "(?:" +fieldName +":.*?<strong>&nbsp;)([^<]*)";
			var regEx = "(?:" + fieldName +"><!\[CDATA\[)([^\]]*)";
		
			//regEx.exec(fromThis);
			fromThis.match(regEx);
			debugOut("extractPageValue: "+RegExp.$1);
		}
		catch(error)
		{
			debugOut("extractPageValue: "+error.name+" - "+error.message);
		}
		return "123"; //RegExp.$1;		// GLOBAL
	}
	function extractTempValue( fromThis )
	{
        var regEx = /vartemper="(?:\d*):(\d\d)/;  // 1.06 (take from jscript bit). 1.05 was from body: /(?:HDTemperature.*\/(\d\d))/

		fromThis.match(regEx);
		var temp = RegExp.$1;
        
        //~ debugOut("extractTempValue: " +temp);
        
		graphObject.addValue( tempGraphHandle, temp );
		return drawBar( 	temp,
							SettingsManager.getValue(settingsObj.GroupName, "tempBarMax"),	// bar max is configurable.
							getColour( temp, SettingsManager.getValue(settingsObj.GroupName, "orangeTemp"),
											 SettingsManager.getValue(settingsObj.GroupName, "redTemp") ),
										"Temperature: " +temp +"&ordm;C", 
										"max temp is "+ SettingsManager.getValue(settingsObj.GroupName, "tempBarMax") +"&ordm;C" );
							
							
	}
	function extractDisksUsage(fromThis)
	{
		var output = "";
		try
		{
			var regex = /(?:VolumeName:<\/td><td><strong>&nbsp;)([^<]*).*?TotalHardDriveCapacity:[^\d]*(\d*).*?UsedSpace:[^\d]*(\d*)/g;
			var diskNumber = 0;
			var match;
			while((match = regex.exec(fromThis)) !== null)
			{
				diskNumber++;
				//~ debugOut("extractDisksUsage - disk "+diskNumber + " name: " +match[1] +" size: " +match[2] +" used: " +match[3]);
				var percentage	= (match[3]/match[2])*100;
				var capacity	= (match[2] /1000).toFixed(0); // Convert MB to GB, dump decimals.
				var colour = getColour( percentage, 	SettingsManager.getValue(settingsObj.GroupName, "orangeSpace"),
														SettingsManager.getValue(settingsObj.GroupName, "redSpace") );
				output += drawBar( 	percentage, 100, colour, 
									match[1] +" : " +percentage.toFixed(2) +"%",
									"capacity : " +capacity +"GB" );
				graphObject.addValue( spaceGraphHandles[diskNumber-1], percentage );		// Write to correct line.
			}			
			if ( (spaceGraphHandles.length > 1) && (diskNumber == 1) )	// NOW I know if there's one or two disks in this NAS, so trim any unneeded series.
				graphObject.removeSeries(spaceGraphHandles.pop() );	// Pop (zap) the handle of the LAST series and pass it to the graph object to delete.
		}
		catch(error)
		{
		    debugOut("extractDisksUsage: "+error.name+" - "+error.message);
		}
		return output;
	}
	function getColour( number, orangeValue, redValue )
	{
		try
		{
			var colour = "green";
			if ( number >  orangeValue )
			{
				colour = "orange";
				if ( number >  redValue )
				{
					colour = "red";
				}
				displayObject.showPane( 'StatusData', null);	// And force display to show red or orange!
			}
		}
		catch(error)
		{
		    debugOut("getColour: "+error.name+" - "+error.message);
		}
		return colour;
	}
	function drawBar( value, max, colour, caption, toolTip )	// Draws a bar.
	{
		try
		{
		 	//~ debugOut("drawBar: ");
			var barLength = Math.min( (value*displayWidth)/max, displayWidth);	// Never overflow display. displayWidth is the full bar (set in bar style). ** nbsp is for IE height defect.
			output = "<div class='bar' onmouseover='displayObject.displayToolTip(\"" +toolTip +"\");' onmouseout='displayObject.clearToolTip();' ><div class='bar-inner' style='width:";
			output += barLength + "px; background-color: " + colour + "'>&nbsp;</div></div><p style='padding-left:2px'>" +caption +"</p>";
			return  output;
		}
		catch(error)
		{
		    debugOut("drawBar: "+error.name+" - "+error.message);
			return "";
		}
	}
}
function formatLLTDStatusPage( text, pattern  )
{
	if (firmwareVersion >= "1.05")
		return checkEnabled( text, pattern );
	else
		return "";
}
function formatLanSetup( text, pattern)
{
	/*  The LAN speed is formatted as:
		  <input type="radio" name="speed" value="0" checked>Auto
		  <input type="radio" name="speed" value="100" >100
		  <input type="radio" name="speed" value="1000" >1000
	*/
	text.match( /name="speed"[^\d]*(\d+)" checked/ );
	var lanSpeed = RegExp.$1;
	if (lanSpeed === 0) lanSpeed = "auto";

	return "Lan speed: " +lanSpeed +"<br />Static IP: " +checkEnabled( text, 'checked>Static IP' ) +"<br />Jumbo: " +checkEnabled(text, 'checked>Enable' );

}
function formatPowerSetup( text)
{
	// This is a thing with:
	// [...] name="f_time">
	// <option value="5" selected>After 5 mins</option> [...etc...]
	text.match( /f_time(?:.*\n)*.*selected>([^<]*)/ );
	var timeout = RegExp.$1;
	return  "<br />Power man: " +checkEnabled(text, 'checked>Enable' ) +"<br />"  +timeout;
}
function checkEnabled( text, pattern )
{
	// Generic method - call with a pattern, returns enabled/ disabled depending on if found or not.
	if ( text.match( pattern) )
		return "<span class='on'>enabled</span>";
	else
		return "<span class='off'>disabled</span>";
}
//~ function formatArp( text )
//~ {
	//~ function getIP( fromThis )
	//~ {
		//~ var regEx = /(?:\b(?:\d{1,3}\.){3}\d{1,3}\b)+/g;	// "g" needed to make it match a list.
		//~ var ipList = new String([fromThis.match(regEx)]);
		//~ return ipList.replace(",", "<br />" );	// The regex stuff is separated by commas, I think.
	//~ }

	//~ debugOut("formatArp for " +text );
	//~ // Input: IP address HW type Flags HW address Mask Device 192.168.1.100 0x1 0x2 00:11:50:06:A7:88 * egiga0
	//~ // Let's just rip each IP address out of this and send it back as a list of those separated by breaks...
	//~ return getIP( text );
//~ }

//~ function formatUptime( text )
//~ {
	//~ function parseSeconds( string )                 // Input in seconds, output formatted time string...
   //~ {
		   //~ var seconds  = parseInt(string, 10);            // Convert to int
		   //~ var days = Math.floor(seconds/(24*3600));
		   //~ seconds = seconds % (24*3600);
		   //~ var hours   = Math.floor(seconds/3600);
		   //~ seconds = seconds % 3600;                       // Already counted the hours.
		   //~ var minutes = Math.floor(seconds/60);
		   //~ seconds = seconds % 60;         					// The balance of seconds
		   //~ return days + "d " +hours +":" +minutes +":" +seconds;
   //~ }

	//~ debugOut("formatUptime = " +text );
	//~ // Input: 1222090666.76 4508.73  The first number is the current time in fuckwit unix format; the second is the elapsed seconds since boot, I think.
	//~ var strings = text.split(" ");
	//~ return parseSeconds( strings[1] );
//~ }