(function () {
var app = {
  debug: false,
  params: {
    fishPerCircle: 25,
    radius: 3
  },
  scales: {},
  state: {
    step: 'step1',
    groupby: 'none',
    colorby: 'none',
    selectedWatershed: undefined
  },
  layout: {
    canvas: {
      margin: { top: 40, right: 40, bottom: 0, left: 100 }
    }
  },
  steps: {}
};

// PRIMARY INITIALIZATION FUNCTION --------------------------------------------
app.loadData = function (url, debug) {
  console.log('Loading data...');
  app.debug = debug;

  var q = d3.queue()
    .defer(d3.csv, url)
    .defer(d3.csv, 'data/segment-coordinates.csv')
    .await(function (error, data, coords) {
      if (error) {
        alert('Error occurred while loading the data.');
        throw error;
      }
      
      app.state.selectedWatershed = $("#selectedWatershedDD").val();
      
      app.dataRaw = data.map(parseRow);
      app.coordsRaw = coords;
      app.init(app.dataRaw, app.coordsRaw); 
    });
};    

app.init = function () {
      console.log('Initializing interface...',app);

      app.data = app.dataRaw.filter(function(d) {
        return d.enc == 1 && d.watershed === app.state.selectedWatershed;
      });

      app.coords = app.coordsRaw.map(function (d) {
          return {
            watershed: d.watershed,
            river: d.riverAbbr,
            lat: +d.lat,
            lon: +d.lon,
            section: +d.section
          };
        })
        .filter(function (d) {
          return d.watershed === app.state.selectedWatershed && d.section > 0 && d.section < 55;
        });

      switch(app.state.selectedWatershed){
        case "west":
          app.params.fishPerCircle = 25;
          break;
        case "stanley":
          app.params.fishPerCircle = 10;
          break;
      } 

      app.nodes = initNodes(app.data, app.params.fishPerCircle);

      app.layout.canvas = initCanvas('#viz-canvas', app.layout.canvas);
      app.scales = initScales(app.layout.canvas, app.nodes);
      app.layout.legend = initLegend('#legend');
      app.layout.labels = initLabels('#chart-container');
      app.simulation = initSimulation(app.nodes, app.layout.canvas, app.params.radius);

      initControls();

      app.switchStep("step1"); //app.state.step);

      hideLoading();

      console.log('Ready!', app);

};

app.reInit = function () {
      console.log('ReInitializing interface...',app);

      app.data = app.dataRaw.filter(function(d) {
        return d.enc == 1 && d.watershed === app.state.selectedWatershed;
      });

      app.coords = app.coordsRaw.map(function (d) {
          return {
            watershed: d.watershed,
            river: d.riverAbbr,
            lat: +d.lat,
            lon: +d.lon,
            section: +d.section
          };
        })
        .filter(function (d) {
          return d.watershed === app.state.selectedWatershed && d.section > 0 && d.section < 55;
        });

      switch(app.state.selectedWatershed){
        case "west":
          app.params.fishPerCircle = 25;
          break;
        case "stanley":
          app.params.fishPerCircle = 10;
          break;
      } 

      app.nodes = initNodes(app.data, app.params.fishPerCircle);

   //   app.layout.canvas = initCanvas('#viz-canvas', app.layout.canvas);
      app.scales = initScales(app.layout.canvas, app.nodes);
   //   app.layout.legend = initLegend('#legend');
      app.layout.labels = initLabels('#chart-container');
      app.simulation = initSimulation(app.nodes, app.layout.canvas, app.params.radius);

      //initControls();
      d3.selectAll('.fish-per-circle').text(app.params.fishPerCircle);

      app.switchStep("step1"); //app.state.step);
      
      // title
      $('#mainTitle').empty();
      $("#mainTitle").append(app.layout.labels.titles[0].main);
      $('#subTitle').empty();
      $("#subTitle").append(app.layout.labels.titles[0].sub);

  //    hideLoading();
    
      console.log('re Ready!', app);

};


// STATE TRANSITIONS ----------------------------------------------------------
app.switchStep = function (step) {
  // exit current step
  app.steps[app.state.step].exit();

  // update app state to next step
  app.state.step = step;

  // show next step narration
  d3.selectAll('.narration-step').style('display', 'none');
  d3.select('#narration-' + app.state.step + "-" + app.state.selectedWatershed).style('display', 'block');

  // update active step button
  d3.selectAll('.step').classed('selected', false);
  d3.select('.step[data-value="' + app.state.step + '"]').classed('selected', true);

  // enter next step
  app.steps[app.state.step].enter();

console.log('in switch',app.state.step)

  redraw();
}

app.steps.step1 = {
  enter: function () {
    app.state.groupby = 'none';
    app.state.colorby = 'none';
  },
  exit: function () {
  }
};
app.steps.step2 = {
  enter: function () {
    app.state.groupby = 'species';
    app.state.colorby = 'species';
  },
  exit: function () {
  }
};
app.steps.step3 = {
  enter: function () {
    app.state.groupby = 'river';
    app.state.colorby = app.scales.color['watershed'](app.state.selectedWatershed); //'species';
    d3.select('#map-container-' + app.state.selectedWatershed).append('div').attr('id', 'map');
    this.map = drawMap();
  },
  exit: function () {
//    this.map.remove();
    d3.select('#map').remove();
  }
};
app.steps.step4 = {
  enter: function () {
    app.state.groupby = 'season';
    app.state.colorby = app.scales.color['watershed'](app.state.selectedWatershed); //'species';
  },
  exit: function () {
  }
};
app.steps.step5 = {
  enter: function () {
    app.state.groupby = 'year';
    app.state.colorby = app.scales.color['watershed'](app.state.selectedWatershed); //'species';
  },
  exit: function () {
  }
};
app.steps.step6 = {
  enter: function () {
    app.state.groupby = 'none';
    app.state.colorby = 'none';
  },
  exit: function () {
  }
};

function hideLoading () {
  d3.select('#loading')
    .style('opacity', 1)
    .transition()
    .duration(1000)
    .style('opacity', 0)
    .on('end', function () {
      // after transition, hide element
      d3.select(this).style('display', 'none');
  });
}

// INITIALIZATION FUNCTIONS ---------------------------------------------------
function initNodes (data, fishPerCircle) {
  var result = [];

  var nest = d3.nest()
    .key(function (d) {
      // creates a compound key as string (e.g. "bkt,IL,Spring,2013")
      return [d.species, d.river, d.season, d.year];
    })
    .rollup(function (leaves) {
      return leaves.length;
    })
    .entries(data);

  nest.forEach(function (d) {
    var key = d.key.split(","), // "bkt,IL,Spring,2013" -> ["bkt", "IL", "Spring", 2013]
        fishCount = d.value,
        circleCount = parseInt(fishCount / fishPerCircle);

    for (var i = 0; i < circleCount; i++) {
      result.push({
        species: key[0],
        river: key[1],
        season: key[2],
        year: key[3]
      });
    }
  });

  result.forEach(function(d) {
    d.color = "lightgrey";
    d.year = +d.year;
  });

  var sorter = firstBy(function (d) { return d.species; })
    .thenBy("river")
    .thenBy("season");
  result.sort(sorter);

  return result;
}

function initControls () {
  // update footnote
  d3.selectAll('.fish-per-circle').text(app.params.fishPerCircle);
  d3.select('#chart-footnote').style('display', 'block');

  // setup listeners on groupby buttons
  var state = app.state;
  d3.selectAll('.btn-groupby').on('click', function () {
    // extract value of selected button and redraw
    state.groupby = d3.select(this).attr('data-value');
    redraw();
  });

  // setup listeners on colorby buttons
  d3.selectAll('.btn-colorby').on('click', function () {
    // extract value of selected button and redraw
    state.colorby = d3.select(this).attr('data-value');
    redraw();
  });

  // setup listeners on step buttons
  d3.selectAll('.step').on('click', function () {
    var step = d3.select(this).attr('data-value');
    app.switchStep(step);
  });
  
  $("#selectedWatershedDD").on("change", function () {
    state.selectedWatershed = $("#selectedWatershedDD").val();
    app.reInit(app.data, app.coords);

  });
}

function initScales (canvas, data) {
  var width = canvas.width,
      height = canvas.height,
      margin = canvas.margin;

  var labels = {},
      color = {},
      groupby = {};

  var yearExtent = d3.extent(data, function (d) { return d.year; }),
      yearValues = d3.range(yearExtent[0], yearExtent[1] + 1);

  // label scales
  labels.species = d3.scaleOrdinal()
    .domain(["ats","bnt","bkt"])
    .range(["Atlantic Salmon", "Brown Trout", "Brook Trout"]);
   
  switch(app.state.selectedWatershed){
    case "west":
      labels.river = d3.scaleOrdinal()
        .domain(["WB","OL","OS","IL"])
        .range(["Main Branch","Large Tributary","Small Tributary","Isolated Tributary"]);
      break;
    case "stanley":
      labels.river = d3.scaleOrdinal()
        .domain(["tidal","mainstem","west","east"])
        .range(["Tidal","Mainstem","West Branch","East Branch"]);
      break;
  } 
  
  labels.season = function (d) { return d; };
  labels.year = function (d) { return d; };
  labels.seasonyear = function (d) { return d; };

  // color scales
  var greens = ['#A6CEE3', '#1F78B4', '#B2DF8A', '#33A02C'];
  color.none = function (d) {
    return 'lightgrey';
  };
  color.species =  d3.scaleOrdinal()
    .domain(["bkt","bnt","ats"])
    .range(greens.slice(0, 3));
    
  switch(app.state.selectedWatershed){
    case "west":
      color.river = d3.scaleOrdinal()
        .domain(["WB","OL","OS","IL"])
        .range(greens);
      break;
    case "stanley":
      color.river = d3.scaleOrdinal()
        .domain(["tidal","mainstem","west","east"])
        .range(greens);
      break;
  }  

  color.season = d3.scaleOrdinal()
    .domain(["Spring","Summer","Autumn","Winter"])
    .range(greens);
  color.year = d3.scaleOrdinal(d3.schemeCategory20c).domain(yearValues);
  
  color.watershed = d3.scaleOrdinal()
    .domain(["west","stanley"])
    .range(['species','river']);
    
  // groupby position scales
  var xProp = [0.33, 0.5, 0.66],
      yProp = [0.33, 0.5, 0.66];

  groupby.none = function () {
    return [width * xProp[1], height * yProp[1]];
  };
  groupby.species = function (d) {
    var positions = {
      ats: [width * xProp[1], height * yProp[2]],
      bkt: [width * xProp[0], height * yProp[0]],
      bnt: [width * xProp[2], height * yProp[0]]
    };
    return positions[d.species];
  };
  
  switch(app.state.selectedWatershed){
    case "west":
      groupby.river = function (d) {
        var positions = {
          WB: [width * xProp[0], height * yProp[0]],
          OL: [width * xProp[0], height * yProp[2]],
          OS: [width * xProp[2], height * yProp[0]],
          IL: [width * xProp[2], height * yProp[2]]
        };
        return positions[d.river];
      };
      break;
    case "stanley":
      groupby.river = function (d) {
        var positions = {
          tidal:    [width * xProp[0], height * yProp[0]],
          mainstem: [width * xProp[0], height * yProp[2]],
          west:     [width * xProp[2], height * yProp[0]],
          east:     [width * xProp[2], height * yProp[2]]
        };
        return positions[d.river];
      };
      break;
  } 
  

  groupby.season = function (d) {
    var positions = {
      Spring: [width * xProp[0], height * yProp[0]],
      Summer: [width * xProp[0], height * yProp[2]],
      Autumn: [width * xProp[2], height * yProp[0]],
      Winter: [width * xProp[2], height * yProp[2]]
    };
    return positions[d.season];
  };

  var scaleYearX = d3.scaleLinear()
    .domain(yearExtent)
    .range([margin.left, width - margin.left - margin.right]);
  groupby.year = function (d) {
    return [scaleYearX(d.year), height * 0.5];
  };

  var seasons = ["Spring", "Summer", "Autumn", "Winter"],
      scaleSeasonY = d3.scaleLinear()
                       .domain([0, 3])
                       .range([100, height - 200]);
  groupby.seasonyear = function (d) {
    return [scaleYearX(d.year), 40 + scaleSeasonY(seasons.indexOf(d.season))];
  };
  
  return {
    labels: labels,
    color: color,
    groupby: groupby
  };
}

function initSimulation (nodes, canvas, radius) {
  
  var simulation = d3.forceSimulation()
    .force("charge",
           d3.forceManyBody()
             .strength(- radius + 1) // strength of attraction among points [ - repels, + attracts ]
          )
    .force("collide",
           d3.forceCollide()
             .radius(radius + 1.02) // (function(d) { return ageScale(d.currentAge) + 1.025; })
          )   
    .force("x", d3.forceX().x(function (d) { return d.xx; }))
    .force("y", d3.forceY().y(function (d) { return d.yy; }))
    .alphaMin(0.01)
    .nodes(nodes)
    .on("tick", function () {
      ticked(canvas, nodes, radius);
    });

  return simulation;
}

function initCanvas (el, options) {
  var el = document.querySelector(el),
      context = el.getContext("2d");

  var margin = options.margin,
      width = el.width - margin.left - margin.right,
      height = el.height - margin.top - margin.bottom;

  return {
    el: el,
    context: context,
    margin: margin,
    width: width,
    height: height
  }
}

function initLegend (el) {
  var el = d3.select(el);
  // var canvas = document.querySelector(el),
  //     context = canvas.getContext("2d");

  // var margin = {top: 0, right: 0, bottom: 0, left: 0},
  //     width = canvas.width - margin.left - margin.right,
  //     height = 0; //canvas.height - margin.top - margin.bottom;

  // return {
  //   el: canvas,
  //   context: context,
  //   margin: margin,
  //   width: width,
  //   height: height
  // }
  return {
    el: el
  };
}

function initLabels (el) {
  var positions = {};
  positions.species = [
    {
      value: 'ats',
      x: 150,
      y: 500,
      size: '24px'
    },
    {
      value: 'bnt',
      x: 720,
      y: 80,
      size: '24px'
    },
    {
      value: 'bkt',
      x: 40,
      y: 80,
      size: '24px'
    }
  ];
  positions.river = [
    {
      value: 'WB',
      x: 50,
      y: 50,
      size: '24px'
    },
    {
      value: 'OL',
      x: 75,
      y: 575,
      size: '24px'
    },
    {
      value: 'OS',
      x: 690,
      y: 120,
      size: '24px'
    },
    {
      value: 'IL',
      x: 680,
      y: 575,
      size: '24px'
    }
  ];
/*  positions.river.stanley = [    
    {
      value: 'mainstem',
      x: 50,
      y: 50,
      size: '24px'
    },
    {
      value: 'west',
      x: 75,
      y: 575,
      size: '24px'
    },
    {
      value: 'tidal',
      x: 690,
      y: 120,
      size: '24px'
    },
    {
      value: 'east',
      x: 680,
      y: 575,
      size: '24px'
    }
  ];
*/  positions.season = [
    {
      value: 'Spring',
      x: 100,
      y: 100,
      size: '24px'
    },
    {
      value: 'Autumn',
      x: 775,
      y: 100,
      size: '24px'
    },
    {
      value: 'Summer',
      x: 100,
      y: 550,
      size: '24px'
    },
    {
      value: 'Winter',
      x: 775,
      y: 550,
      size: '24px'
    }
  ];
  positions.year = [
    {
      value: d3.min(app.data, function(d) { return d.year; }),
      x: 20,
      y: 440,
      size: '14px'
    },
    {
      value: d3.max(app.data, function(d) { return d.year; }),
      x: 820,
      y: 440,
      size: '14px'
    }
  ];
  positions.seasonyear = [
    {
      value: 1997,
      x: 60,
      y: 580,
      size: '14px'
    },
    {
      value: 2015,
      x: 800,
      y: 580,
      size: '14px'
    },
    {
      value: 'Spring',
      x: 10,
      y: 90,
      size: '14px'
    },
    {
      value: 'Summer',
      x: 10,
      y: 200,
      size: '14px'
    },
    {
      value: 'Autumn',
      x: 10,
      y: 320,
      size: '14px'
    },
    {
      value: 'Winter',
      x: 10,
      y: 470,
      size: '14px'
    }
  ];

  //remove any labels from prvious watershed
  d3.selectAll('text').remove();

  var svg = d3.select(el)
    .append('svg')
    .attr('id', 'labels')
    .append('g');

  switch(app.state.selectedWatershed){
    case "west":
      titles = [
        {
          main:"The West Brook Story",
          sub:"Trout and Salmon in a Small Stream Network in Western Massachusetts, USA" 
        }
      ];
      break;
    case "stanley":
      titles = [
        {
          main:"The Stanley Brook Story",
          sub:"Brook Trout in a Small Coastal Stream Network in Acadia National Park, Seal Harbor, Maine, USA" 
        }
      ];
      break;
  } 

  return {
    el: svg,
    positions: positions,
    titles: titles
  };
}

// DRAWING FUNCTIONS ----------------------------------------------------------
function redraw () {
  // update target and color of each node based on current state
  updateNodes(app.nodes, app.state, app.scales);

  drawLabels(app.state.groupby);
  drawLegend(app.state.colorby);

  d3.selectAll('.btn-groupby').classed('active', false);
  d3.selectAll('.btn-colorby').classed('active', false);
  d3.select('.btn-groupby[data-value="' + app.state.groupby + '"]').classed('active', true);
  d3.select('.btn-colorby[data-value="' + app.state.colorby + '"]').classed('active', true);

  // restart simulation
  if (app.state.groupby === 'year' || app.state.groupby === 'seasonyear') {
    // hack to restart simulation after 50% completion in order to get all
    // nodes to move to their groups (otherwise nodes get stuck in wrong group)
    app.simulation
      .alpha(1)
      .alphaMin(0.5)
      .nodes(app.nodes)
      .restart()
      .on('end', function () {
        app.simulation
          .alpha(1)
          .alphaMin(0.01) // need to reset default alphaMin, otherwise future simulations will end at 0.5
          .nodes(app.nodes)
          .restart()
          .on('end', function () {}); // need to turn off the end event, otherwise future simulations will restart infinitely
      });
  } else {
    app.simulation
      .alpha(1)
      .nodes(app.nodes)
      .restart();
  }
}

function updateNodes (nodes, state, scales) {
  var groupby = state.groupby,
      colorby = state.colorby,
      groupbyScale = scales.groupby[groupby],
      colorScale = scales.color[colorby];

  nodes.forEach(function (d) {
    // update target position (focus)
    d.xx = groupbyScale(d)[0];
    d.yy = groupbyScale(d)[1];

    // update node color
    d.color = colorScale(d[colorby]);
  });
}

function drawNode(d, radius, context){
  context.beginPath();
  context.arc( d.x, d.y, radius, 0, 2 * Math.PI);

  context.strokeStyle = d3.rgb(d.color).darker(1);
  context.stroke();
  context.fillStyle = d.color;
  context.fill();

  if (app.debug) {
    context.beginPath();
    context.arc( d.xx, d.yy, 5, 0, 2 * Math.PI);

    context.fillStyle = 'red';
    context.fill();
  }
}

function ticked (canvas, nodes, radius) {
  var context = canvas.context;
  context.clearRect(0, 0, canvas.el.width, canvas.el.height);
  context.save();
  context.translate(canvas.margin.left, canvas.margin.top); // subtract the margin values whenever use simulation.find()

  nodes.forEach(function (d) {
    drawNode(d, radius, context);
  });

  context.restore();
}

function drawLegend (colorby) {
  var labelColors,
      legend = app.layout.legend.el,
      scale = app.scales.color[colorby];

  if (colorby === 'none') {
    // hide legend
    legend.style('display', 'none');
    return;
  } else {
    // show legend
    legend.style('display', 'block');
    // 2-d array of [[label, color], ...]
    labelColors = d3.zip(scale.domain().map(app.scales.labels[colorby]), scale.range());
  }

  // remove existing labels
  legend.selectAll('.item').remove();

  // add new labels
  var items = legend.selectAll('.item')
    .data(labelColors);

  items.enter()
    .append('span')
    .classed('item', true)
    .each(function (d) {
      // add the circle
      d3.select(this)
        .append('i')
        .classed('fa fa-circle fa-', true)
        .style('color', function (d) { return d[1]; });
      // add the text
      d3.select(this).append('span').text(function (d) { return d[0]; });
    });
}

function drawLabels (groupby) {
  var svg = app.layout.labels.el,
      positions = app.layout.labels.positions;

  svg.selectAll('text').remove();

  if (positions[groupby]) {
    labels = svg.selectAll('text')
      .data(positions[groupby]);

    labels.enter()
      .append('text')
      .attr('x', function(d) { return d.x; })
      .attr('y', function(d) { return d.y; })
      .attr('font-size', function (d) { return d.size; })
      .attr('fill', '#777')
      .text(function (d) { return app.scales.labels[groupby](d.value); });
  }
}

function drawMap () {
  var labels = app.scales.labels.river,
      rivers = app.scales.color.river.domain(), //labels.domain(),
      color = d3.scaleOrdinal(d3.schemeCategory10).domain(rivers);

  switch(app.state.selectedWatershed){
    case "west":
      var latLonMap = [42.434, -72.669];
      var mapZoom = 14;
      break;
    case "stanley":
      latLonMap = [44.303, -68.242];
      mapZoom = 13;
      break;
  }
  
  var map = L.map('map').setView(latLonMap, mapZoom);

  L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  switch(app.state.selectedWatershed){
    case "west":
      var labelCoordinates = {
        WB: new L.LatLng(42.433, -72.663),
        OS: new L.LatLng(42.4373, -72.668),
        OL: new L.LatLng(42.4379, -72.673),
        IL: new L.LatLng(42.433, -72.6775)
      };
      break;
    case "stanley":
      var labelCoordinates = {
        tidal:    new L.LatLng(44.2975, -68.248),
        mainstem: new L.LatLng(44.303, -68.24),
        west:     new L.LatLng(44.310, -68.2545),
        east:     new L.LatLng(44.310, -68.24)
      };
      break;
  }

  rivers.map(function (river) {
    // create array of LatLng points for this river sorted by section
    var polyline = app.coords.
      filter(function (d) {
        return d.river == river;
      })
      .sort(function (a, b) {
        return a.section - b.section;
      })
      .map(function (d) {
        return new L.LatLng(d.lat, d.lon);
      });

    // add river polyline to map
    new L.polyline(polyline, {color: color(river), opacity: 1}).addTo(map);

    // add text label
    new L.marker(labelCoordinates[river], {
        icon: new L.divIcon({ className: 'river-label', html: labels(river) })
      })
      .addTo(map);
  });

  return map;
}

// UTILITIES ------------------------------------------------------------------
function parseRow (d) {
  d.sample = +d.sample;
  d.date = Date.parse(d.date);
  d.id = +d.id;
  d.section = +d.section;
  d.len = +d.len;
  d.wt = +d.wt;
  d.enc = +d.enc;
  d.moveDir = +d.moveDir;
  d.distMoved = +d.distMoved;
  d.lagSection = +d.lagSection;
  d.season = d.seasonStr;
  d.year = +d.year;
  d.cohortFamilyID = d.cohortFamilyID;
  d.familyID = +d.familyID;
  d.minSample = +d.minSample;
  d.maxSample = +d.maxSample;
  d.familyCount = +d.familyCount;
  d.riverAbbr = d.river;
  d.age = +d.age;
  d.dateEmigrated = Date.parse(d.dateEmigrated);
  d.isYOY = +d.isYOY;
  d.watershed = d.watershed;
  return d;
}

function uniques(array) {
  return Array.from(new Set(array));
}

function sortUnique(arr) {
  arr.sort();
  var last_i;
  for (var i=0;i<arr.length;i++) {
    if ((last_i = arr.lastIndexOf(arr[i])) !== i) {
      arr.splice(i+1, last_i-i);
    }
  }
  return arr;
}

/*** Copyright 2013 Teun Duynstee Licensed under the Apache License, Version 2.0 https://github.com/Teun/thenBy.js ***/
firstBy=function(){function n(n){return n}function t(n){return"string"==typeof n?n.toLowerCase():n}function r(r,e){if(e="number"==typeof e?{direction:e}:e||{},"function"!=typeof r){var i=r;r=function(n){return n[i]?n[i]:""}}if(1===r.length){var u=r,o=e.ignoreCase?t:n;r=function(n,t){return o(u(n))<o(u(t))?-1:o(u(n))>o(u(t))?1:0}}return-1===e.direction?function(n,t){return-r(n,t)}:r}function e(n,t){var i="function"==typeof this?this:!1,u=r(n,t),o=i?function(n,t){return i(n,t)||u(n,t)}:u;return o.thenBy=e,o}return e}();

// export globals
window.app = app;
})();