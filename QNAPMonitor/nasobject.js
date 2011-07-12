/*	NAS comms - nasobject.js
 *	phil wigglesworth, Deltalink Technologies
 *	http://philwigglesworth.net
 *	------------------------------------------------------
 *
 * HTTP Communications stuff...
 * As I'm looking at one NAS per instance, I need one object to represent it, so an
 * Object Literal would appear to be good for that.
 *
 */
/*jsl:import utils.js*/
/*jsl:import lib/SettingsManager.js*/
/*jsl:import settings.js*/


var nasObject =
{
	timerHandle: null,		// Handle for the timer which goes off every "interval".
	timeoutHandle: null,	// The period is a gadget setting.
	httpHandle: null,		// Handle for the asych HTTP requests.
	seqNum:0,				// Sequence number for requests

	makeServerRequest: function ( command, type, callback, params )
		{
			try
			{
				//~ debugOut("nasObject.makeServerRequest: command = " +command);
				BlueFlasher.style.display = ( BlueFlasher.style.display == "block")?"none":"block";	// Toggle blue flashing light.
				/* Request the page anynchronously. All pages are http and on the NAS.
				 * There's an unbelieveably horrid javascript frig in here for "closure" - see http://bytes.com/forum/thread508775.html.
				 * If you run multiple requests in parallel this will probably screw you up. I don't at the moment. */
				 if ( command.indexOf("/proc") != -1)
					command += "?id=" +this.seqNum++;	// Add a once-only number to bypass IE7 cacheing.
				 
				var url = "http://";
				if (SettingsManager.getValue(settingsObj.GroupName, "NASSecureLogin") == "true")
					var url = "https://";
				url = url + SettingsManager.getValue( settingsObj.GroupName, "NASaddress" );
				
				if (SettingsManager.getValue(settingsObj.GroupName, "NASSecureLogin") == "true") {
					port = SettingsManager.getValue( settingsObj.GroupName, "NASportSSL" );
					if(port != "80")
						url = url + ":" + port;
				}
				else {
					port = SettingsManager.getValue( settingsObj.GroupName, "NASport" );
					if(port != "80")
						url = url + ":" + port;
				}
				
				url = url + command;
				debugOut("makeServerRequest: " + url);
				
				//~ debugOut("makeServerRequest " +url +", type = " +type +" params = " +params );
				this.httpHandle = httpreq = new ActiveXObject("Msxml2.ServerXMLHTTP.3.0");
				this.httpHandle.setOption(2, 13056);
				//this.httpHandle = new XMLHttpRequest();
				this.httpHandle.open( type, url, true);		// Parameters: method (GET, POST etc), url, true=asynch.
				if ( type == "POST")
				{
					this.httpHandle.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
					this.httpHandle.setRequestHeader("Content-length", params.length);
					this.httpHandle.setRequestHeader("Connection", "close");
				}
				// Use a dynamic function here, so I can use a generic callback method
				var currentThing = this;	// Closure frig - see above.
				currentThing.httpHandle.onreadystatechange = function () {if (currentThing.httpHandle.readyState == 4) {currentThing.genericCallback( callback );}};

				this.httpHandle.send(params);
				currentThing.timeoutHandle = setTimeout( function() {
							currentThing.timeoutCallback() ;},
							SettingsManager.getValue( settingsObj.GroupName, "timeout" ) * 1000);	// (function, wait time). Note syntax for closure bollocks.
			}
			catch(error)
			{
				debugOut("nasObject.makeServerRequest: "+error.name+" - "+error.message);
			}
		},
	genericCallback: function ( handler )
		{
			try
			{
				/* Pass everything back to the callback handler and let those suckers sort it out.
				 * The callback handler therefore takes two parameters - (1) return code and (2) the text returned.
				  * Known return codes are: 200 => success, 0 => transaction cancelled, 12029 = timeout. */

				// So this generic call back method is called for every asynch request that completes (readyState == 4).
				//~ debugOut("genericCallback status = " +this.httpHandle.status);
				clearTimeout( this.timeoutHandle );		// Clear timeout: dis is done..

				if ( handler !== null )
					handler( this.httpHandle.status, this.httpHandle.responseText );	// Call the handler for this state response.
			}
			catch(error)
			{
				//debugOut("nasObject.genericCallback: "+error.name+" - "+error.message);
			}
		},
	timeoutCallback: function ()
		{
			// Called when timeout occurs on an asynch http request. Note there's a scope problem here too, hence I do little.
			debugOut("timeoutCallback, killing request" );
			this.httpHandle.abort();	// Kill the http request.
		}
};
