let connection = new signalR.HubConnectionBuilder().withUrl("/drawDotHub").build();
let objectId = 1;
let groupName;

let textMode = false;
let textEdit = false;
let globalColor = '#000000';

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
    if (textMode) changetextMode();
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
 * Export tabule do formátu PNG
 * */
function exportToImage() {
    $('<a>').attr({ href: canvas.toDataURL(), download: 'Board.png' })[0].click();
}

/**
 * Přepnutí do textového rezimu
 * */
function changetextMode() {
    if (!textMode) {
        //canvas.defaultCursor = 'text';
        document.getElementById("text_button").style.backgroundColor = '#a2ffa2';
        canvas.isDrawingMode = false;
        textMode = true;
    }
    else {
        canvas.defaultCursor = 'default';
        document.getElementById("text_button").style.backgroundColor = '#feee';
        textMode = false;
    }
}
/**
 * Event - vložení textu
 * */
canvas.on('mouse:down', function (event) {
    if (textMode && !textEdit) {
        var pointer = canvas.getPointer(event.e);
        let iText = new fabric.IText('', {
            left: pointer.x,
            top: pointer.y,
            fontFamily: 'Helvetica',
            fill: globalColor,
            lineHeight: 1.1
        }
        );
        canvas.add(iText);
        canvas.setActiveObject(iText);
        textEdit = true;
        iText.enterEditing();
    }
});
/**
 * Event - ukonceni editovani textu
 * */
canvas.on("text:editing:exited", function (e) {
    textEdit = false;
});
/**
 * Zmena barvy
 * */
function changeColor(color)
{
    globalColor = color;
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
connection.on("changeTextObject", function (objectId, updatedText) {
    updatedTextObj = canvas.getObjects().find(obj => {
        return obj.id === objectId
    })
    updatedTextObj.text = updatedText;
    updatedTextObj.setCoords();
    canvas.renderAll();
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
    movedObj.setCoords();
    canvas.renderAll();
});

/**
 * Příkaz ze serveru ke změně velikosti objektu
 * */
connection.on("changeObjectSize", function (objectId, newScaleX, newScaleY, newTop, newLeft) {
    resizedObj = canvas.getObjects().find(obj => {
        return obj.id === objectId
    })
    resizedObj.set({
        scaleX: newScaleX,
        scaleY: newScaleY,
        top: newTop,
        left: newLeft
    });
    //resizedObj.setCoords();
    canvas.renderAll();
});

/**
 * Příkaz ze serveru ke změně pozice objektu
 * */
connection.on("changeObjectAngle", function (objectId, angle) {
    rotatedObj = canvas.getObjects().find(obj => {
        return obj.id === objectId
    })
    rotatedObj.rotate(angle).setCoords();
    canvas.renderAll();
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
    e.path.stroke = globalColor;
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
        //let addedChar = updatedTextObj.text.slice(-1);
        connection.invoke("ChangeTextObject", e.target.id, updatedTextObj.text, groupName).catch(function (err) {
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
 * Event - Změna velikosti objektu
 * */
canvas.on('object:scaled', function (e) {
    connection.invoke("ChangeObjectSize", e.target.id, e.target.scaleX, e.target.scaleY, e.target.top, e.target.left, groupName).catch(function (err) {
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