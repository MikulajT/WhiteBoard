let connection = new signalR
				.HubConnectionBuilder()
				.withUrl("/drawDotHub")
				//.withAutomaticReconnect()
				.configureLogging(signalR.LogLevel.Debug)
				.build();

let groupName;

let selectMode = false;
let textMode = false;
let textEdit = false;
let drawingMode = false;
let dragMode = false;
let straightLineMode = false;

let isButtonDown = false;

let undoStack = [];
let redoStack = [];
let clonedObjects;
let straightLine;
let currentFont = "Helvetica";
let readMode = false;
document.getElementById("Link").value = window.location.href;

/**
 * Vytvoření spojení se serverem
 */
connection.start().then(function () {
	groupName = getGroupName();
	connection.invoke("StartUserConnection", groupName)
}).catch(function (err) {
	return console.error(err.toString());
});

/**
 * Vytvoření canvasu
 */
let canvas = new fabric.Canvas("canvas", {
	isDrawingMode: false,
	width: window.screen.width,
	height: window.screen.height
});
fabric.Object.prototype.lockScalingFlip = true;

function pageRedirectWarning() {
	return "";
}

/**
 * Notifikace o úspěšném odeslaní mailu
 */
var onSuccess = function () {
	$("#success-toast-body").text("Board invitation was successfully sent.");
	$("#success-toast").toast("show");
	$("#link").modal("hide");
};

/**
 * Notifikace o uploadnutí souboru nepodporovaného typu
 */
function unsupportedFileType () {
	$("#failure-toast").toast("show");
};

/**
 * Požadavek na server ke změně přezdívky uživatele
 */
function changeUsername() {
	let changedUsername = $("#username").val();
	$("#success-toast-body").text("Username was successfully changed.");
	$("#success-toast").toast("show");
	connection.invoke("ChangeUsername", changedUsername, groupName).catch(function (err) {
		return console.error(err.toString());
	});
}

/**
 * Požadavek na server ke změně názvu tabule
 */
function changeBoardname(boardName) {
	connection.invoke("ChangeBoardname", boardName, groupName).catch(function (err) {
		return console.error(err.toString());
	});
}

/*
 * Umožňuje uložit obrázky do JSONu při exportu tabule do nativního formátu
 */
fabric.Image.prototype.toObject = (function (toObject) {
	return function () {
		return fabric.util.object.extend(toObject.call(this), {
			src: this.toDataURL()
		});
	};
})(fabric.Image.prototype.toObject);

/**
 * Inicializace ovládacího prvku pro výběr barvy
 */
$("#global-color-picker").spectrum({
	showAlpha: false,
	allowEmpty: false,
	showButtons: false,
	showPaletteOnly: true
});

/*
 * Inicializace kontextového menu
 */
$.contextMenu({
	selector: '.context-menu',
	items: {
		toFront: {
			name: "Move to front",
			disabled: true,
			callback: function () {
				moveObjectsStack("front");
			}
		},
		toBack: {
			name: "Move to back",
			disabled: true,
			callback: function () {
				moveObjectsStack("back");
			}
		},
		"sep1": "---------",
		selectAll: {
			name: "Select all",
			callback: function () {
				selectAllObjects();
			}
		},
		copy: {
			name: "Copy",
			disabled: true,
			icon: "copy",
			callback: function () {
				copyObjects();
			}
		},
		paste: {
			name: "Paste",
			disabled: true,
			icon: "paste",
			callback: function () {
				pasteObjects();
			}
		},
		"sep2": "---------",
		removeObj: {
			name: "Remove",
			disabled: true,
			icon: "delete",
			callback: deleteActiveObjects
		}
	},
	events: {
		show: contextMenuShowed
	}
});

/*
 * Inicializace font pickeru
 */
$('#global-font-picker').fontselect({
	placeholder: 'Select a font',
	placeholderSearch: 'Search...',
	lookahead: 2,
	searchable: true,
	systemFonts: ['Helvetica', 'Comic+Sans+MS', 'Verdana', 'Impact', 'Calibri', 'Quicksand'],
	googleFonts: []
}).on('change', function () {
	changeGlobalFont(this.value);
});
$('#global-font-picker').trigger('setFont', 'Helvetica');

$('#object-font-picker').fontselect({
	placeholder: 'Select a font',
	placeholderSearch: 'Search...',
	lookahead: 2,
	searchable: true,
	systemFonts: ['Helvetica', 'Comic+Sans+MS', 'Verdana', 'Impact', 'Calibri', 'Quicksand'],
	googleFonts: []
}).on('change', function () {
	changeObjectFont(this.value);
});

/*
 * Změní aktuálně zvolený font 
 */
function changeGlobalFont(fontValue) {
	currentFont = fontValue;
}

/*
 * Změní font textového objektu 
 */
function changeObjectFont(fontValue) {
	let activeObject = canvas.getActiveObjects()[0];
	let textFont = activeObject.fontFamily;
	let jsonData = {};
	let undoEntry = {
		action: "propertiesChanged",
		objects: [{ id: activeObject.id, properties: [{ fontFamily: activeObject.fontFamily }] }]
	};
	undoStack.push(undoEntry);
	activeObject.set("fontFamily", fontValue);
	jsonData[activeObject.id] = {
		"fontFamily": fontValue,
	};
	canvas.requestRenderAll();
	connection.invoke("ModifyObjects", JSON.stringify(jsonData), groupName).catch(function (err) {
		return console.error(err.toString());
	});
	actionHistoryAppend(`font changed from ${textFont} to ${activeObject.fontFamily}`, "text");
}

/*
 * Změní velikost označeného objektu 
 */
