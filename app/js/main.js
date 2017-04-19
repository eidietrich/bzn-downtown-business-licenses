var container = d3.select('#viz-root')
  .attr('class', 'container');

// var width = 1000, height = 20000;
// var m = {top: 10, left: 200, bottom: 10, right: 20};
// var plotWidth = width - m.left - m.right;

var downtownProjection = d3.geoMercator()

var cleaned, downtownBuildings, downtownBlocks;

var map = container.append('svg')
    .attr('width', 600)
    .attr('height', 400);

var table = container.append('div');

d3.queue()
  .defer(d3.csv, './data/downtown-biz-by-year.csv')
  .defer(d3.json, './data/downtown-buildings.geojson')
  .defer(d3.json, './data/map.geojson')

  .awaitAll(function(error, files){
    if (error) throw error;

    var rawData = files[0];
    downtownBuildings = files[1];
    downtownBlocks = files[2];

    cleaned = clean(rawData);
    drawMap();

    console.log(cleaned);
  });


function drawMap(){
  drawBlocks(downtownBlocks);
  drawBuildings(downtownBuildings);
}

function drawBlocks(blocks){
  downtownProjection.fitSize([600,400],blocks)

  var blockShapes = d3.geoPath()
    .projection(downtownProjection);

  map.selectAll('.downtown-block')
    .data(blocks.features).enter()
    .append('path')
    .attr('d', blockShapes)
    .attr('class', 'downtown-block')
    .attr('fill', '#eee')
    .attr('stroke', '#999')
    .on('click', handleBlockClick)
}

function drawBuildings(buildings){
  var buildingShapes = d3.geoPath()
    .projection(downtownProjection);

  map.selectAll('.building')
    .data(buildings.features).enter()
    .append('path')
    .attr('d', buildingShapes)
    .attr('class', 'building')
    .attr('fill', '#aaa')
    // .attr('fill', function(d){
    //   return getMatchingById(d).length > 0 ? '#ccc' : '#f00'
    // })
    .attr('stroke', '#888')
    // .on('click', handleBuildingClick)
}

function handleBlockClick(block){
  // console.log(block.properties);
  var biz = getBizByBlock(block);
  drawTable2(biz);
}

// function handleBuildingClick(feature){


//   var matches = getMatchingByAddress(feature);

//   // console.log(feature.properties);
//   console.log(matches);
// }

// function getMatchingByAddress(feature){
//   // Match by address
//   var key = feature.properties.address;
//   return cleaned.filter(function(d){
//     return d.address === key;
//   });
// }
// function getMatchingById(feature){
//   // Match by id --> Turns out this is equivalent to address
//   var key = feature.properties.parcel_id;
//   return cleaned.filter(function(d){
//     return d.locationId === key;
//   });
// }

function getBizByBlock(block){
  var sStreet = block.properties.s_street;
  var nStreet = block.properties.n_street;
  var eStreet = block.properties.e_street;
  var wStreet = block.properties.w_street;
  var ns_min = block.properties.ns_min;
  var ns_max = block.properties.ns_max;
  var ew_min = block.properties.ew_min;
  var ew_max = block.properties.ew_max;

  var businesses = {}
  businesses.s = getBizByStreet(sStreet, ew_min, ew_max, 'south');
  businesses.n = getBizByStreet(nStreet, ew_min, ew_max, 'north');
  businesses.e = getBizByStreet(eStreet, ns_min, ns_max, 'east');
  businesses.w = getBizByStreet(wStreet, ns_min, ns_max, 'west');

  return businesses.s.concat(businesses.n, businesses.e, businesses.w);

  // ['s','n','e','w'].forEach(function(l){
  //   console.log(`on ${l} side of street`)
  //   businesses[l].forEach(function(b){
  //     console.log(b.address, ':', b.name);
  //   });
  // });

  // businesses.s.forEach(function(b){
  //   console.log(b.address, b.name);
  // })
}
function getBizByStreet(street, minAddr, maxAddr, dir){
  var min = +minAddr, max = +maxAddr;
  // console.log(street, min, max);
  var dirFilter = {
    'south': 1, 'east': 1, // odd addresses
    'north': 0, 'west': 0 // even addresses
  }
  return cleaned.filter(function(biz){
    return (biz.street === street) &&
    (+biz.streetNum % 2 === dirFilter[dir]) &&
    (+biz.streetNum >= min) &&
    (+biz.streetNum <= max)
  });
}


