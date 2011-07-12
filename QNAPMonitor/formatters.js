/*	OInput parsing and output formatting - formatters.js
 *	phil wigglesworth, Deltalink Technologies
 *	http://philwigglesworth.net
 *	------------------------------------------------------
 *
 * Response handlers etc. To add a new command then you need to add a line into the FSM table, then
 * add any handlers into here.
 */

/// <summary>
/// Strip all whitespace and carriage returns
/// </summary>
function replaceWS(text)
{
	return text.replace(/\s|\r\n/g,""); // 
}

//////////////////////////////////////////////

/// <summary>
/// Generates the status panel html code
/// </summary>
function parseStatusData()
{
	html = "";
	//                  TITLE,          VAR,                                                         FORMAT, PATTERN, STYLE,           TOOLTIP
	html += buildString("",             v_modelName + " [" + v_platform + "]",                          "text", "", "padding-top:2px", "Internal Model Name: " + v_internalModelName);
	html += buildString("FW",           v_version + " " + v_build,                                      "text", "", "color:Khaki",     "Firmware");
	html += buildString("System Temp.", v_sys_tempc + "&#8451;",                                        "text", "", "color:Khaki",     "System Temp in Celsius");
	html += buildString("Uptime",       v_uptime_day +"d " + v_uptime_hour + "h " + v_uptime_min + "m", "text", "", "color:Khaki",     "Firmware");
	
	free_memory_percent = (100 - (parseFloat(v_free_memory) / parseFloat(v_total_memory)) * 100).toFixed(0)
	html += buildString("Free Space " + free_memory_percent + "%", free_memory_percent, "bar", 100, "green", "Total free space of all disks");
	
	return html;
}

/// <summary>
/// Generates the network panel html code
/// </summary>
function parseNetworkData( sourceText )
{
	html = "";
	//                  TITLE,       VAR,             FORMAT, PATTERN, STYLE,                          TOOLTIP
	html += buildString("IpAddr",    v_eth0Ipaddress, "text", "",      "",                             "eth0 Ip Address");
	html += buildString("Gateway",   v_eth0Gateway,   "text", "",      "",                             "eth0 Gateway");
	html += buildString("MAC",       v_eth0Hwaddr,    "text", "",      "",                             "eth0 Hw Address");
	html += buildString("SpeedType", v_eth0Speedtype, "text", "",      "color:Khaki; padding-top:2px", "eth0 Speedtype");
	html += buildString("Speed",     v_eth0_speed,    "text", "",      "color:Khaki",                  "eth0 Speed");
	html += buildString("MTU",       v_MTU,           "text", "",      "",                             "MTU");


	return html
}

/// <summary>
/// Generates the server panel html code
/// </summary>
function parseServerData()
{
	html = "<div style='overflow-y:auto; height:158px; '; ";
	//                  TITLE,       VAR,             FORMAT, PATTERN, STYLE
	html += buildString("MS Server",       v_msServerEnabled,     "bool", "1", "");
	html += buildString("&nbsp;&nbsp;Workgroup",     v_workgroup,           "text", "", "");
	html += buildString("&nbsp;&nbsp;Type",          v_msServertype,        "text", "", "");
	html += buildString("WINS",            v_winsEnabled,         "bool", "1", "");
	html += buildString("Domain",          v_domainEnabled,       "bool", "1", "");
	html += buildString("AppleTalk",       v_appletalkEnabled,    "bool", "", "");
	html += buildString("&nbsp;&nbsp;AppleZone",     v_appleZone,           "text", "", "");
	html += buildString("NFS",             v_nfsEnabled,          "bool", "1", "");
	html += buildString("WebFS",           v_webfsEnabled,        "bool", "1", "");
	html += buildString("FTP",             v_ftpEnabled,          "bool", "1", "");
	html += buildString("&nbsp;&nbsp;Port",          v_ftpPort,             "text", "", "");
	html += buildString("&nbsp;&nbsp;Max. User",     v_ftpMaxinstances,     "text", "", "");
	html += buildString("QPhoto",          v_qphotoEnabled,       "bool", "1", "");
	html += buildString("iTunes",          v_itunesEnabled,       "bool", "1", "");
	html += buildString("Upnp",            v_upnpEnabled,         "bool", "1", "");
	html += buildString("Download",        v_downloadEnabled,     "bool", "1", "");
	html += buildString("WebServer",       v_webserverEnabled,    "bool", "1", "");
	html += buildString("&nbsp;&nbsp;Port",          v_webserverPort,       "text", "", "");
	html += buildString("RegGlobals",      v_regGlobalsEnabled,   "bool", "1", "");
	html += buildString("DDNS",            v_ddnsEnabled,         "bool", "1", "");
	html += buildString("MySql",           v_mysqlEnabled,        "bool", "1", "");
	html += buildString("&nbsp;&nbsp;Networking",    v_mysqlNetworking,     "bool", "", "");
	html += buildString("Sys Port",        v_sysPort,             "text", "1", "");
	html += buildString("QSurveillance",   v_qsurveillanceEnable, "bool", "1", "");
	html += buildString("Bonjour Service", v_bServiceEnable,      "bool", "1", "");
	html += buildString("&nbsp;&nbsp;Port",          v_servicePort,         "text", "", "");
	html += "</div>";
	return html
}