$("#object-size").on("change", function () {
	let activeObject = canvas.getActiveObjects()[0];
	let jsonData = {};
	let undoEntry = {};
	if (activeObject.get("type") == "i-text") {
		undoEntry = {
			action: "propertiesChanged",
			objects: [{ id: activeObject.id, properties: [{ fontSize: activeObject.fontSize }] }]
		};
		activeObject.set("fontSize", this.value * 4);
		jsonData[activeObject.id] = {
			"fontSize": activeObject.fontSize
		};
	}
	else if (activeObject.get("type") == "path" ||
		activeObject.get("type") == "line") {
		undoEntry = {
			action: "propertiesChanged",
			objects: [{ id: activeObject.id, properties: [{ strokeWidth: activeObject.strokeWidth }] }]
		};
		activeObject.set("strokeWidth", parseInt(this.value));
		jsonData[activeObject.id] = {
			"strokeWidth": activeObject.strokeWidth
		};
	}
	undoStack.push(undoEntry);
	activeObject.setCoords();
	canvas.requestRenderAll();
	connection.invoke("ModifyObjects", JSON.stringify(jsonData), groupName).catch(function (err) {
		return console.error(err.toString());
	});
	actionHistoryAppend("size changed", activeObject.get("type"));
});

$("#path-object-size").on("change", function () {
	canvas.freeDrawingBrush.width = parseInt(this.value);
});

/*
 * Přesune vybrané objekty do horní nebo spodní vrstvy canvasu
 */
function moveObjectsStack(frontOrBack) {
	let activeObjects = canvas.getActiveObjects();
	let objectsId = [];
	if (frontOrBack == "front") {
		for (let i = 0; i < activeObjects.length; i++) {
			activeObjects[i].bringToFront();
			objectsId.push(activeObjects[i].id);
		}
	}
	else {
		for (let i = 0; i < activeObjects.length; i++) {
			activeObjects[i].sendToBack();
			objectsId.push(activeObjects[i].id);
		}
	}
	connection.invoke("MoveObjectsStack", JSON.stringify(objectsId), frontOrBack, groupName).catch(function (err) {
		return console.error(err.toString());
	});
}

/*
 * Zobrazení kontextového menu
 */
function contextMenuShowed(opt) {
	let activeObjects = canvas.getActiveObjects();
	opt.items.toFront.disabled = !(activeObjects.length > 0);
	opt.items.toBack.disabled = !(activeObjects.length > 0);
	opt.items.removeObj.disabled = !(activeObjects.length > 0);
	opt.items.copy.disabled = !(activeObjects.length > 0);
	if (clonedObjects) opt.items.paste.disabled = false;
	else opt.items.paste.disabled = true;
}

/**
 * Přepnutí režimu vyberu
 */
function changeSelectMode() {
	if (!selectMode) {
		document.getElementById("select_button").style.backgroundColor = "#dddddd";
		selectMode = true;

		if (textMode) changetextMode();
		if (dragMode) changeDragMode();
		if (straightLineMode) changeStraightLineMode();
		if (drawingMode) changeDrawingMode();
	}
	else {
		selectMode = false;
		canvas.defaultCursor = "default";
		document.getElementById("select_button").style.backgroundColor = "white";
	}
}

/**
 * Přepnutí režimu kreslení
 */
function changeDrawingMode() {
	if (!drawingMode) {
		document.getElementById("draw_button").style.backgroundColor = "#dddddd";
		canvas.isDrawingMode = true;
		drawingMode = true;

		if (selectMode) changeSelectMode();
		if (textMode) changetextMode();
		if (dragMode) changeDragMode();
		if (straightLineMode) changeStraightLineMode();
	}
	else {       
		drawingMode = false;
		canvas.isDrawingMode = false;
		canvas.defaultCursor = "default";
		document.getElementById("draw_button").style.backgroundColor = "white";
	}
	showPathMenu();
}

function changeStraightLineMode() {
	if (!straightLineMode) {
		document.getElementById("straight_line_button").style.backgroundColor = "#dddddd";
		canvas.selection = false;
		straightLineMode = true;

		if (selectMode) changeSelectMode();
		if (drawingMode) changeDrawingMode();
		if (textMode) changetextMode();
		if (dragMode) changeDragMode();
	}
	else {      
		canvas.forEachObject(function (object) {
			object.selectable = true;
			object.setCoords()
		})
		straightLineMode = false;
		canvas.selection = true;
		canvas.defaultCursor = "default";
		document.getElementById("straight_line_button").style.backgroundColor = "white";
	}
	showLineMenu();
}

/**
 * Přepnutí do textového rezimu
 */
function changetextMode() {
	if (!textMode) {
		canvas.defaultCursor = "text";
		document.getElementById("text_button").style.backgroundColor = "#dddddd";
		textMode = true;

		if (selectMode) changeSelectMode();
		if (drawingMode) changeDrawingMode();
		if (dragMode) changeDragMode();
		if (straightLineMode) changeStraightLineMode();
	}
	else {      
		textMode = false;
		canvas.defaultCursor = "default";
		document.getElementById("text_button").style.backgroundColor = "white";
	}
	showTextMenu();
}

/**
 * Přepnutí režimu pohybu po canvasu
 */
function changeDragMode() {
	let objects = canvas.getObjects();
	if (!dragMode) {
		dragMode = true;
		canvas.defaultCursor = "grab";
		document.getElementById("drag_button").style.backgroundColor = "#dddddd";

		if (selectMode) changeSelectMode();
		if (drawingMode) changeDrawingMode();
		if (textMode) changetextMode();
		if (straightLineMode) changeStraightLineMode();
		for (let i = 0; i < objects.length; i++) {
			objects[i].selectable = false;
			objects[i].hoverCursor = "grab";
		}
	}
	else {
		dragMode = false;
		canvas.defaultCursor = "default";
		document.getElementById("drag_button").style.backgroundColor = "white";
		if (!readMode) {
			for (let i = 0; i < objects.length; i++) {
				objects[i].selectable = true;
				objects[i].hoverCursor = null;
			}
		}
		else {
			for (let i = 0; i < objects.length; i++) {
				objects[i].hoverCursor = null;
			}
		}
	}
}

/**
 * Zobrazí nebo skryje detailní menu pro text
 */
