var connection = new signalR.HubConnectionBuilder().withUrl("/drawDotHub").build();

connection.on("clearCanvas", function () {
    //ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.clear();
});

connection.start().then(function () {
    // nothing here
}).catch(function (err) {
    return console.error(err.toString());
});

function tellServerToClear() {
    connection.invoke("ClearCanvas").catch(function (err) {
        return console.error(err.toString());
    });
}

let canvas = new fabric.Canvas('canvas', {
    isDrawingMode: true
});