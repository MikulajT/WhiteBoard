let connection = new signalR.HubConnectionBuilder().withUrl("/drawDotHub").build();
let groupName;

let textMode = false;
let textEdit = false;
let drawingMode = false;
let dragMode = false;

let globalColor = "#000000";
let undoStack = [];
let redoStack = [];

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
let canvas = new fabric.Canvas("canvas", {
    isDrawingMode: false,
    width: window.innerWidth,
    height: window.innerHeight
});
fabric.Object.prototype.lockScalingFlip = true;

/**
 * Přepnutí režimu kreslení
 * */
function changeDrawingMode() {
    if (!drawingMode) {
        document.getElementById("draw_button").style.backgroundColor = "#dddddd";
        canvas.isDrawingMode = true;
        drawingMode = true;

        if (textMode) changetextMode();
        if (dragMode) changeDragMode();
    }
    else {
        drawingMode = false;
        canvas.isDrawingMode = false;
        canvas.defaultCursor = "default";
        document.getElementById("draw_button").style.backgroundColor = "white";      
    }
}

/**
 * Přepnutí do textového rezimu
 * */
function changetextMode() {
    if (!textMode) {
        canvas.defaultCursor = "text";
        document.getElementById("text_button").style.backgroundColor = "#dddddd";
        textMode = true;

        if (drawingMode) changeDrawingMode();
        if (dragMode) changeDragMode();
    }
    else {
        textMode = false;
        canvas.defaultCursor = "default";
        document.getElementById("text_button").style.backgroundColor = "white";       
    }
}

/**
 * Přepnutí režimu pohybu po canvasu
 * */
function changeDragMode() {
    let objects = canvas.getObjects();
    if (!dragMode) {
        dragMode = true;
        canvas.defaultCursor = "grab";
        document.getElementById("drag_button").style.backgroundColor = "#dddddd";

        if (drawingMode) changeDrawingMode();
        if (textMode) changetextMode();
        for (let i = 0; i < objects.length; i++) {
            objects[i].selectable = false;
            objects[i].hoverCursor = "grab";
        }       
    }
    else {
        dragMode = false;
        canvas.defaultCursor = "default";
        document.getElementById("drag_button").style.backgroundColor = "white";
        for (let i = 0; i < objects.length; i++) {
            objects[i].selectable = true;
            objects[i].hoverCursor = null;
        }  
    }
}

/**
 * Pohyb po canvasu
 * */
canvas.on("mouse:down", function (opt) {
    var evt = opt.e;
    if (dragMode) {
        this.isDragging = true;
        this.selection = false;
        this.lastPosX = evt.clientX;
        this.lastPosY = evt.clientY;
    }
});
canvas.on("mouse:move", function (opt) {
    if (this.isDragging) {
        var e = opt.e;
        var vpt = this.viewportTransform;
        vpt[4] += e.clientX - this.lastPosX;
        vpt[5] += e.clientY - this.lastPosY;
        this.requestRenderAll();
        this.lastPosX = e.clientX;
        this.lastPosY = e.clientY;
    }
});
canvas.on("mouse:up", function (opt) {
    // on mouse up we want to recalculate new interaction
    // for all objects, so we call setViewportTransform
    this.setViewportTransform(this.viewportTransform);
    this.isDragging = false;
    this.selection = true;
});

/**
 * Z URL získá skupinu
 * */
function getGroupName() {
    let segmentStr = window.location.pathname;
    let segmentArray = segmentStr.split("/");
    let groupName = segmentArray.pop();
    return groupName;
}

/**
 * Zoom
 * */