function showTextMenu() {
	let textMenu = document.getElementById("text-detail-menu");
	if (window.getComputedStyle(textMenu).display === "none") {
		textMenu.style.display = "grid";
	}
	else {
		textMenu.style.display = "none";
	}
}

/**
 * Zobrazí nebo skryje detailní menu pro kreslení čar
 */
function showPathMenu() {
	let pathMenu = document.getElementById("path-detail-menu");
	if (window.getComputedStyle(pathMenu).display === "none") {
		pathMenu.style.display = "grid";
	}
	else {
		pathMenu.style.display = "none";
	}
}

/**
 * Zobrazí nebo skryje detailní menu pro kreslení čar
 */
function showLineMenu() {
	let lineMenu = document.getElementById("line-detail-menu");
	if (window.getComputedStyle(lineMenu).display === "none") {
		lineMenu.style.display = "grid";
	}
	else {
		lineMenu.style.display = "none";
	}
}

/**
 * Zobrazí okno historie akcí 
 */
function showActionHistory() {
	let actionHistory = document.getElementById("action-history");
	if (window.getComputedStyle(actionHistory).display === "none") {
		actionHistory.style.display = "inline-block";
	}
	else {
		actionHistory.style.display = "none";
	}
}

/**
 * Skryje okno historie akcí
 */
function hideActionHistory() {
	document.getElementById("action-history").style.display = "none";
}

/**
 * Pohyb po canvasu
 */
canvas.on("mouse:down", function (opt) {
	let evt = opt.e;
	if (dragMode) {
		this.isDragging = true;
		this.selection = false;
		this.lastPosX = evt.clientX;
		this.lastPosY = evt.clientY;
	}
	else if (straightLineMode) {
		isButtonDown = true;
		let pointer = canvas.getPointer(opt.e);
		let points = [pointer.x, pointer.y, pointer.x, pointer.y];
		straightLine = new fabric.Line(points, {
			strokeWidth: parseInt(document.getElementById("line-object-size").value),
			stroke: $("#global-color-picker").val()
		});
		canvas.add(straightLine);
	}
});
canvas.on("mouse:move", function (opt) {
	if (this.isDragging) {
		let e = opt.e;
		let vpt = this.viewportTransform;
		vpt[4] += e.clientX - this.lastPosX;
		vpt[5] += e.clientY - this.lastPosY;
		this.requestRenderAll();
		this.lastPosX = e.clientX;
		this.lastPosY = e.clientY;
	}
	else if (straightLineMode) {
		if (!isButtonDown) return;
		let pointer = canvas.getPointer(opt.e);
		straightLine.set({ x2: pointer.x, y2: pointer.y });
		canvas.renderAll();
	}
});
canvas.on("mouse:up", function (opt) {
	// on mouse up we want to recalculate new interaction
	// for all objects, so we call setViewportTransform
	this.setViewportTransform(this.viewportTransform);
	this.isDragging = false;
	this.selection = true;
	if (straightLineMode) {
		isButtonDown = false;
		canvas.forEachObject(function (object) {
			object.selectable = false;
			object.setCoords();
		})
		canvas.selection = false;
		pathCreated(straightLine);
	}
});

/**
 * Z URL získá skupinu
 */
function getGroupName() {
	let segmentStr = window.location.pathname;
	let segmentArray = segmentStr.split("/");
	let groupName = segmentArray.pop();
	return groupName;
}

/**
 * Zoom
 */
canvas.on("mouse:wheel", function (opt) {
	let delta = opt.e.deltaY;
	let zoom = canvas.getZoom();
	zoom *= 0.999 ** delta;
	if (zoom > 20) zoom = 20;
	if (zoom < 0.01) zoom = 0.01;
	canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
	opt.e.preventDefault();
	opt.e.stopPropagation();
});

/**
 * Generování GUIDu
 */
function generateGUID() {
	return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
		(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
	);
}

/**
 * Upload obrázku na server
 */
$("#imageUpload").change(function () {
	if (window.FormData !== undefined) {
		let fileUpload = $("#imageUpload").get(0);
		let files = fileUpload.files;
		let fileData = new FormData();
		fileData.append(files[0].name, files[0]);
		fileData.append("group", groupName);

		$.ajax({
			url: "/Board/UploadImage",
			type: "POST",
			contentType: false, // Not to set any content header
			processData: false, // Not to process data
			data: fileData,
			success: function () {
				actionHistoryAppend("inserted", "image");
			},
			error: function (err) {
				unsupportedFileType();
			}
		});
		//Je třeba provést kvůli eventu .change (nejde nahrát stejný obrázek 2x)
		$("#imageUpload").val("");
	} else {
		unsupportedFileType();
	}
});

/**
 * Export tabule do formátu PNG
 */
function exportToImage() {
	let transform = canvas.viewportTransform.slice();
	canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
	let sel = new fabric.ActiveSelection(canvas.getObjects(), {
		canvas: canvas,
	});
	$("<a>").attr({
		href: canvas.toDataURL({
			format: "png",
			width: sel.width + Math.abs(sel.left),
			height: sel.height + Math.abs(sel.top),
			left: sel.left < 0 ? sel.left : null,
			top: sel.top < 0 ? sel.left : null,
		}), download: "Board"
	})[0].click();
	canvas.viewportTransform = transform;
}

/**
 * Ulozeni canvasu jako projektu
 */
function saveProject(el) {
	let data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(canvas.toDatalessJSON(['id'])));
	el.setAttribute("href", "data:" + data);
	el.setAttribute("download", "Board.json");
}

/**
 * Nacteni canvasu jako projektu
 */
$(document).on('change', '#projectUpload', function (event) {
	let reader = new FileReader();
	reader.onload = function (event) {
		let jsonObj = JSON.parse(event.target.result);
		canvas.loadFromJSON(jsonObj);
		connection.invoke("LoadCanvas", event.target.result, groupName).catch(function (err) {
			return console.error(err.toString());
		});
	}
	if (event.target.files[0].type == "application/json") {
		reader.readAsText(event.target.files[0]);
	}
	else {
		unsupportedFileType();
	}
});

