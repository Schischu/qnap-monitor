/*	Graph drawing - graph.js
 *	phil wigglesworth, Deltalink Technologies
 *	http://philwigglesworth.net
 *	------------------------------------------------------
 *
 * A little object to handle drawing of graphs.
 * Usage: initialize(), then addSeries() for each data series, then addValue() for each point, then drawGraph() to output what you have.
 */
var graphObject =
{
	series: null,		// Buckets for the data series I'll support.
	names:[],			// Array for names of data series
	maxValues: [],		// Array for biggest value in the above.
	minValues:[],		// .. Min values to go with the above.
	colours: [],		// Array for colours.
	autoRange: [],		// Boolean - if true, automatically expands range to fit data.

	maxWidth: null,	// Display maxima
	maxHeight: null,

	initialize : function(width, height )
	{
		this.maxHeight = height;
		this.maxWidth = width;
		this.series = new Array();			// Initialize an array to store each data series..
	},

	addSeries : function ( name, minimum, maximum, colour, autoRange)	// autoRange - stretch range to fit data.
	{
		// Add a data series... That's an array of buckets for the series, which is added to the series array created at initialize time.
		try
		{
			this.colours.push( colour );
			this.names.push( name );
			this.minValues.push( minimum );
			this.maxValues.push( maximum );
			this.autoRange.push( autoRange );
			return this.series.push ( new Array() ) -1; 	// Returns the length of the series array -1, which is the index "handle" for this data series.
		}
		catch(error)
		{
		    debugOut("graphObject.addSeries: "+error.name+" - "+error.message);
		    return -1;
		}
	},

	removeSeries : function ( seriesNumber )
	{
		//~ debugOut("graphObject.removeSeries:  request, asked to remove " +seriesNumber +" which is " +this.names[seriesNumber]);
		this.series.splice ( seriesNumber, 1);		// Remove the specified series from the list.
	},

	addValue: function ( seriesNum, value)
	{
		try
		{
		 	//~ debugOut("graphObject.addValue");
		
			// Add the passed in value to the appropriate series. Push the new value onto the end of the data series, shift left if full.
			value= parseInt(value, 10); 	// dispose of decimal places.
			if( this.series[seriesNum].push(value) > this.maxWidth )		// Push returns the *length* of the array.
				this.series[seriesNum].shift();							// Shift all elements left => lose oldest data.

			if (this.autoRange[seriesNum])					// Rescale the axes if necessary.
			{
				if (value > this.maxValues[seriesNum] )
					this.maxValues[seriesNum] = value;
				else
					if ( value < this.minValues[seriesNum])
						this.minValues[seriesNum] = value;
			}
		}
		catch(error)
		{
		    debugOut("graphObject.addValue: "+error.name+" - "+error.message);
		}
	},

	drawGraph: function ()
	{
		//~ debugOut("drawing this many graphs " +this.series.length );
		drawBackgroundGrid(this);			// Output the pretty grid.
		for (var i=0; i< this.series.length; i++)	// Then write each data series line.
			document.getElementById( "series"+i ).path = drawLine( this.series[i], this.minValues[i], this.maxValues[i], this.maxHeight);

		function drawLine( dataSeries, minValue, maxValue, displayHeight)
		{
			// The format is: "m x,y | x1, y1 | x2,x3 e". Not sure what the "e" is but MS use it.
			try
			{
				var line = "m ";
				for (var i = 0; i < dataSeries.length; i++)	// For each data point..
				{
					var value = dataSeries[i];
					//~ debugOut("min: " +minValue +" value: " +value +" maxValue: " +maxValue);
					if ( (value >=minValue) && ( value <= maxValue))	// Range check.
					{
						var outputPixel = displayHeight/ ((maxValue-minValue)/(value -minValue));
						//~ debugOut(" drawing value: " +value +" outputPixel: " +outputPixel);
						line += parseInt(i, 10) + "," +parseInt(displayHeight-outputPixel, 10);
						if (i != dataSeries.length)
							line += " l ";
						else
							line += " e";
					}
				}
			}
			catch(error)
			{
				debugOut("graphObject.drawGraph.drawLine: "+error.name+" - "+error.message);
			}
			return line;
		}

		function drawBackgroundGrid(thisObject)
		{
			try
			{
				/* Ah, here's one reason I have a 30" screen. This is the vml crap which has to be written straight into the graph pane on display - you can't write it to the html and then expect the
				 * browser to execute it on display, it seems. So when this pane is displayed, write this out. */
				var vmlString =
					"<v:shape id='gridy'  style='width:90;height:70;top:7;left:0;position:absolute;' filled='false' strokeweight='1pt' strokecolor='#666666' coordorigin='0 0' coordsize='90 70'path=' m 10,0 l 10,70  m 20,70 l 20,0 m 30,70 l 30,0  m 40,70 l 40,0  m 50,70 l 50,0  m 60,70 l 60,0  m 70,70 l 70,0  m 80,70 l 80,0 '/>\
					 <v:shape id='gridx'  style='width:90;height:70;top:7;left:0;position:absolute;' filled='false' strokeweight='1pt' strokecolor='#555555' coordorigin='0 0' coordsize='90 70'path=' m 0,5 l 90,5  m 0,10 l 90,10 m 0,15 l 90,15  m 0,20 l 90,20  m 0,25 l 90,25 m 0,30 l 90,30 m 0,35 l 90,35 m 0,40 l 90,40 m 0,45 l 90,45 m 0,50 l 90,50 m 0,55 l 90,55 m 0,60 l 90,60 m 0,65 l 90,65 ' />\
					 <v:shape id='border' style='width:90;height:70;top:7;left:0;position:absolute;' filled='false' strokeweight='1pt' strokecolor='#444444'  coordorigin='0 0' coordsize='90 70' path='m 0,70 l 90,70 l 90,0 l 0,0 l 0,70' />";
				var caption = "";
				for (var i = 0; i < thisObject.series.length; i++)	// For each data series... set colour and write both line and caption.
				{
					vmlString += "<v:shape id='series" +i +"' style='width:90;height:70;top:7;left:0;position:absolute;' filled='false' strokeweight='1pt' strokecolor='-0-' fillcolor='#7EE444' coordorigin='0 0' coordsize='90 70'/>".replace("-0-", thisObject.colours[i] );
					caption += "<span style='line-height:1.0;color:"  +thisObject.colours[i]  +"'>" +thisObject.names[i] +" (" +thisObject.minValues[i] +"-" +thisObject.maxValues[i]  +")</span><br />";
				}

				// As usual I'm having trouble with js magic characters here. 90 and 70 are the default height and widths, which I overwrite here...
				vmlString = vmlString.replace( new RegExp( "90", "g" ), thisObject.maxWidth);			// That's the parameter which should be the same as the "bar width" and which I expect to tinker with most...
				GraphData.innerHTML  = vmlString.replace( new RegExp( "70", "g" ), thisObject.maxHeight);	// ... other than this one of course.
				GraphData.innerHTML  += "<p style='position:absolute; top:80px'>" +caption +"</p>";				// Add caption
			}
			catch(error)
			{
			    debugOut("graphObject.drawBackground: "+error.name+" - "+error.message);
			}
		}
	},

	testHarness: function ()
	{
		// Test code - draws fancy shapes.
		try
		{
			debugOut("graphObject.testHarness maxWidth: "+this.maxWidth +" maxHeight:" +this.maxHeight);

			var y1=0;
			var y2 =100;
			for (var x=0; x<this.maxWidth; x++)	// For each point on the chart..
			{
				this.addValue( 0, y1);
				y1++;

				this.addValue( 1, y2);
				y2--;
			}
		}
		catch(error)
		{
		    debugOut("graphObject.testHarness: "+error.name+" - "+error.message);
		}
	}
};