// d3.csv('./data/downtown-biz-by-year.csv', function(err, rawData){
//   if (err) throw err;

//   // console.log('raw',rawData)
//   cleaned = clean(rawData);
//   var filtered = filter(cleaned, 'type', 'FOOD SERVICE')
//   var grouped = group(filtered);
//   console.log('processed', grouped);
//   drawTable(grouped);
// });

var fiscalYears = [2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];

var colorScale = d3.scaleOrdinal(d3.schemeCategory10);

var yearScale = d3.scaleLinear()
  .domain(d3.extent(fiscalYears))
  .range([0, 150]);

function clean(rawData){
  var byDate = rawData.map(function(row){
    var biz = {
      name: row.biz_name,
      street: row.street,
      streetNum: row.street_num,
      unit: row.unit,
      address: row.address.trim(),
      type: row.class_desc_cat,
      subType: row.class_desc_detail,
      locationId: row.location_id,
      years: []
    }
    fiscalYears.forEach(function(year){
      biz.years.push({
        year: year,
        inBusiness: (row[year] != ""),
        type: row.class_desc_cat,
        subType: row.class_desc_detail
        // Assumes type and subType are constant
      });
    });
    return biz;
  });

  return byDate
}

function group(inData){
  var grouped = d3.nest()
    .key(function(d){ return d.address; })
    .entries(inData);
  return grouped;
}

function filter(data, key, value){
  console.log('f', data);
  return data.filter(function(d){ return d[key] === value; })
}

function drawTable(data){
  table.html('');

  var grouped = group(data)

  var rows = table.selectAll('.address-row')
    .data(grouped).enter()
    .append('div')
    .attr('class', 'address-row')

  rows.append('p')
    .attr('class', 'address')
    .text(function(d){ return d.key; });
  rows.append('div')
    .attr('class', 'location-group')
    .each(drawLocation)
}

function drawTable2(data){
  table.html('');
  // var grouped = group(data);
  var headers = ['address', 'name', 'class', 'subclass', 'range'];

  var blockTable = table.append('table')
    .attr('class', 'table table-condensed');
  var thead = blockTable
    .append('thead').append('tr')
    .selectAll('th')
    .data(headers).enter()
    .append('th')
    .text(function(d){ return d; });

  var tbody = blockTable
    .append('tbody')
    .selectAll('tr')
    .data(data).enter()
    .append('tr');

  var cells = tbody.selectAll('td')
    .data(function(row){
      return [
        {value: row.address},
        {value: row.name},
        {value: row.type},
        {value: row.subType},
        {value: 'range', data: row}
      ];
    }).enter()
    .append('td')
    .each(fillCell)
    // .text(function(d){ return d.label; })

}

function fillCell(cell){
  if (cell.value === 'range') {
    var td = d3.select(this);
    drawBusinessRange(cell.data, td);
  } else {
    d3.select(this).text(function(d) { return d.value})
  }
}

function drawLocation(location){
  d3.select(this).selectAll('.biz-group')
    .data(location.values).enter()
    .append('div').attr('class','biz-group')
    .on('click', function(e){
      console.log(e);
    })
    .each(drawBusinessRange)
}

function drawBusinessRange(biz, container){
  // var bizElem = d3.select(this)


  var svg = container.append('svg')
    .attr('class', 'biz-canvas')
    .attr('width', 200)
    .attr('height', 15)

  svg.append('g')
    .selectAll('circle')
    .data(biz.years).enter()
    .append('circle')
      .attr('r', function(d){ return d.inBusiness ? 4 : 0; })
      .attr('cy', 10)
      .attr('cx', function(d){ return yearScale(d.year) + 10; })
      .attr('fill', function(d){
        return colorScale(d.type);
      })

  svg.append('text')
    .attr('class', 'biz-name')
    .attr('x', 365)
    .attr('dy', 15)
    .text(function(d){ return d.name; });
}