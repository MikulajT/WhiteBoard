let connection = new signalR.HubConnectionBuilder().withUrl("/drawDotHub").build();

connection.start().then(function () {
    // nothing here
}).catch(function (err) {
    return console.error(err.toString());
});

let canvas = new fabric.Canvas('canvas', {
    isDrawingMode: true
});


canvas.on('path:created', function (e) {
    connection.invoke("AddObject", JSON.stringify(e.path)).catch(function (err) {
        return console.error(err.toString());
    });
});

connection.on("clearCanvas", function () {
    canvas.clear();
});

connection.on("addObject", function (jsonData) {
    // Parse JSON and single object to canvas
    var jsonObj = JSON.parse(jsonData);
    fabric.util.enlivenObjects([jsonObj], function (enlivenedObjects) {
        canvas.add(enlivenedObjects[0]);
        canvas.renderAll();
    });
});

function tellServerToClear() {
    connection.invoke("ClearCanvas").catch(function (err) {
        return console.error(err.toString());
    });
}

let onStartDrawing = function () {
    canvas.isDrawingMode = true;
}

let onStopDrawing = function () {
    canvas.isDrawingMode = false;
}

function importFile() {
    document.getElementById('attachment').click();
}

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