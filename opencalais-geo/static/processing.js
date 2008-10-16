function submitToOC(){
  new OpenLayers.Ajax.Request('/opencalais-geo/ocproxy',
			      {method:'post',
				  asynchronous: true,
				  contentType:'application/x-www-form-urlencoded',
				  onComplete: processOCResponse,
				  postBody: "content=" + escape($('inputText').value) + "&paramsXML=" + escape(generateParamsXML("text/raw")) 
				  });
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
  var jsonObject = null;
  eval('jsonObject = ' + jsonResponse.responseText);        
  resolveReferences(jsonObject);
  processGeoReferences(createHierarchy(jsonObject));
}

function processGeoReferences(dt){
  var text = dt.doc.info.document;
  var points = [];
  if(dt.entities && (dt.entities.Country || dt.entities.City)){
    oclog("Geographic entities found");
    result = getData(dt.entities,text);
  } else
    oclog( "No geographic entity found in text.");
  $("resultText").innerHTML = result[0];
  addToMap(result[1]);
}

function addToMap(points){

}

function getData(entities,text){
  if(!entities)
    return [text, {}]; 
  var sInstances = sortInstances(getInstances(mergeObjects([entities.Country,entities.City])));
  return interpolateLinks(text,sInstances);
}

function interpolateLinks(text,sInstances){
  if(sInstances.length > 0){
    var instance = sInstances.pop(); //Add Last first (offset biggest)
    text = text.substr(0,instance.offset) + '<a href="javascript:alert(\'' + instance.detail.name +'\')">' + instance.exact + '</a>' + text.substr(instance.offset + instance.length);
    return interpolateLinks(text,sInstances);
  }
  return [text,{}];
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
      instances.push({id:entityK,offset: tDetails.offset,length:tDetails.length,exact:tDetails.exact,detail:entity.resolutions[0]});
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