//////////////////////////////////////////////
	
/// <summary>
/// Formats the sysinfo mana request
/// </summary>
function formatSysinfo( text )
{
	text = replaceWS(text);
	
	// COMMON ->
	v_modelName         = extractXMLValue("modelName", text);
	v_internalModelName = extractXMLValue("internalModelName", text);
	v_platform          = extractXMLValue("platform", text);
	v_version           = extractXMLValue("version", text);
	v_build             = extractXMLValue("build", text);
	// COMMON <-
	
	v_cpu_usage    = extractXMLValue2("cpu_usage", text);
	v_total_memory = extractXMLValue2("total_memory", text);
	v_free_memory  = extractXMLValue2("free_memory", text);
	
	v_uptime_day  = extractXMLValue2("uptime_day", text);
	v_uptime_hour = extractXMLValue2("uptime_hour", text);
	v_uptime_min  = extractXMLValue2("uptime_min", text);
	v_sys_tempc   = extractXMLValue2("sys_tempc", text);
	
	graphObject.addValue( tempGraphHandle, v_sys_tempc );
	debugOut("formatSysinfo: " + v_sys_tempc);

	StatusData.innerHTML = parseStatusData();
}

/// <summary>
/// Formats the netinfo mana request
/// </summary>
function formatNetinfo( text )
{
	text = replaceWS(text);
	
	// COMMON ->
	v_modelName         = extractXMLValue("modelName", text);
	v_internalModelName = extractXMLValue("internalModelName", text);
	v_platform          = extractXMLValue("platform", text);
	v_version           = extractXMLValue("version", text);
	v_build             = extractXMLValue("build", text);
	// COMMON <-
	
	// sub func ownContent lanInfo ->
	v_msServerEnabled  = extractXMLValue("msServerEnabled", text);
	v_lanType          = extractXMLValue("lanType", text);
	v_eth0Speedtype    = extractXMLValue("eth0Speedtype", text);
	v_eth0Connecttype  = extractXMLValue("eth0Connecttype", text);
	v_eth0Ipaddress    = extractXMLValue("eth0Ipaddress", text);
	v_eth0Netmask      = extractXMLValue("eth0Netmask", text);
	v_eth0Gateway      = extractXMLValue("eth0Gateway", text);
	v_eth0Hwaddr       = extractXMLValue("eth0Hwaddr", text);
	v_eth0_speed       = extractXMLValue("eth0_speed", text);
	v_MTU              = extractXMLValue("MTU", text);
	v_eth0status       = extractXMLValue("eth0status", text);
	v_dhcpserverEnable = extractXMLValue("dhcpserverEnable", text);
	// sub func ownContent lanInfo <-
	
	// sub func ownContent lnetworkFileservice ->
	v_msServerEnabled     = extractXMLValue("msServerEnabled", text);
	v_workgroup           = extractXMLValue("workgroup", text);
	v_msServertype        = extractXMLValue("msServertype", text);
	v_winsEnabled         = extractXMLValue("winsEnabled", text);
	v_domainEnabled       = extractXMLValue("domainEnabled", text);
	v_appletalkEnabled    = extractXMLValue("appletalkEnabled", text);
	v_appleZone           = extractXMLValue("appleZone", text);
	v_nfsEnabled          = extractXMLValue("nfsEnabled", text);
	v_webfsEnabled        = extractXMLValue("webfsEnabled", text);
	v_ftpEnabled          = extractXMLValue("ftpEnabled", text);
	v_ftpPort             = extractXMLValue("ftpPort", text);
	v_ftpMaxinstances     = extractXMLValue("ftpMaxinstances", text);
	v_qphotoEnabled       = extractXMLValue("qphotoEnabled", text);
	v_itunesEnabled       = extractXMLValue("itunesEnabled", text);
	v_upnpEnabled         = extractXMLValue("upnpEnabled", text);
	v_downloadEnabled     = extractXMLValue("downloadEnabled", text);
	v_webserverEnabled    = extractXMLValue("webserverEnabled", text);
	v_webserverPort       = extractXMLValue("webserverPort", text);
	v_regGlobalsEnabled   = extractXMLValue("regGlobalsEnabled", text);
	v_ddnsEnabled         = extractXMLValue("ddnsEnabled", text);
	v_mysqlEnabled        = extractXMLValue("mysqlEnabled", text);
	v_mysqlNetworking     = extractXMLValue("mysqlNetworking", text);
	v_sysPort             = extractXMLValue("sysPort", text);
	v_qsurveillanceEnable = extractXMLValue("qsurveillanceEnable", text);
	v_bServiceEnable      = extractXMLValue("bServiceEnable ", text);
	v_servicePort         = extractXMLValue("servicePort", text);
	// sub func ownContent lnetworkFileservice <-
	
	StatusData.innerHTML  = parseStatusData();
	NetworkData.innerHTML = parseNetworkData();
	ServerData.innerHTML  = parseServerData();
	
	SettingsManager.setValue( settingsObj.GroupName, "NASMACaddress", v_eth0Hwaddr);
	SettingsManager.saveFile();
}

