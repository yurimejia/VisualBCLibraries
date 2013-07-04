//Create menu
var menu = function (columnNames) {
    for (var x in columnNames) {        
        this.append('option').text(x);
    }
    return this;
};


//Convert entry with (-, n.a., n.d.) to 0. 
var text2zero = function (x) {     
    var zero = /\s*\-\s*|\s*n\.[ad]\.\s*/g;
    x = x.replace(zero, 0);            
    return x;
};


//Convert text with (, %) to a number by deleting , %. 
var text2num = function (x) {    
    var re = /[,\$%]/g;  //RegularExpression: Looks for ,$% globally 'g'. 
    x = x.replace(re, '');          
    return +x;
};


//Create Input (data) object
var Input = function (data, domain) {
	data.pop();	//Pop out the last row in data which contains Total
	this.data = data;
	this.domain = domain;
	this.type = {};
};

//Process input data
Input.prototype = {
	//Converts data entries with (-, n.a., n.d.) to 0. 
	toZero: function () {	
		for (var nameCol in this.data[0]) {		
			this.data.forEach(function(d) {
				d[nameCol] = text2zero(d[nameCol]);
			});
		}
		return this;
	},

	//Determines whether a column is float / integer / enumerated(text) type
	dataType: function () {
		var type = {};
		var re = /[\.%]/g;
		var re2 = /\d/g;
	
		for (var col in this.data[0]) {
			type[col] = 'enumerated';
		
			for (var row in this.data){
				var value = this.data[row][col];
				if (re.test(value)) {
					type[col] = 'float';
					break;
				}
				if (re2.test(value)) {
					type[col] = 'count';
				}	
			}		
		}
		this.type = type;
		return this;
	},

	//Remove columns containing text (enumerated type)
	remove: function () {
		for (var col in this.data[0]){
			if (this.type[col] !== this.domain && this.type[col] === 'enumerated') {
				for (var row in this.data) {
					delete this.data[row][col];
				}
			}	
		}
		return this;
	},

	//Convert columns' entries to numbers by deleting , %.  
	toNumber: function () {	
		for (var nameCol in this.data[0]) {
			if (
				   nameCol !== this.domain						
			) {					   
			   	this.data.forEach(function(d) {
			   		d[nameCol] = text2num(d[nameCol]);				
		   		});
			}
		}
		return this;
	},

	//Normalize and sort data by byCol 
	normalize: function (byCol) {
		var that = this;	
		for (var nameCol in this.data[0]) {
			if (
				   nameCol !== this.domain			
				&& nameCol !== 'Year' 
				&& nameCol !== byCol
			) {		
			   	this.data.forEach(function(d) { 
			   		if (that.type[nameCol] === 'count') { //If type is count (not a float number), normalize. 	   			   			
		   				d[nameCol] = d[nameCol] * 100 / d[byCol];
		   			}
		   		});
			}
		}
	
		//Sort data by byCol    
		this.data.sort ( function (a,b) {        
		    return b[byCol] - a[byCol];
		});  
		
		return this;  
	},
	
	process: function (byCol) {
		//Convert entries with '-', 'n.a.' and 'n.d.' to zero
    	//Determine the type of each data column         
    	//Remove enumerated columns (contain text) 
    	//Convert data to number (remove , % from entries)	
		//Normalize and sort data by byCol	  
		this.toZero()
    		.dataType()    	
    		.remove()
    		.toNumber()
    		.normalize(byCol);
    	return this;
	} 
};



var BarChart = function (selected_div, data, nameCol, location, domain) { 
	this.container = selected_div;
	this.data = data;
	this.nameCol = nameCol;
	this.location = location;
	this.domain = domain;
};


BarChart.prototype = {

	plot: function () {				   
		this.container.select('svg').remove();
		var svg = this.container.append('svg');
		var that = this;
				
		var margin = {	
			top: (this.location === 'top'? 20 : 0), 
			right: 20, 
			bottom: (this.location === 'top'? 0 : 20), 
			left: 60
		},
		width = 980 - margin.left - margin.right,
		height = 300 - margin.top - margin.bottom;
		
		
		var x = d3.scale.ordinal()          
		        .rangeRoundBands([0, width], .1);
		
		var y = d3.scale.linear();
		this.location === 'top'?  y.range([height, 0]) : y.range([0,height]);
				
		x.domain(this.data.map(function(d) {        
		    return d[that.domain];
		}));
		
		y.domain([0, d3.max(this.data, function(d) {        
		    return d[that.nameCol]; 
		})]);
	   
	   
		svg.attr("width", width + margin.left + margin.right)
		    .attr("height", height + margin.top + margin.bottom);
			 
		svg.append('text')
		          .attr('transform', 'rotate(-90)')
		          .attr('y', 6)
		          .attr('dy', '.71em')              
		          .style('text-anchor', 'end')
		          .text(this.nameCol);
			   		
		svg.selectAll('.bar')
		        .data(this.data)
		    .enter().append('rect')
		        .attr({ 
		            'class': 'bar'
		            , x:  function(d) { return x(d[that.domain]); }
		            , width: x.rangeBand()
		            , y: function(d) { return that.location === 'top'? y(d[that.nameCol]) : 0; }
		            , height: function(d) { return that.location === 'top'? height - y(d[that.nameCol]) : y(d[that.nameCol]);}
		        });
		        
		this.svg = svg; 		       
		return this;
		        
	},


	//Show or remove label of bar on which mouse has hoovered
	labels: function () {
		var round2 = d3.format('.2r');
		var that = this;	
	
		this.svg.on('mouseover', function (d,i) {
			var target = d3.event.target;
			if (target.classList[0] === 'bar') {
			    		
				var x = +target.attributes.x.value;
				var y =  (that.location === 'top')? +target.attributes.y.value : +target.attributes.height.value;
				var width =  +target.attributes.width.value;
				var barName = target.__data__['Library System'];    
				var barValue = round2(target.__data__[that.nameCol]);		
				    		
				d3.select(this).append("text")
					.text(barName + ' ' + barValue)
		        	.attr({            		
		        		id : 'labelBar'
		        		, x : x + width
		        		, y : y
		        		, dy : '.71em'
		        	});            	
		        	
				return;
			}
			return;
		});  
		
		this.svg.on('mouseout', function () {
			d3.select(this).select('#labelBar').remove();
		});
		return this;
	}
};



d3.csv("PublicLibraries2011.csv", function(error, data) {   

	var input = new Input(data, 'Library System');     
    	input.process('Population Served');    
     
    	//Build menu
	var mainMenu = menu.call(d3.select('#dataMenu'), input.data[0]);       
    
    	//Build bar chart when option from menu has been selected   
    	mainMenu.on('change', function (d,i) {
    	for (i = 0, l = this.selectedOptions.length; i < l; i++){
    		var location = ( i % 2 === 0) ? 'top' : 'bottom';
    		var colName = this.selectedOptions[i].value;
    		
    		var barchart = new BarChart(d3.select('#barChart'+i), input.data, colName, location, 'Library System');
    		barchart.plot().labels();    		
    	}           
    });	
});

