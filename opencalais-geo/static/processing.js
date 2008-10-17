function initMap(){
  map = new OpenLayers.Map('map');
  var google = new OpenLayers.Layer.Google( "Google Hybrid" , {type: G_HYBRID_MAP });
  markerLayer = new OpenLayers.Layer.Markers("OpenCalais Places");
  featureMap = {};
  map.addLayers([google,markerLayer]);
  map.addControl(new OpenLayers.Control.LayerSwitcher());
  map.zoomToMaxExtent();
}

function clearMarkers(){
  for(var featureK in featureMap)
    featureMap[featureK].destroyPopup();
  markerLayer.clearMarkers();
  featureMap = {};
}

function showLoading(){
  $("resultText").innerHTML = '<img src="img/loading.gif" />';
  oclog("Loading...");
}

function clearLoading(){
  $("resultText").innerHTML = "";
  oclog("");
}

function submitToOC(){
  clearMarkers();
  showLoading();
  try{
    new OpenLayers.Ajax.Request('/opencalais-geo/ocproxy',
				{method:'post',
				    asynchronous: true,
				    contentType:'application/x-www-form-urlencoded',
				    onComplete: processOCResponse,
				    postBody: "content=" + escape($('inputText').value) + "&paramsXML=" + escape(generateParamsXML("text/raw")) 
				    });
  }catch(e){
    clearLoading();
    error();
  }
}

function generateParamsXML(contentType){
  return '<c:params xmlns:c="http://s.opencalais.com/1/pred/" ' + 
    'xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' +
         '<c:processingDirectives ' + 
           'c:contentType="' + contentType + '" ' +  
           'c:outputFormat="application/json">' + 
         '</c:processingDirectives>' + 
         '<c:userDirectives />' +
         '<c:externalMetadata />' +
       '</c:params>';
}

function resolveReferences(flatdb) {
  for (var element in flatdb)
    for (var attribute in flatdb[element]) {
      var val = flatdb[element][attribute];
      if (typeof val == 'string')
	if (flatdb[val] != null)
	  flatdb[element][attribute] = flatdb[val];
    }
}

function createHierarchy(flatdb) {
  var hdb = new Object();
  for (var element in flatdb) {
    var elementType = flatdb[element]._type;
    var elementGroup = flatdb[element]._typeGroup;
    if (elementGroup != null) {
      if (hdb[elementGroup] == null)
	hdb[elementGroup] = new Object();
      if (elementType != null) {
	if (hdb[elementGroup][elementType] == null)
	  hdb[elementGroup][elementType] = new Object();
	hdb[elementGroup][elementType][element] = flatdb[element];
      } else
	hdb[elementGroup][element] = flatdb[element];
    } else
      hdb[element] = flatdb[element];
  }
  return hdb;
}

function processOCResponse(jsonResponse){
  try{
    var jsonObject = null;
    eval('jsonObject = ' + jsonResponse.responseText);        
    resolveReferences(jsonObject);
    processGeoReferences(createHierarchy(jsonObject));
  }catch(e){
    clearLoading();
    oclog("Error");
  }
}

function processGeoReferences(dt){
  var text = dt.doc.info.document;
  var points = {};
  if(dt.entities && (dt.entities.Country || dt.entities.City || dt.entities.ProvinceOrState)){
    oclog("Geographic entities found");
    analyzeData(dt.entities,text);
  } else
    oclog( "No geographic entity found in text.");
}


function analyzeData(entities,text){
  var sInstances = sortInstances(getInstances(mergeObjects([entities.Country,entities.City,entities.ProvinceOrState])));
  createTextAndMarkers(text,sInstances);
}

function createTextAndMarkers(text,sInstances){
  var icons = createIcons();
  for(var i = sInstances.length - 1 ; i >= 0 ; i--){
     var instance = sInstances[i]; //Add Last first (offset biggest)
     if(instance.detail && instance.detail.longitude != undefined){
       text = text.substr(0,instance.offset) + '<a href="javascript:zoomOnAndPopup(\'' + instance.id +'\')">' + instance.exact + '</a>' + text.substr(instance.offset + instance.length);
       if(!featureMap[instance.id]){ //maye be mutiple instances for same place
	 var feature = createFeatureWithMarker(instance.detail.longitude,
					       instance.detail.latitude,
					       instance.detail.name,
					       icons[instance.category].clone());
	 markerLayer.addMarker(feature.marker);
	 featureMap[instance.id] = feature;
       }
     }
     
  }
  $("resultText").innerHTML =  "<p class='ptop'>" + text.replace(/\n+/g,"</p><p>") + "</p>";
  updateZoom();
}

function createIcons(){
  var iconSize =  new OpenLayers.Size(20,20);
  var iconOffset = new OpenLayers.Pixel(-(iconSize.w/2), -iconSize.h);
  return {Country: new OpenLayers.Icon("img/marker.png",iconSize,iconOffset),
      City : new OpenLayers.Icon("img/marker-blue.png",iconSize,iconOffset),
      ProvinceOrState : new OpenLayers.Icon("img/marker-gold.png",iconSize,iconOffset)
      };
}

function updateZoom(){
  if(markerLayer.markers.length > 1)
    map.zoomToExtent(markerLayer.getDataExtent());
  else if(markerLayer.markers.length == 1)
    map.setCenter(markerLayer.markers[0].lonlat,1); //zoomout
}

function createFeatureWithMarker(lon,lat,info,icon){
  var lonlat = new OpenLayers.LonLat(lon,lat);
  var contentHTML = '<div class="info">' + info.split(",").join("<br/>") + '</div>';
  var config = {popupContentHTML : contentHTML,icon:icon, popupSize : new OpenLayers.Size(250, 40)};  
  var feature = new OpenLayers.Feature(markerLayer,lonlat,config);
  var marker = feature.createMarker();
  marker.events.register('click', feature, function(){displayPopup(feature);});
  return feature;
}

function displayPopup(feature){
  feature.destroyPopup();
  map.addPopup(feature.createPopup(true),true);
}

function zoomOnAndPopup(id){
  var feature = featureMap[id];
  map.setCenter(feature.lonlat);
  displayPopup(feature);
}

function mergeObjects(objects){
  var result = {};
  for(var i = 0 ; i< objects.length ; i++){
    if(!objects[i])
      continue;
    for(var prop in objects[i])
      result[prop] = objects[i][prop];
  }
  return result;
}

function getInstances(entities){
  var instances = [];
  for(var entityK in entities){
    var entity = entities[entityK];
    for(var i = 0 ; i < entity.instances.length ; i++){
      var tDetails = entity.instances[i];
      instances.push({id:entityK,offset: tDetails.offset,length:tDetails.length,exact:tDetails.exact,detail:entity.resolutions[0], category: entity._type});
    }
  }
  return instances;
}

function sortInstances(instances){
  return instances.sort(function(a,b){return a.offset - b.offset;}); //INCR
}


function oclog(str){
  $("log").innerHTML = str;
}


function $(id){
  return document.getElementById(id);
}
