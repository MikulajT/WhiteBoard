let connection = new signalR.HubConnectionBuilder().withUrl("/drawDotHub").build();
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
fabric.Object.prototype.lockScalingFlip = true;

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
 * Generování GUIDu
 * */
function generateGUID() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

/**
 * Upload obrázku na server
 * */
$("#imageUpload").change(function () {
    if (window.FormData !== undefined) {
        let fileUpload = $("#imageUpload").get(0);
        let files = fileUpload.files;
        let fileData = new FormData();
        fileData.append(files[0].name, files[0]);
        fileData.append('group', groupName);

        $.ajax({
            url: '/Room/UploadImage',
            type: "POST",
            contentType: false, // Not to set any content header
            processData: false, // Not to process data
            data: fileData,
            success: function () {
                console.log("Image uploaded.");
            },
            error: function (err) {
                alert(err.statusText);
            }
        });
    } else {
        alert("FormData is not supported.");
    }
});

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
        let pointer = canvas.getPointer(event.e);
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
 * Zkopirovani URL do schranky
 * */
document.getElementById("input_link").value = window.location.href;

function copyURL()
{
    let copyText = document.getElementById("input_link");
    copyText.select();
    document.execCommand("copy");
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
    let jsonObj = JSON.parse(jsonData);
    fabric.util.enlivenObjects([jsonObj], function (enlivenedObjects) {
        canvas.add(enlivenedObjects[0]);
        canvas.renderAll();
    });
});

/**
 * Příkaz ze serveru k vyčíštění označených objektů canvasu všech uživatelů
 * */
connection.on("deleteObjects", function (objectsId) {
    objects = canvas.getObjects();
    for (let i = objects.length-1; i > -1; i--) {
        if (objectsId.includes(objects[i].id)) {
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
 * Příkaz ze serveru ke změně velikosti objektu
 * */
connection.on("changeObjectSize", function (jsonData) {
    let resizedObjects = JSON.parse(jsonData);
    objects = canvas.getObjects();
    for (let i = 0; i < objects.length; i++) {
        if (objects[i].id in resizedObjects) {
            objects[i].set({
                top: resizedObjects[objects[i].id]["top"],
                left: resizedObjects[objects[i].id]["left"],
                scaleX: resizedObjects[objects[i].id]["scaleX"],
                scaleY: resizedObjects[objects[i].id]["scaleY"],
            });
            objects[i].setCoords();
        }
    }
    canvas.renderAll();
});

/**
 * Příkaz ze serveru ke změně pozice objektu
 * */
connection.on("changeObjectPosition", function (jsonData) {
    let movedObjects = JSON.parse(jsonData);
    objects = canvas.getObjects();
    for (let i = 0; i < objects.length; i++) {
        if (objects[i].id in movedObjects) {
            objects[i].set({
                top: movedObjects[objects[i].id]["top"],
                left: movedObjects[objects[i].id]["left"],
            });
            objects[i].setCoords();
        }
    }
    canvas.renderAll();
});

/**
 * Příkaz ze serveru k otočení objektu
 * */
connection.on("changeObjectAngle", function (jsonData) {
    let rotatedObjects = JSON.parse(jsonData);
    objects = canvas.getObjects();
    for (let i = 0; i < objects.length; i++) {
        if (objects[i].id in rotatedObjects) {         
            objects[i].set({               
                top: rotatedObjects[objects[i].id]["top"],
                left: rotatedObjects[objects[i].id]["left"],
                angle: rotatedObjects[objects[i].id]["angle"]
            }); 
            objects[i].setCoords();
        }
    }
    canvas.renderAll();
});

/**
 * Příkaz ze serveru k vložení obrázku z URL
 * */
connection.on("importImage", function (imageAddress) {
    fabric.Image.fromURL(imageAddress, function (myImg) {
        myImg.id = generateGUID();
        canvas.add(myImg);
    });
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
    e.path.id = generateGUID();
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
        e.target.id = generateGUID();
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
    let jsonData = {};
    if (e.target._objects) {
        for (let i = 0; i < e.target._objects.length; i++){
            var point = new fabric.Point(e.target._objects[i].left, e.target._objects[i].top);
            var transform = e.target.calcTransformMatrix();
            var actualCoordinates = fabric.util.transformPoint(point, transform);
            jsonData[e.target._objects[i].id] = {
                "top": actualCoordinates.y,
                "left": actualCoordinates.x
            };
        }
    }
    else {
        jsonData[e.target.id] = {
            "top": e.target.top,
            "left": e.target.left
        };
    }
    connection.invoke("ChangeObjectPosition", JSON.stringify(jsonData), groupName).catch(function (err) {
        return console.error(err.toString());   
    });
});

/**
 * Event - Otočení objektu
 * */
canvas.on('object:rotated', function (e) {  
    let jsonData = {};
    if (e.target._objects) {
        for (let i = 0; i < e.target._objects.length; i++) {
            var point = new fabric.Point(e.target._objects[i].left, e.target._objects[i].top);
            var transform = e.target.calcTransformMatrix();
            var actualCoordinates = fabric.util.transformPoint(point, transform);
            let matrix = e.target._objects[i].calcTransformMatrix();
            jsonData[e.target._objects[i].id] = {
                "top": actualCoordinates.y,
                "left": actualCoordinates.x,
                "angle": fabric.util.qrDecompose(matrix).angle
            };
        }
    }
    else {
        jsonData[e.target.id] = {
            "top": e.target.top,
            "left": e.target.left,
            "angle": e.target.angle,
        };
    }
    connection.invoke("ChangeObjectAngle", JSON.stringify(jsonData), groupName).catch(function (err) {
        return console.error(err.toString());
    });
});

/**
 * Event - Změna velikosti objektu
 * */
canvas.on('object:scaled', function (e) {
    let jsonData = {};
    if (e.target._objects) {
        for (let i = 0; i < e.target._objects.length; i++) {
            var point = new fabric.Point(e.target._objects[i].left, e.target._objects[i].top);
            var transform = e.target.calcTransformMatrix();
            var actualCoordinates = fabric.util.transformPoint(point, transform);
            let matrix = e.target._objects[i].calcTransformMatrix();
            jsonData[e.target._objects[i].id] = {
                "top": actualCoordinates.y,
                "left": actualCoordinates.x,
                "scaleX": fabric.util.qrDecompose(matrix).scaleX,
                "scaleY": fabric.util.qrDecompose(matrix).scaleY,
            };
        }
    }
    else {
        jsonData[e.target.id] = {
            "top": e.target.top,
            "left": e.target.left,
            "scaleX": e.target.scaleX,
            "scaleY": e.target.scaleY
        };
    }
    connection.invoke("ChangeObjectSize", JSON.stringify(jsonData), groupName).catch(function (err) {
        return console.error(err.toString());
    });
});

/**
 * Mazání označených objektů
 * */
$('html').keyup(function (e) {
    if (e.keyCode == 46) {
        let activeObjects = canvas.getActiveObjects();
        let objectsId = [];
        activeObjects.forEach(element => objectsId.push(element.id));
        if (activeObjects.length > 0) {
            connection.invoke("DeleteObjects", objectsId, groupName).catch(function (err) {
                return console.error(err.toString());
            });
            canvas.discardActiveObject();
            canvas.remove(...activeObjects);
        }
    }
});
