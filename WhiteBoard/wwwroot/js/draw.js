let connection = new signalR.HubConnectionBuilder().withUrl("/drawDotHub").build();
let objectId = 1;
let groupName;
let textMode = false;

/**
 * Vytvoření spojení se serverem
 * */
connection.start().then(function () {
    groupName = getGroupName();
    connection.invoke("AddUserToGroup", groupName)
}).catch(function (err) {
    return console.error(err.toString());
});

/**
 * Vytvoření canvasu
 * */
let canvas = new fabric.Canvas('canvas', {
    isDrawingMode: true
});

/**
 * Přepnutí se do režimu kreslení
 * */
let onStartDrawing = function () {
    canvas.isDrawingMode = true;
}

/**
 * Přepnutí se z režimu kreslení
 * */
let onStopDrawing = function () {
    canvas.isDrawingMode = false;
}

/**
 * Z URL získá skupinu
 * */
function getGroupName() {
    let segmentStr = window.location.pathname;
    let segmentArray = segmentStr.split('/');
    let groupName = segmentArray.pop();
    return groupName;
}

/**
 * Simulované kliknutí při vkládání obrázku do canvasu
 * */
function importFile() {
    document.getElementById('attachment').click();
}

/**
 * Vložení obrázku do canvasu
 * */
function fileSelected(input) {
    var file = input.files[0];
    var reader = new FileReader();
    reader.onload = function (f) {
        var data = f.target.result;
        fabric.Image.fromURL(data, function (img) {
            canvas.add(img);
        });
    };
    reader.readAsDataURL(file);
}

/**
 * Vložení textu
 * */
function changetextMode() {

    if (!textMode) {
        canvas.defaultCursor = 'text';
        canvas.isDrawingMode = false;
        document.getElementById("text_button").style.backgroundColor = '#a2ffa2';
        textMode = true;
    }
    else {
        canvas.defaultCursor = 'arrow';
        document.getElementById("text_button").style.backgroundColor = '#feee';
        textMode = false;
    }
}

canvas.on('mouse:down', function (event) {
    if (textMode) {
        var pointer = canvas.getPointer(event.e);

        var iText = new fabric.IText('', {
            left: pointer.x,
            top: pointer.y,
            fontFamily: 'Helvetica',
            fill: '#333',
            lineHeight: 1.1
        }
        );

        canvas.add(iText);
        canvas.setActiveObject(iText);
        iText.enterEditing();
        iText.hiddenTextarea.focus();
    }
});

/**
 * Příkaz ze serveru k vyčíštění canvasu všech uživatelů
 * */
connection.on("clearCanvas", function () {
    canvas.clear();
});

/**
 * Příkaz ze serveru k přidání objektu do canvasu všech uživatelů
 * */
connection.on("addObject", function (jsonData) {
    // Parse JSON and single object to canvas
    var jsonObj = JSON.parse(jsonData);
    fabric.util.enlivenObjects([jsonObj], function (enlivenedObjects) {
        canvas.add(enlivenedObjects[0]);
        canvas.renderAll();
    });
    console.log(canvas._objects)
});

/**
 * Příkaz ze serveru k vyčíštění označených objektů canvasu všech uživatelů
 * */
connection.on("deleteObjects", function (objectIds) {
    objects = canvas.getObjects();
    for (i = objects.length-1; i > -1; i--) {
        if (objectIds.includes(objects[i].id)) {
            canvas.remove(objects[i]);
        }
    }  
});

/**
 * Požadavek na server k vyčíštění canvasu všech uživatelů
 * */
function tellServerToClear() {
    connection.invoke("ClearCanvas", groupName).catch(function (err) {
        return console.error(err.toString());
    });
}

/**
 * Event - vytvoření čáry
 * */
canvas.on('path:created', function (e) {
    e.path.id = objectId++;
    objWithId = e.path.toJSON(['id']);
    connection.invoke("AddObject", JSON.stringify(objWithId), groupName).catch(function (err) {
        return console.error(err.toString());
    });
});

/**
 * Mazání označených objektů u všech uživatelů
 * */
$('html').keyup(function (e) {
    if (e.keyCode == 46) {
        let activeObject = canvas.getActiveObject();
        let activeGroup = canvas.getActiveGroup();
        if (activeObject) {
            connection.invoke("DeleteObjects", [activeObject.id], groupName).catch(function (err) {
                return console.error(err.toString());
            });
            canvas.remove(activeObject);
        }
        else if (activeGroup) {
            let objectsInGroup = activeGroup.getObjects();
            let objectsIds = [];
            objectsInGroup.forEach(element => objectsIds.push(element.id));
            connection.invoke("DeleteObjects", objectsIds, groupName).catch(function (err) {
                return console.error(err.toString());
            });
            canvas.discardActiveGroup();
            objectsInGroup.forEach(function (object) {
                canvas.remove(object);
            });
        }
    }
});