function buildString( title, value, format, pattern, style, tooltip )
{
	if ( format == "text")
		return buildStringText(title, value, style, tooltip);
	if ( format == "bool")
		return buildStringText(title, buildStringBool(value, pattern), style, tooltip);
	if ( format == "bar")
		return buildStringBar(title, value, pattern, style, tooltip);
	return "";
}

function buildStringText( title, value, style, tooltip )
{
	if (tooltip != "")
		tooltip =  " onmouseover='displayObject.displayToolTip(\"" + tooltip + "\");' onmouseout='displayObject.clearToolTip();'"
	if (title != "")
		title += ": ";
	return "<p style='" +style + "'" + tooltip + ">" + title + value +"</p>";
}

function buildStringBool( value, pattern )
{
	// Generic method - call with a pattern, returns enabled/ disabled depending on if found or not.
	if ( value.match(pattern) )
		return "<span class='on'>enabled</span>";
	else
		return "<span class='off'>disabled</span>";
}

function buildStringBar( caption, value, max, colour, toolTip )	// Draws a bar.
{
	try
	{
		//~ debugOut("drawBar: ");
		var barLength = Math.min( (value*displayWidth)/max, displayWidth);	// Never overflow display. displayWidth is the full bar (set in bar style). ** nbsp is for IE height defect.
		output = "<div class='bar' onmouseover='displayObject.displayToolTip(\"" + toolTip +"\");' onmouseout='displayObject.clearToolTip();' ><div class='bar-inner' style='width:";
		output += barLength + "px; background-color: " + colour + "'>&nbsp;</div></div><p style='padding-left:2px'>" + caption +"</p>";
		return  output;
	}
	catch(error)
	{
		debugOut("drawBar: "+error.name+" - "+error.message);
		return "";
	}
}

function buildDisksUsage(fromThis)
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
		}			
	}
	catch(error)
	{
		debugOut("extractDisksUsage: "+error.name+" - "+error.message);
	}
	return output;
}