/**
 * Event - vložení textu
 */
canvas.on("mouse:down", function (event) {
	if (textMode && !textEdit) {
		let pointer = canvas.getPointer(event.e);
		let color = $("#global-color-picker").val();
		let iText = new fabric.IText("", {
			left: pointer.x,
			top: pointer.y,
			fontFamily: currentFont,
			fill: color,
			lineHeight: 1.1,
			fontSize: document.getElementById("global-object-size").value * 4
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
 */
canvas.on("text:editing:exited", function (e) {
	textEdit = false;
	let editedObject = e.target;
	if (editedObject.textHistory.length == 0) {
		let undoEntry = { action: "added", objects: [{ id: editedObject.id }] };
		undoStack.push(undoEntry);
		actionHistoryAppend(`\'${editedObject.text}\' inserted`, "text");
	}
	let previousText = editedObject.textHistory[editedObject.textHistory.length - 1];
	if (previousText != editedObject.text) {
		editedObject.textHistory.push(editedObject.text);
		if (editedObject.textHistory.length > 1) {
			let undoEntry = {
				action: "propertiesChanged",
				objects: [{
					id: editedObject.id, properties: [{ text: editedObject.textHistory[editedObject.textHistory.length - 2] }] }]
			};
			undoStack.push(undoEntry);
			actionHistoryAppend(`\'${previousText}\' edited to \'${editedObject.text}\'`, "text");
		}
	}
});

/**
 * Event - změní barvu štětce případně i oznažených objektů
 */
$("#global-color-picker").on("move.spectrum", function (e, color) {
	let changedColor = color.toHexString();
	canvas.freeDrawingBrush.color = changedColor;
	let activeObjects = canvas.getActiveObjects();
	if (activeObjects.length > 0) {
		let jsonData = {};
		let groupUndoEntries = [];
		for (let i = 0; i < activeObjects.length; i++) {
			let undoEntry;
			if (activeObjects[i].get("type") == "path" ||
				activeObjects[i].get("type") == "line") {
				undoEntry = { id: activeObjects[i].id, properties: [{ stroke: activeObjects[i].stroke }] };
				activeObjects[i].set("stroke", changedColor);
				jsonData[activeObjects[i].id] = {
					"stroke": changedColor,
				};
			}
			else {
				undoEntry = {
					id: activeObjects[i].id, properties: [{ fill: activeObjects[i].fill }] };
				activeObjects[i].set("fill", changedColor);
				jsonData[activeObjects[i].id] = {
					"fill": changedColor,
				};
			}
			groupUndoEntries.push(undoEntry);
		}
		undoStack.push({ action: "propertiesChanged", objects: groupUndoEntries });
		canvas.requestRenderAll();
		connection.invoke("ModifyObjects", JSON.stringify(jsonData), groupName).catch(function (err) {
			return console.error(err.toString());
		});
		actionHistoryAppend("color changed", activeObjects.length > 1 ? "group" : activeObjects[0].get("type"));
	}
});

/**
 * Zkopirovani URL do schranky
 */
$('#pin').modal({
	backdrop: 'static',
	keyboard: false
})
$('#pin').modal('show');

document.getElementById("input_link").value = window.location.href;

function copyURL() {
	let copyText = document.getElementById("input_link");
	copyText.select();
	document.execCommand("copy");
}

/**
 * Příkaz ze serverů k přidání uživatelů/uživatele do seznamu uživatelů
 */
connection.on("addUsersToList", function (user, disableRoleAssign) {
	let addedUsers = JSON.parse(user);
	for (let i = 0; i < addedUsers.length; i++) {
		let listOfUsers = document.getElementById("listOfUsers");
		let userEntry = document.createElement("li");
		userEntry.setAttribute("class", "list-group-item d-flex justify-content-between align-items-center");
		userEntry.setAttribute("userid", addedUsers[i].userId);
		userEntry.appendChild(document.createTextNode(addedUsers[i].username));
		listOfUsers.appendChild(userEntry);
		let userDiv = document.createElement("div");
		userDiv.setAttribute("class", "dropdown");
		userEntry.appendChild(userDiv);
		let dropdownButton = document.createElement("button");
		let dropdownButtonClasses = "btn btn-secondary dropdown-toggle";
		if (addedUsers[i].role == "Creator" || disableRoleAssign) {
			dropdownButtonClasses += " disabled";
		}
		dropdownButton.setAttribute("id", "dropdownMenuButton");
		dropdownButton.setAttribute("class", dropdownButtonClasses);
		dropdownButton.setAttribute("data-toggle", "dropdown");
		dropdownButton.setAttribute("aria-haspopup", "true");
		dropdownButton.setAttribute("aria-expanded", "false");
		dropdownButton.setAttribute("data-display", "static");
		dropdownButton.appendChild(document.createTextNode(addedUsers[i].role));
		userDiv.appendChild(dropdownButton);
		let dropdownMenu = document.createElement("div");
		dropdownMenu.setAttribute("class", "dropdown-menu");
		dropdownMenu.setAttribute("aria-labelledby", "dropdownMenuButton");
		userDiv.appendChild(dropdownMenu);
		let roles = ["Editor", "Reader"];
		for (let j = 0; j < roles.length; j++) {
			let roleDropdownItem = document.createElement("button");
			roleDropdownItem.setAttribute("class", "dropdown-item userRole");
			roleDropdownItem.appendChild(document.createTextNode(roles[j]));
			dropdownMenu.appendChild(roleDropdownItem);
		}
		$(".userRole").on("click", function () {
			let changedRole = $(this).text();
			let userId = $(this).parents().eq(2).attr("userid");
			$(this).parent().prev().text(changedRole);
			connection.invoke("ChangeUserRole", userId, changedRole, groupName).catch(function (err) {
				return console.error(err.toString());
			});
		});
	}
});

/**
 * Příkaz ze serveru ke změně role uživatele
 */
connection.on("changeUserRole", function (role) {
	let objects = canvas.getObjects();
	if (role == "Reader") {
		readMode = true;
		fabric.Object.prototype.selectable = false;
		for (let i = 0; i < objects.length; i++) {
			objects[i].selectable = false;
		}
		$("#select_button").attr('disabled', true);
		$("#draw_button").attr('disabled', true);
		$("#straight_line_button").attr('disabled', true);
		$("#text_button").attr('disabled', true);
		$("#global-color-picker").spectrum({
			disabled: true
		});
		$("#fileUpload_button").attr('disabled', true);
		$("#clear_button").attr('disabled', true);
		$("#share_button").attr('disabled', true);
	}
	else {
		readMode = false;
		fabric.Object.prototype.selectable = true;
		for (let i = 0; i < objects.length; i++) {
			objects[i].selectable = true;
		}
		$("#select_button").attr('disabled', false);
		$("#draw_button").attr('disabled', false);
		$("#straight_line_button").attr('disabled', false);
		$("#text_button").attr('disabled', false);
		$("#global-color-picker").spectrum({
			disabled: false
		});
		$("#fileUpload_button").attr('disabled', false);
		$("#clear_button").attr('disabled', false);
		$("#share_button").attr('disabled', false);
	}
});

/**
 * Změní hodnote role uživatele v seznamu uživatelů
 */
connection.on("changeUserRoleInList", function (userId, userRole) {
	$('li[userid="' + userId + '"]').children('div').children('button').contents()[0].nodeValue = userRole;
});

/**
 * Příkaz ze serveru k odstranění uživatele ze seznamu uživatelů
 */
connection.on("removeUserFromList", function (userId) {
	$('li[userid="' + userId + '"]').remove();
});

/**
 * Příkaz ze serveru ke změně přezdívky uživatele
 */
connection.on("changeUsername", function (userName, userId) {
	$('li[userid="' + userId + '"]').contents()[0].data = userName;
});

/**
 * Příkaz ze serveru k vyčíštění canvasu všech uživatelů
 */
connection.on("clearCanvas", function () {
	canvas.clear();
});

/**
 * Příkaz ze serveru ke změně názvu tabule
 */
connection.on("changeBoardname", function (changedBoardName) {
	$("#boardName").val(changedBoardName);
});

/**
 * Příkaz ze serveru ke zamezení změny názvu tabule
 */
connection.on("disableBoardNameChange", function () {
	$("#boardName").attr('disabled', true);
});

/**
 * Příkaz ze serveru k načtení canvasu z JSONu
 */
connection.on("loadCanvas", function (jsonCanvas) {
	canvas.loadFromJSON(jsonCanvas);
});

/**
 * Příkaz ze serveru k přidání objektu do canvasu všech uživatelů
 */
connection.on("addObjects", function (jsonObjects) {
	let addedObjects = JSON.parse(jsonObjects);
	for (let i = 0; i < addedObjects.length; i++) {
		fabric.util.enlivenObjects([addedObjects[i]], function (enlivenedObjects) {
			canvas.add(enlivenedObjects[0]);
		});
	}
	canvas.requestRenderAll();
});

/**
 * Příkaz ze serveru k vyčíštění označených objektů canvasu všech uživatelů
 */
connection.on("deleteObjects", function (objectsId) {
	let removedObjects = JSON.parse(objectsId);
	let objects = canvas.getObjects();
	for (let i = objects.length - 1; i > -1; i--) {
		if (removedObjects.includes(objects[i].id)) {
			canvas.remove(objects[i]);
		}
	}
});

/**
 * Přikaz ze serveru k překreslení modifikovaných objektů
 */
connection.on("modifyObjects", function (jsonData) {
	let modifiedObjects = JSON.parse(jsonData);
	for (objectId in modifiedObjects) {
		let canvasObj = canvas.getObjects().find(obj => { return obj.id === objectId });
		for (objectProperty in modifiedObjects[objectId]) {
			canvasObj.set(objectProperty, modifiedObjects[objectId][objectProperty]);
		}
		canvasObj.setCoords();
	}
	canvas.requestRenderAll();
});

/**
 * Příkaz ze serveru k vložení obrázku z URL
 */
connection.on("importImage", function (imageAddress, guid) {
	fabric.Image.fromURL(imageAddress, function (myImg) {
		myImg.id = guid;
		canvas.add(myImg);
	});
});

/**
 * Příkaz se serveru k přesunutí objektů do horní nebo spodní vrstvy canvasu
 */
connection.on("moveObjectsStack", function (objectsId, frontOrBack) {
	let selectedObjects = JSON.parse(objectsId);
	let objects = canvas.getObjects();
	if (frontOrBack == "front") {
		for (let i = 0; i < objects.length; i++) {
			if (selectedObjects.includes(objects[i].id)) {
				objects[i].bringToFront();
			}
		}
	}
	else {
		for (let i = 0; i < objects.length; i++) {
			if (selectedObjects.includes(objects[i].id)) {
				objects[i].sendToBack();
			}
		}
	}
});

/**
 * Příkaz se serveru ke vložení vygenerovaného html kódu na stránku
 */
connection.on("appendHtmlCode", function (actionType, objectType) {
	actionHistoryAppend(actionType, objectType, false);
});

/**
 * Požadavek na server k vyčíštění canvasu všech uživatelů
 */
function tellServerToClear() {
	let undoEntry = { action: "canvasCleared", canvas: JSON.stringify(canvas.toDatalessJSON(['id'])) };
	undoStack.push(undoEntry);
	canvas.clear();
	connection.invoke("ClearCanvas", groupName).catch(function (err) {
		return console.error(err.toString());
	});
}

/**
 * Event - vytvoření čáry
 */
canvas.on({ "path:created": pathCreated });

/**
 * Odešle vytvořenou čáru na server
 * @param {any} e
 */
function pathCreated(e) {
	let objWithId = e.path ? e.path : e;
	objWithId.id = generateGUID();
	let undoEntry = { action: "added", objects: [{ id: objWithId.id }] };
	undoStack.push(undoEntry);
	connection.invoke("AddObjects", JSON.stringify([objWithId.toJSON(["id"])]), groupName).catch(function (err) {
		return console.error(err.toString());
	});
	actionHistoryAppend("inserted", objWithId.get("type"));
}

/**
 * Event - Změna vkládaného textu
 */
canvas.on("text:changed", function (e) {
	if (e.target.id == null) {
		e.target.id = generateGUID();
		objWithId = e.target.toJSON(["id"]);
		connection.invoke("AddObjects", JSON.stringify([objWithId]), groupName).catch(function (err) {
			return console.error(err.toString());
		});
	}
	else {
		let updatedTextObj = canvas.getObjects().find(obj => { return obj.id === e.target.id });
		let jsonData = {
			[updatedTextObj.id]: { "text": updatedTextObj.text }
		};
		connection.invoke("ModifyObjects", JSON.stringify(jsonData), groupName).catch(function (err) {
			return console.error(err.toString());
		});
	}
});

/**
 * Registrace eventu vytvoření, otočení a změny velikosti objektu k metodě
 */
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
	let groupUndoEntries = [];
	let undoEntry;
	if (e.target._objects) {
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
				"scaleY": fabric.util.qrDecompose(matrix).scaleY
			};
			let lastPos = e.target._objects[i].coordsHistory.pop();
			undoEntry = {
				id: e.target._objects[i].id,
				properties: [
					{ top: lastPos.top },
					{ left: lastPos.left },
					{ angle: lastPos.angle },
					{ scaleX: lastPos.scaleX },
					{ scaleY: lastPos.scaleY }
				]
			};
			groupUndoEntries.push(undoEntry);
		}
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
		undoEntry = {
			id: e.target.id,
			properties: [
				{ top: lastPos.top },
				{ left: lastPos.left },
				{ angle: lastPos.angle },
				{ scaleX: lastPos.scaleX },
				{ scaleY: lastPos.scaleY }
			]
		};
		groupUndoEntries.push(undoEntry);
	}
	undoStack.push({ action: "propertiesChanged", objects: groupUndoEntries });
	connection.invoke("ModifyObjects", JSON.stringify(jsonData), groupName).catch(function (err) {
		return console.error(err.toString());
	});
	actionHistoryAppend(e.transform.action, e.target._objects ? "group" : e.target.get("type"));
}

/**
 * Odstraní označené objekty
 */
function deleteActiveObjects() {
	let activeObjects = canvas.getActiveObjects();
	let objectsId = [];
	let removalId = generateGUID();
	activeObjects.forEach(element => objectsId.push(element.id));
	if (activeObjects.length > 0) {
		let groupUndoEntries = [];
		canvas.discardActiveObject();
		for (let i = 0; i < activeObjects.length; i++) {
			groupUndoEntries.push(JSON.stringify(activeObjects[i].toJSON(["id"])));
			canvas.remove(activeObjects[i]);
		}
		undoStack.push({ action: "removed", objects: groupUndoEntries});
		connection.invoke("DeleteObjects", JSON.stringify(objectsId), groupName).catch(function (err) {
			return console.error(err.toString());
		});
	}
	actionHistoryAppend("removed", activeObjects.length > 1 ? "group" : activeObjects[0].get("type"), true, objectsId);
}

/**
 * Uloži aktuální pozici označených objektů při kliknutí
 */
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


/**
 * Event - vložení objektu
 */
canvas.on("object:added", function (e) {
	let objectType = e.target.get("type");
	e.target.coordsHistory = [];
	if (objectType == "i-text") {
		e.target.textHistory = [];
	}
});

/**
 * Registrace eventů - vytvoření, modifikování a odznačení výběru objektů
 */
canvas.on({
	"selection:created": selectionCreated,
	"selection:updated": selectionCreated,
	"selection:cleared": selectionCleared,
	"mouse:down": mouseDown,
	"mouse:up": mouseUp
});

function selectionCreated(e) {
	let selectedObjects = e.selected;
	if (selectedObjects.length == 1) {
		updateColorpickerValue(selectedObjects[0]);
	}
}

function selectionUpdated(e) {
	let selectedObjects = e.selected;
	if (selectedObjects.length == 1) {
		updateColorpickerValue(selectedObjects[0]);
	}
}

function selectionCleared(e) {
	removeEmptyTextObject(e);
	let objectMenu = document.getElementById("object-menu");
	objectMenu.style.visibility = "hidden";
}

function mouseDown(e) {
	let activeObjects = canvas.getActiveObjects();
	if (activeObjects.length == 1) {
		let objectMenu = document.getElementById("object-menu");
		objectMenu.style.visibility = "hidden";
	}
}

function mouseUp(e) {
	let activeObjects = canvas.getActiveObjects();
	if (activeObjects.length == 1) {
		if ((activeObjects[0].get("type") == "i-text" &&
			activeObjects[0].text == "") ||
			activeObjects[0].get("type") == "image") {
			return;
		}
		if (activeObjects[0].get("type") == "i-text") {
			document.getElementById("object-font-picker-container").style.display = "inline-block";
			$('#object-font-picker').trigger('setFont', activeObjects[0].fontFamily);
			$("#object-size").val(activeObjects[0].fontSize / 4);
		}
		else if (activeObjects[0].get("type") == "path" ||
			activeObjects[0].get("type") == "line") {
			document.getElementById("object-font-picker-container").style.display = "none";
			$("#object-size").val(activeObjects[0].strokeWidth);
		}
		setObjectMenuPosition(activeObjects[0].oCoords);
	}
}

function setObjectMenuPosition(oCoords) {
	let maxYValue = 0;
	for (const property in oCoords) {
		if (oCoords[property].y > maxYValue) maxYValue = oCoords[property].y
	}
	let xPos = (oCoords.ml.x + oCoords.mr.x) / 2;
	let objectMenu = document.getElementById("object-menu");
	let objectMenuCoords = objectMenu.getBoundingClientRect();
	objectMenu.style.visibility = "visible";
	objectMenu.style.top = (maxYValue + 64) + "px";
	objectMenu.style.left = (xPos - objectMenuCoords.width / 2) + "px";
}


function updateColorpickerValue(selectedObj) {
	let color;
	if (selectedObj.get("type") == "path" ||
		selectedObj.get("type") == "line") {
		color = selectedObj.stroke;
	}
	else {
		color = selectedObj.fill;
	}
	$("#global-color-picker").spectrum("set", color);
	canvas.freeDrawingBrush.color = color;
}

function removeEmptyTextObject(e) {
	let selectedObjects = e.deselected;
	if (selectedObjects[0].text == "") {
		canvas.remove(selectedObjects[0]);
	}
}

/**
 * Operace undo
 */
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
			case "propertiesChanged":
				undoRedoPropertiesChanged("undo", undoEntry.objects);
				break;
			case "canvasCleared":
				undoRedoCanvasClear("undo", undoEntry.canvas);
				break;
		}
		canvas.requestRenderAll();
	}
}

