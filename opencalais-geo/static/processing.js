function submitToOC(){
  new OpenLayers.Ajax.Request('/opencalais-geo/ocproxy',
			      {method:'post',
				  asynchronous: true,
				  contentType:'application/x-www-form-urlencoded',
				  onComplete: processOCResponse,
				  postBody: "content=" + escape(document.getElementById('inputText').value) + "&paramsXML=" + escape(generateParamsXML("text/raw")) 
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
  var simpleJSON = null;
  try{
    eval('jsonObject = ' + jsonResponse.responseText);        
    resolveReferences(jsonObject);
    simpleJSON = createHierarchy(jsonObject);
  }catch(e){
  }
       
}
