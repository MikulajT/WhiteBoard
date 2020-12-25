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
    isDrawingMode: false
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
        //canvas.defaultCursor = 'text';
        document.getElementById("text_button").style.backgroundColor = '#a2ffa2';
        textMode = true;
    }
    else {
        canvas.defaultCursor = 'default';
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
    }
});

/**
 * Stažení tabule ve formátu JSON
 * */
function downloadJSONBoard() {
    let serializedCanvas = JSON.stringify(canvas);
    serializedCanvas = [serializedCanvas];
    let blob = new Blob(serializedCanvas, { type: "text/plain;charset=utf-8" });

    //Check the Browser.
    let isIE = false || !!document.documentMode;
    if (isIE) {
        window.navigator.msSaveBlob(blob, "Customers.txt");
    } else {
        let url = window.URL || window.webkitURL;
        link = url.createObjectURL(blob);
        let a = document.createElement("a");
        a.download = "Board.json";
        a.href = link;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}


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
    var jsonObj = JSON.parse(jsonData);
    fabric.util.enlivenObjects([jsonObj], function (enlivenedObjects) {
        canvas.add(enlivenedObjects[0]);
        canvas.renderAll();
    });
    objectId++;
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
 * Příkaz ze serveru k vyčíštění označených objektů canvasu všech uživatelů
 * */
connection.on("changeTextObject", function (objectId, addedChar) {
    updatedTextObj = canvas.getObjects().find(obj => {
        return obj.id === objectId
    })
    updatedTextObj.text += addedChar;
    canvas.renderAll();
    updatedTextObj.setCoords();
});

/**
 * Příkaz ze serveru ke změně pozice objektu
 * */
connection.on("changeObjectPosition", function (objectId, xPos, yPos) {
    movedObj = canvas.getObjects().find(obj => {
        return obj.id === objectId
    })
    movedObj.top = yPos;
    movedObj.left = xPos;
    canvas.renderAll();
    movedObj.setCoords();
});

/**
 * Příkaz ze serveru ke změně pozice objektu
 * */
connection.on("changeObjectAngle", function (objectId, angle) {
    rotatedObj = canvas.getObjects().find(obj => {
        return obj.id === objectId
    })
    rotatedObj.rotate(angle);
    canvas.renderAll();
    rotatedObj.setCoords();
});

/**
 * Požadavek na server k vyčíštění canvasu všech uživatelů
 * */
function tellServerToClear() {
    canvas.clear();
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
 * Event - Změna vkládaného textu
 * */
canvas.on('text:changed', function (e) {
    if (e.target.id == null) {
        e.target.id = objectId++;
        objWithId = e.target.toJSON(['id']);
        connection.invoke("AddObject", JSON.stringify(objWithId), groupName).catch(function (err) {
            return console.error(err.toString());
        });
    }
    else {
        let updatedTextObj = canvas.getObjects().find(obj => {
            return obj.id === e.target.id
        })
        let addedChar = updatedTextObj.text.slice(-1);
        connection.invoke("ChangeTextObject", e.target.id, addedChar, groupName).catch(function (err) {
            return console.error(err.toString());
        });
    }
});

/**
 * Event - Změna pozice objektu
 * */
canvas.on('object:moved', function (e) {
    let objectCoords = e.target.calcCoords();
    connection.invoke("ChangeObjectPosition", e.target.id, objectCoords.tl.x, objectCoords.tl.y, groupName).catch(function (err) {
        return console.error(err.toString());   
    });
});

/**
 * Event - Otočení objektu
 * */
canvas.on('object:rotated', function (e) {  
    connection.invoke("ChangeObjectAngle", e.target.id, e.target.angle, groupName).catch(function (err) {
        return console.error(err.toString());
    });
});

/**
 * Mazání označených objektů
 * */
$('html').keyup(function (e) {
    if (e.keyCode == 46) {
        let activeObjects = canvas.getActiveObjects();
        let objectsIds = [];
        activeObjects.forEach(element => objectsIds.push(element.id));
        if (activeObjects.length > 0) {
            connection.invoke("DeleteObjects", objectsIds, groupName).catch(function (err) {
                return console.error(err.toString());
            });
            canvas.discardActiveObject();
            canvas.remove(...activeObjects);
        }
    }
});