/**
 * Operace redo
 */
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
			case "propertiesChanged":
				undoRedoPropertiesChanged("redo", redoEntry.objects);
				break;
			case "canvasCleared":
				undoRedoCanvasClear("redo");
				break;
		}
		canvas.requestRenderAll();
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
	connection.invoke("DeleteObjects", JSON.stringify(objectsId), groupName).catch(function (err) {
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
		jsonObjects.push(canvasObj.toJSON(["id"]));
	}
		if (undoOrRedo == "undo") {
			redoStack.push({ action: "added", objects: groupEntries });
		}
		else {
			undoStack.push({ action: "added", objects: groupEntries });
		}
	connection.invoke("AddObjects", JSON.stringify(jsonObjects), groupName).catch(function (err) {
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
		groupEntries.push({
			id: canvasObj.id,
			top: canvasObj.top,
			left: canvasObj.left,
			angle: canvasObj.angle,
			scaleX: canvasObj.scaleX,
			scaleY: canvasObj.scaleY
		});
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
 * Provede undo/redo změny vlastností objektů 
 * @param {any} undoOrRedo
 * @param {any} stackObject
 */
function undoRedoPropertiesChanged(undoOrRedo, stackObjects) {
	let groupEntries = [];
	let jsonData = {};
	for (let i = 0; i < stackObjects.length; i++) {
		let modifiedProperties = [];
		let canvasObj = canvas.getObjects().find(obj => { return obj.id === stackObjects[i].id });
		for (let j = 0; j < stackObjects[i].properties.length; j++) {
			let propertyType = Object.keys(stackObjects[i].properties[j])[0];
			modifiedProperties.push({ [propertyType]: canvasObj[propertyType] });
			canvasObj.set(propertyType, stackObjects[i].properties[j][propertyType]);
			jsonData[canvasObj.id] = {
			[propertyType]: canvasObj[propertyType]
			};
		}
		groupEntries.push({
			id: canvasObj.id,
			properties: modifiedProperties
		});
	}
	if (undoOrRedo == "undo") {
		redoStack.push({ action: "propertiesChanged", objects: groupEntries });
	}
	else {
		undoStack.push({ action: "propertiesChanged", objects: groupEntries });
	}
	connection.invoke("ModifyObjects", JSON.stringify(jsonData), groupName).catch(function (err) {
		return console.error(err.toString());
	});
}

/**
 * Provede undo/redo odstranění canvasu
 * @param {any} undoOrRedo
 * @param {any} jsonCanvas
 */
function undoRedoCanvasClear(undoOrRedo, jsonCanvas) {
	if (undoOrRedo == "undo") {
		canvas.loadFromJSON(jsonCanvas);
		redoStack.push({ action: "canvasCleared" });
		connection.invoke("LoadCanvas", jsonCanvas, groupName).catch(function (err) {
			return console.error(err.toString());
		});
	}
	else {
		let undoEntry = { action: "canvasCleared", canvas: JSON.stringify(canvas.toDatalessJSON(['id'])) };
		undoStack.push(undoEntry);
		canvas.clear();
		connection.invoke("ClearCanvas", groupName).catch(function (err) {
			return console.error(err.toString());
		});
	}
}

/**
 * Vybere všechny objekty
 */
function selectAllObjects() {
	canvas.discardActiveObject();
	let selection = new fabric.ActiveSelection(canvas.getObjects(), {
		canvas: canvas,
	});
	canvas.setActiveObject(selection);
	canvas.requestRenderAll();
}

/**
 * Zkopíruje vybrané objekty
 */
function copyObjects() {
	if (canvas.getActiveObject()) {
		canvas.getActiveObject().clone(function (cloned) {
			clonedObjects = cloned;
		},
			["id"]);
	}
}

/**
 * Vloží zkopírované objekty do canvasu
 * */
function pasteObjects() {
	let jsonObjects = [];
	let groupEntries = [];
	let undoEntry;
	canvas.discardActiveObject();
	clonedObjects.set({
		left: clonedObjects.left + 50,
		top: clonedObjects.top + 50,
		evented: true,
	});
	if (clonedObjects.type === "activeSelection") {
		clonedObjects.canvas = canvas;
		clonedObjects.forEachObject(function (obj) {
			let originalObject = canvas.getObjects().find(canvasObj => { return canvasObj.id === obj.id });
			let tempLeft = obj.left;
			let tempTop = obj.top;
			canvas.add(obj);
			obj.id = generateGUID();
			undoEntry = { id: obj.id };
			groupEntries.push(undoEntry);
			obj.set({
				left: originalObject.left + 50,
				top: originalObject.top + 50
			});
			jsonObjects.push(obj.toJSON(["id"]));
			obj.set({
				left: tempLeft,
				top: tempTop
			});
		});
		clonedObjects.setCoords();
	} else {
		canvas.add(clonedObjects);
		clonedObjects.id = generateGUID();
		undoEntry = { id: clonedObjects.id };
		groupEntries.push(undoEntry);
		jsonObjects.push(clonedObjects.toJSON(["id"]));
	}
	undoStack.push({ action: "added", objects: groupEntries });
	let json = JSON.stringify(jsonObjects)
	connection.invoke("AddObjects", json, groupName).catch(function (err) {
		return console.error(err.toString());
	});
	canvas.setActiveObject(clonedObjects);
	canvas.requestRenderAll();
	clonedObjects.clone(function (cloned) {
		clonedObjects = cloned;
	},
		["id"]);
}

/**
 * Provede akci v závislosti na stisknutých tlačítkách
 */
$("html").keyup(function (e) {
	//DELETE
	if (e.keyCode == 46) {
		deleteActiveObjects();
	}
	//CTRL + Z
	else if (e.keyCode == 90 && e.ctrlKey) {
		undo();
	}
	//CTRL + Y
	else if (e.keyCode == 89 && e.ctrlKey) {
		redo();
	}
	//CTRL + A
	else if ((e.keyCode == 65) && e.ctrlKey) {
		selectAllObjects();
	}
	//CTRL + C
	else if ((e.keyCode == 67) && e.ctrlKey) {
		copyObjects();
	}
	//CTRL + V
	else if ((e.keyCode == 86) && e.ctrlKey) {
		pasteObjects();
	}
});

/**
 * Vloží provedenou akci do historii akcí 
 */
function actionHistoryAppend(actionType, objectType, sendMessage = true, objectsId = "") {
	let date = new Date();
	let actionsGrid = document.getElementById("grid-container");
	let row = document.createElement("div");
	row.setAttribute("class", "action-row");
	let time = document.createElement("p");
	time.setAttribute("class", "mb-0");
	time.appendChild(document.createTextNode(date.toLocaleTimeString()));
	row.appendChild(time);
	let actionMessage = document.createElement("div");
	actionMessage.setAttribute("class", "action-history-row");
	row.appendChild(actionMessage);
	let divider = document.createElement("hr");
	divider.setAttribute("class", "row-divider");
	objectType = objectType == "i-text" ? "text" : objectType;
	actionType = getModificationPastTense(actionType);
	actionMessage.appendChild(document.createTextNode(`${objectType} ${actionType} by ${$("#username").val()}`));
	if (actionType == "removed" && sendMessage) {
		let restoreButton = document.createElement("button");
		restoreButton.setAttribute("type", "button");
		restoreButton.setAttribute("class", "btn btn-link action-history-restore");
		restoreButton.setAttribute("objectsId", JSON.stringify(objectsId));
		restoreButton.setAttribute("onclick", "restoreDeletedObject(this)");
		restoreButton.appendChild(document.createTextNode("Restore"));
		row.appendChild(restoreButton);
	}
	actionsGrid.appendChild(row);
	actionsGrid.appendChild(divider);
	if (sendMessage) {
		connection.invoke("AppendHtmlCode", actionType, objectType, groupName).catch(function (err) {
			return console.error(err.toString());
		});
    }
}

/**
 * Přeloží typ modifikace do minulého času 
 */
function getModificationPastTense(modificationType) {
	if (modificationType == "rotate") {
		return modificationType + "d";
	}
	else if (modificationType == "drag") {
		return modificationType + "ged";
	}
	else if (modificationType.includes("scale")) {
		return "scaled";
	}
	else {
		return modificationType;
    }
}

/**
 * Provede potřebné akce k obnovení odstraněného objektu
 */
function restoreDeletedObject(button) {
	let clickedButton = button;
	let row = clickedButton.parentElement;
	let restored = document.createElement("p");
	restored.setAttribute("class", "text-success action-history-restore");
	restored.appendChild(document.createTextNode("Restored"));
	row.replaceChild(restored, clickedButton);
	restoreAction(JSON.parse(clickedButton.getAttribute("objectsId")));
}

/**
 * Nalezne akci odstranění v undo zásobníku a navrátí ji
 */
function restoreAction(ids) {
	let addedObjEntries = findAddedObjectEntries(ids);
	let removedObjEntry = findRemovedObjectsEntry(ids);
	for (let addedObjEntry of addedObjEntries) {
		undoStack.push(addedObjEntry);
    }	
	let jsonObjects = [];
	for (let i = 0; i < removedObjEntry.objects.length; i++) {
		fabric.util.enlivenObjects([JSON.parse(removedObjEntry.objects[i])], function (enlivenedObjects) {
			canvas.add(enlivenedObjects[0].setCoords());
			canvasObj = enlivenedObjects[0];
		});
		jsonObjects.push(canvasObj.toJSON(["id"]));
	}
	connection.invoke("AddObjects", JSON.stringify(jsonObjects), groupName).catch(function (err) {
		return console.error(err.toString());
	});
}

/**
 * Z undo zásobníku nalezne záznamy přidaných objektů
 */
function findAddedObjectEntries(ids) {
	let addedObjects = [];
	for (let undoEntry of undoStack.filter(obj => obj.action == "added")) {
		for (let addedObj of undoEntry.objects) {
			if (ids.includes(addedObj.id)) {
				addedObjects.push(undoEntry);
            }
		}
	}
	return addedObjects;
}

/**
 * Z undo zásobníku nalezne záznamy odstraněných objektů
 */
function findRemovedObjectsEntry(ids) {
	for (let undoEntry of undoStack.filter(obj => obj.action == "removed")) {
		for (let removedObj of undoEntry.objects) {
			if (ids.includes(JSON.parse(removedObj).id)) {
				return undoEntry;
			}
		}
	}
}