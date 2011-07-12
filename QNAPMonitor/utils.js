/*	Gagdet utilities - utils.js
 *	phil wigglesworth, Deltalink Technologies
 *	http://philwigglesworth.net
 *	------------------------------------------------------
 *
 * Utilities used by more than one of the other files.
 *
 */

function getElementsByClassName(oElm, strTagName, strClassName)
{
	var arrElements = (strTagName == "*" && oElm.all)? oElm.all : oElm.getElementsByTagName(strTagName);
	var arrReturnElements = new Array();
	strClassName = strClassName.replace(/\-/g, "\\-");
	var oRegExp = new RegExp("(^|\\s)" + strClassName + "(\\s|$)");
	var oElement;
	for(var i=0; i<arrElements.length; i++)
	{
		oElement = arrElements[i];
		if(oRegExp.test(oElement.className))
		{
			arrReturnElements.push(oElement);
		}
	}
	return (arrReturnElements);
}

function debugOut(msg)
{
	System.Debug.outputString(msg);	// View with DebugView from MS.
}


function extractXMLValue( fieldName, fromThis)
{
	try
	{
		text = fromThis.replace(/\s|\r\n/g,"");	// Strip all whitespace and carriage returns.
		debugOut("extractPageValue: "+text);
		var regEx = '(?:' + fieldName +'><!\\[CDATA\\[)([^\\]]*)';
	
		text.match(regEx);
		debugOut("extractPageValue: "+RegExp.$1);
	}
	catch(error)
	{
		debugOut("extractPageValue: "+error.name+" - "+error.message);
	}
	return RegExp.$1;		// GLOBAL
}

function extractXMLValue2( fieldName, fromThis)
{
	try
	{
		text = fromThis.replace(/\s|\r\n/g,"");	// Strip all whitespace and carriage returns.
		debugOut("extractPageValue: "+text);
		//var regEx = "(?:" +fieldName +":.*?<strong>&nbsp;)([^<]*)";
		var regEx = '(?:' + fieldName +'>)([^<]*)';
	
		text.match(regEx);
		debugOut("extractPageValue: "+RegExp.$1);
	}
	catch(error)
	{
		debugOut("extractPageValue: "+error.name+" - "+error.message);
	}
	return RegExp.$1;		// GLOBAL
}