canvas.on("mouse:wheel", function (opt) {
    var delta = opt.e.deltaY;
    var zoom = canvas.getZoom();
    zoom *= 0.999 ** delta;
    if (zoom > 20) zoom = 20;
    if (zoom < 0.01) zoom = 0.01;
    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
    opt.e.preventDefault();
    opt.e.stopPropagation();
});

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
        fileData.append("group", groupName);

        $.ajax({
            url: "/Room/UploadImage",
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
    $("<a>").attr({ href: canvas.toDataURL(), download: "Board.png" })[0].click();
}

/**
 * Event - vložení textu
 * */
canvas.on("mouse:down", function (event) {
    if (textMode && !textEdit) {
        let pointer = canvas.getPointer(event.e);
        let iText = new fabric.IText("", {
            left: pointer.x,
            top: pointer.y,
            fontFamily: "Helvetica",
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
    let editedObject = e.target;
    if (editedObject.textHistory.length == 0) {
        let undoEntry = { action: "added", objects: [{ id: editedObject.id }] };
        undoStack.push(undoEntry);
    }
    if (editedObject.textHistory[editedObject.textHistory.length - 1] != editedObject.text) {
        editedObject.textHistory.push(editedObject.text);
        if (editedObject.textHistory.length > 1) {
            let undoEntry = {
                action: "textChanged",
                objects: [{ id: editedObject.id, text: editedObject.textHistory[editedObject.textHistory.length - 2] }]
            };
            undoStack.push(undoEntry);
        }
    }
});

/**
 * Změní barvu kreslené čáry
 * @param {any} color
 */
function changeColor(color)
{
    canvas.freeDrawingBrush.color = color;
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
connection.on("addObject", function (jsonObjects) {
    for (let i = 0; i < jsonObjects.length; i++) {
        let jsonObj = JSON.parse(jsonObjects[i]);
        fabric.util.enlivenObjects([jsonObj], function (enlivenedObjects) {
            canvas.add(enlivenedObjects[0]);
            canvas.renderAll();
        });
    }
});

/**
 * Příkaz ze serveru k vyčíštění označených objektů canvasu všech uživatelů
 * */
connection.on("deleteObjects", function (objectsId) {
    let objects = canvas.getObjects();
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
    updatedTextObj = canvas.getObjects().find(obj => {return obj.id === objectId})
    updatedTextObj.text = updatedText;
    updatedTextObj.setCoords();
    canvas.renderAll();
});

/**
 * Přikaz ze serveru k překreslení modifikovaných objektů
 * */
connection.on("modifyObjects", function (jsonData) {
    let resizedObjects = JSON.parse(jsonData);
    objects = canvas.getObjects();
    for (let i = 0; i < objects.length; i++) {
        if (objects[i].id in resizedObjects) {
            objects[i].set({
                top: resizedObjects[objects[i].id]["top"],
                left: resizedObjects[objects[i].id]["left"],
                angle: resizedObjects[objects[i].id]["angle"],
                scaleX: resizedObjects[objects[i].id]["scaleX"],
                scaleY: resizedObjects[objects[i].id]["scaleY"],
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
canvas.on("path:created", function (e) {
    let objWithId = e.path;
    objWithId.id = generateGUID();
    let undoEntry = { action: "added", objects: [{ id: objWithId.id }] };
    undoStack.push(undoEntry);
    objWithId = e.path.toJSON(["id"]);
    connection.invoke("AddObjects", [JSON.stringify(objWithId)], groupName).catch(function (err) {
        return console.error(err.toString());
    });
});

/**
 * Event - Změna vkládaného textu
 * */
canvas.on("text:changed", function (e) {
    if (e.target.id == null) {
        e.target.id = generateGUID();
        objWithId = e.target.toJSON(["id"]);
        connection.invoke("AddObjects", [JSON.stringify(objWithId)], groupName).catch(function (err) {
            return console.error(err.toString());
        });
    }
    else {
        let updatedTextObj = canvas.getObjects().find(obj => { return obj.id === e.target.id})
        //let addedChar = updatedTextObj.text.slice(-1);
        connection.invoke("ChangeTextObject", e.target.id, updatedTextObj.text, groupName).catch(function (err) {
            return console.error(err.toString());
        });
    }
});

/**
 * Registrace eventu vytvoření, otočení a změny velikosti objektu k metodě
 * */
canvas.on({
    "object:moved": objectModified,
    "object:rotated": objectModified,
    "object:scaled": objectModified
});

/**
 * Reakce na modifikaci objektů
 * @param {any} e
 */
function objectModified(e) {
    let jsonData = {};
    if (e.target._objects) {
        let groupUndoEntries = [];
        for (let i = 0; i < e.target._objects.length; i++) {
            let point = new fabric.Point(e.target._objects[i].left, e.target._objects[i].top);
            let transform = e.target.calcTransformMatrix();
            let actualCoordinates = fabric.util.transformPoint(point, transform);
            let matrix = e.target._objects[i].calcTransformMatrix();
            jsonData[e.target._objects[i].id] = {
                "top": actualCoordinates.y,
                "left": actualCoordinates.x,
                "angle": fabric.util.qrDecompose(matrix).angle,
                "scaleX": fabric.util.qrDecompose(matrix).scaleX,
                "scaleY": fabric.util.qrDecompose(matrix).scaleY,
            };
            let lastPos = e.target._objects[i].coordsHistory.pop();
            let undoEntry = {
                id: e.target._objects[i].id,
                top: lastPos.top,
                left: lastPos.left,
                angle: lastPos.angle,
                scaleX: lastPos.scaleX,
                scaleY: lastPos.scaleY
            };
            groupUndoEntries.push(undoEntry);
        }
        undoStack.push({ action: "modified", objects: groupUndoEntries });
    }
    else {
        jsonData[e.target.id] = {
            "top": e.target.top,
            "left": e.target.left,
            "angle": e.target.angle,
            "scaleX": e.target.scaleX,
            "scaleY": e.target.scaleY
        };
        let lastPos = e.target.coordsHistory.pop();
        let undoEntry = {
            action: "modified",
            objects: [{
                id: e.target.id,
                top: lastPos.top,
                left: lastPos.left,
                angle: lastPos.angle,
                scaleX: lastPos.scaleX,
                scaleY: lastPos.scaleY
            }]
        };
        undoStack.push(undoEntry);
    }
    connection.invoke("ModifyObjects", JSON.stringify(jsonData), groupName).catch(function (err) {
        return console.error(err.toString());
    });
}

/**
 * Odstraní označené objekty
 * */
function deleteActiveObjects() {
    let activeObjects = canvas.getActiveObjects();
    let objectsId = [];
    activeObjects.forEach(element => objectsId.push(element.id));
    if (activeObjects.length > 0) {
        let groupUndoEntries = [];
        canvas.discardActiveObject();
        for (let i = 0; i < activeObjects.length; i++) {
            groupUndoEntries.push(JSON.stringify(activeObjects[i].toJSON(["id"])));
            canvas.remove(activeObjects[i]);
        }
        undoStack.push({ action: "removed", objects: groupUndoEntries });
        connection.invoke("DeleteObjects", objectsId, groupName).catch(function (err) {
            return console.error(err.toString());
        });
    }
}

/**
 * Uloži aktuální pozici označených objektů při kliknutí
 * */
canvas.on("before:transform", function (e) {
    if (e.transform.target) {
        if (e.transform.target.get("type") == "activeSelection") {
            for (let i = 0; i < e.transform.target._objects.length; i++) {
                let point = new fabric.Point(e.transform.target._objects[i].left, e.transform.target._objects[i].top);
                let transform = e.transform.target.calcTransformMatrix();
                let actualCoordinates = fabric.util.transformPoint(point, transform);
                let matrix = e.transform.target._objects[i].calcTransformMatrix();
                e.transform.target._objects[i].coordsHistory.push({
                    top: actualCoordinates.y,
                    left: actualCoordinates.x,
                    angle: fabric.util.qrDecompose(matrix).angle,
                    scaleX: fabric.util.qrDecompose(matrix).scaleX,
                    scaleY: fabric.util.qrDecompose(matrix).scaleY
                });
            }
        }
        else {
            e.transform.target.coordsHistory.push({
                top: e.transform.target.top,
                left: e.transform.target.left,
                angle: e.transform.target.angle,
                scaleX: e.transform.target.scaleX,
                scaleY: e.transform.target.scaleY
            });
        }
    }
});

canvas.on("object:added", function (e) {
    e.target.coordsHistory = [];
    if (e.target.get("type") == "i-text") {
        e.target.textHistory = [];
    }
});

/**
 * Operace undo
 * */
function undo() {
    if (undoStack.length > 0) {
        let undoEntry = undoStack.pop();
        switch (undoEntry.action) {
            case "added":
                undoRedoObjectsInsertion("undo", undoEntry.objects);
                break;
            case "removed":
                undoRedoObjectsRemoval("undo", undoEntry.objects);
                break;
            case "modified":
                undoRedoObjectsModification("undo", undoEntry.objects);
                break;
            case "textChanged":
                undoRedoTextChange("undo", undoEntry.objects);
                break;
        }
        canvas.renderAll();
    }
}

/**
 * Operace redo
 * */
function redo() {
    if (redoStack.length > 0) {
        let redoEntry = redoStack.pop();
        switch (redoEntry.action) {
                case "added":
                    undoRedoObjectsInsertion("redo", redoEntry.objects);
                    break;
                case "removed":
                    undoRedoObjectsRemoval("redo", redoEntry.objects);
                    break;
                case "modified":
                    undoRedoObjectsModification("redo", redoEntry.objects);
                    break;
                case "textChanged":
                    undoRedoTextChange("redo", redoEntry.objects);
                    break;
            }
        canvas.renderAll();
    }
}

/**
 * Provede undo/redo u přidání objektů
 * @param {any} undoOrRedo
 * @param {any} stackObjects
 */
function undoRedoObjectsInsertion(undoOrRedo, stackObjects) {
    let groupEntries = [];
    let objectsId = [];
    for (let i = 0; i < stackObjects.length; i++) {
        let canvasObj = canvas.getObjects().find(obj => { return obj.id === stackObjects[i].id });
        groupEntries.push(JSON.stringify(canvasObj.toJSON(["id"])));
        canvas.remove(canvasObj);
        objectsId.push(stackObjects[i].id);
    }
    if (undoOrRedo == "undo") {
        redoStack.push({ action: "removed", objects: groupEntries });
    }
    else {
        undoStack.push({ action: "removed", objects: groupEntries });
    }
    connection.invoke("DeleteObjects", objectsId, groupName).catch(function (err) {
        return console.error(err.toString());
    });
}

/**
 * Provede undo/redo u odebrání objektů
 * @param {any} undoOrRedo
 * @param {any} stackObjects
 */
function undoRedoObjectsRemoval(undoOrRedo, stackObjects) {
    let groupEntries = [];
    let jsonObjects = [];
    for (let i = 0; i < stackObjects.length; i++) {
        fabric.util.enlivenObjects([JSON.parse(stackObjects[i])], function (enlivenedObjects) {
            canvas.add(enlivenedObjects[0].setCoords());
            canvasObj = enlivenedObjects[0];
        });
        groupEntries.push({ id: canvasObj.id });
        jsonObjects.push(JSON.stringify(canvasObj.toJSON(["id"])));
    }
    if (undoOrRedo == "undo") {
        redoStack.push({ action: "added", objects: groupEntries });
    }
    else {
        undoStack.push({ action: "added", objects: groupEntries });
    }
    connection.invoke("AddObjects", jsonObjects, groupName).catch(function (err) {
        return console.error(err.toString());
    });
}

/**
 * Provede undo/redo u změny objektů
 * @param {any} undoOrRedo
 * @param {any} stackObjects
 */
function undoRedoObjectsModification(undoOrRedo, stackObjects) {
    let groupEntries = [];
    let jsonData = {};
    for (let i = 0; i < stackObjects.length; i++) {
        let canvasObj = canvas.getObjects().find(obj => { return obj.id === stackObjects[i].id });
        entry = {
            id: canvasObj.id,
            top: canvasObj.top,
            left: canvasObj.left,
            angle: canvasObj.angle,
            scaleX: canvasObj.scaleX,
            scaleY: canvasObj.scaleY
        };
        groupEntries.push(entry);
        canvasObj.set({
            top: stackObjects[i].top,
            left: stackObjects[i].left,
            angle: stackObjects[i].angle,
            scaleX: stackObjects[i].scaleX,
            scaleY: stackObjects[i].scaleY
        });
        canvasObj.setCoords();
        jsonData[canvasObj.id] = {
            "top": stackObjects[i].top,
            "left": stackObjects[i].left,
            "angle": stackObjects[i].angle,
            "scaleX": stackObjects[i].scaleX,
            "scaleY": stackObjects[i].scaleY,
        };
    }
    if (undoOrRedo == "undo") {
        redoStack.push({ action: "modified", objects: groupEntries });
    }
    else {
        undoStack.push({ action: "modified", objects: groupEntries });
    }
    connection.invoke("ModifyObjects", JSON.stringify(jsonData), groupName).catch(function (err) {
        return console.error(err.toString());
    });
}

/**
 * Provede undo/redo u změny textu
 * @param {any} undoOrRedo
 * @param {any} stackObject
 */
function undoRedoTextChange(undoOrRedo, stackObject) {
    let canvasObj = canvas.getObjects().find(obj => { return obj.id === stackObject[0].id });
    let objTempText = canvasObj.text;
    canvasObj.set({
        text: stackObject[0].text
    });
    if (undoOrRedo == "undo") {
        redoStack.push({ action: "textChanged", objects: [{ id: canvasObj.id, text: objTempText }] });
    }
    else {
        undoStack.push({ action: "textChanged", objects: [{ id: canvasObj.id, text: objTempText }] });
    }
    connection.invoke("ChangeTextObject", canvasObj.id, canvasObj.text, groupName).catch(function (err) {
        return console.error(err.toString());
    });
}

/**
 * Provede akci v závislosti na stisknutých tlačítkách
 * */
$("html").keyup(function (e) {
    if (e.keyCode == 46) {
        deleteActiveObjects();
    }
    else if (e.keyCode == 90 && e.ctrlKey) {
        undo();
    }
    else if (e.keyCode == 89 && e.ctrlKey) {
        redo();
    }
    else if ((e.keyCode == 65 || e.keyCode == 97) && e.ctrlKey) {
        canvas.discardActiveObject();
        var selection = new fabric.ActiveSelection(canvas.getObjects(), {
            canvas: canvas,
        });
        canvas.setActiveObject(selection);
        canvas.requestRenderAll();
    }
});