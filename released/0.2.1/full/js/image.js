/* This document handles the image insertion. */

/* 
* Variables (in alphabetical order). 
	* HTML shortcuts.
	* Functions variables.
*/

/* HTML shortcuts. */
var altInput; // The input for the alternative text.
var cancelImageButton; // The "Cancel" button.
var galleriesButton; // The "Galleries" button.
var imageButton; // The "Image" button.
var imageBox; // The clickable zone of the image insertion tool.
var imageBrowser; // The button to choose an image.
var imageDisplayer; // The div that displays or not the image insertion tool.
var imageDiv; // The div with id="mado-image".
var titleInput; // The input for the title of the image

/* Functions variables. 
* startSelect, endSelect, newStarSelect, newEndSelect are created in link.js.
*/

var currentGallery; // Used when the code is searching an image to know where it is.
var galleriesList = []; // List who contains the galleries.
var image; // The content who is added.
var imageLoaded; // The path of the image selected.
var imagePath; // The path of the image.
var imagePosition = 0; // Used to don't keep on the same part of the document.
var imagesArray = new Array(); // All the images on the file.
var imgFormats = ["png", "bmp", "jpeg", "jpg", "gif", "png", "svg", "xbm", "webp"]; // Authorized images.
var rightFile; // If false the JS is looking for an image.

/*
* Functions (in alphabetical order).
*
* Resume:
	* applyImage (): what to do when the user press enter after choosing an image.
	* cancelImage (): what to do if the user press elsewhere the image container when he was adding an image.
	* chooseGalleries (): open a pop-up to let the user chooses his galleries.
	* chromeUpdate (newGalleries): set the galleries to be used in getImages().
	* displayImages (): find the images on the document and display the correct corresponding data.
	* fileNotFound (): what to do if Mado doesn't find the image.
	* galleryAnalysis (theGallery): open a gallery and launch the search.
	* getImage (theCorrectImage): what to do when the image is find on the user's PC.
	* getImages (): search the image in the gallery.
	* loadImage (): let the user choose an image when he clicks on the button.
	* modifyImage (): enables the realtime modification of an image.
	* update (): update the list of folders and analyse the files in folders.
	* setBrowserText (imagePath): set the text in the button with the image's path.
	* setImageInputs (): recognizes when the selected text is an image and set the inputs in consequence.
*/

function applyImage () {
	if (altInput.value == "") { // An alternative input is obligatory
		altInput.setAttribute("class", "flash");
		altInput.focus();
		altInput.removeAttribute("class");
	}
	else if (imageLoaded != undefined){ // An image is obligatory
		modifyImage();	
		imageDisplayer.className = "tool-displayer hidden";
		selectElementContents(imageDiv);
		restoreSelection("mado-image");
	}
}

function cancelImage () {
	if (imageDiv != undefined)
		imageDiv.innerText = initialText;		
	imageDisplayer.className = "tool-displayer hidden";
	selectElementContents(imageDiv);
	restoreSelection("mado-image");
	conversion();
}

function chooseGalleries () {
	chrome.mediaGalleries.getMediaFileSystems({ interactive : 'yes' }, update); // Let the user chooses his folders.
}

function chromeUpdate (results) { 
	galleriesList = results; 
	galleryAnalysis(0);
}

function displayImages () {
	if (tempConversion.indexOf("<img src=\"", imagePosition) != -1) {
		imagePosition = tempConversion.indexOf("<img src=\"", imagePosition) + 10;
		rightFile = false;
		imagePath = tempConversion.substring(imagePosition, tempConversion.indexOf("\"", imagePosition));

		if(imagePath.substring(0, 4) != "data") { // The path is not already translated (if the same image is in the file twice).
			if (imagesArray.length > 0){ // Files are already stored.
				for (var i = 0; i < imagesArray.length; i++) { // Search if the image is in the array.
					if(imagesArray[i][0] == imagePath) { // The file is already here.
						tempConversion = tempConversion.replace(new RegExp(imagePath, "g"), imagesArray[i][1]); // Replace the path.		
		    			imagesArray[i][2] = true; // The file has been used.
		    			if (tempConversion.indexOf("<img src=\"", imagePosition) != -1) {
		    				displayImages();
		    				break;
		    			}
		    			else
	                     	endOfConversion();
		        	}
		        	else if (i == imagesArray.length - 1) // The file isn't here.   	
		    			update(); // Get the ID of the file.
				}       			
			}
			else // The array doesn't exist yet.
				update(); // Get the ID of the file.   	
		}
		else
			displayImages();
	}
	else
		endOfConversion();
}

function fileNotFound () {
	tempConversion = tempConversion.replace(new RegExp(imagePath, "g"), "img/nofile.png"); 
	if (tempConversion.indexOf("<img src=\"", imagePosition) != -1) 
 		displayImages();
 	else // The end.
 		endOfConversion();
}

function galleryAnalysis (index) {
	if (rightFile == false) {
		if (index < galleriesList.length) {
			currentGallery = index;
			galleriesList.forEach(
				function(item, indx, arr) { // For each gallery.
		     		if (indx == index && imagePath != undefined && rightFile == false) {// If we're looking for a file.  
		     			item.root.createReader().readEntries(getImages); // Get the images of the folder.
		     		}
		  		}
			)
		}
		else
			fileNotFound();
	}
	else {
		imagesArray.length = 0;
		modifyImage();
	}
}

function getImage (entryPath) {
	galleriesList[currentGallery].root.getFile(entryPath, {create: false}, function(fileEntry) { // Time to get the ID of the file.
		fileEntry.file(function(theFile) {
			var reader = new FileReader();
          	reader.onloadend = function(e) { // We have the file (.result).
          		imagesArray.push([imagePath, this.result, true]); // Add a new line.
             	tempConversion = tempConversion.replace(new RegExp(imagePath, "g"), this.result);  
             	rightFile = true;
             	if (tempConversion.indexOf("<img src=\"", imagePosition) != -1) 
             		displayImages();
             	else // The end.
             		endOfConversion();       	
          	};
          	reader.readAsDataURL(theFile);                 	
		});
	}); 	
}

function getImages (entries) {
	for (var i = 0; i < entries.length && rightFile == false; i++) { // All the files in the repository, the correct file is not found yet.
		if (entries[i].isDirectory && imagePath.indexOf(entries[i].fullPath) != -1) {// If the file is a directory and the right directory.
			entries[i].createReader().readEntries(getImages); // Recursivity.
			break;
		}
		else if (imagePath.indexOf(entries[i].fullPath) != -1) {// It's the correct image!
			getImage(entries[i].fullPath);
			break; 			
		}
		else if (i == (entries.length - 1)) // End of the gallery.
			galleryAnalysis(currentGallery + 1);
	}
}

function loadImage () {	
    chrome.fileSystem.chooseEntry(
		{
	 		type: "openFile",
	 		accepts:[{ mimeTypes: ["image/*"] }] 
		}, 
		function(loadedImage) {
			if (loadedImage) {			    
				chrome.fileSystem.getDisplayPath(loadedImage, function(path) {
					setImageBrowserText(fileName(path.replace(/\\/g, "/")));				
					imageLoaded = path.replace(/\\/g, "/");
					modifyImage();
					altInput.focus();
				});
			}
		}
	);
}

function modifyImage () {
	if (titleInput.value == "")
		image = "![" + altInput.value + "](" + imageLoaded + ')';
	else 
		image = "![" + altInput.value + "](" + imageLoaded + " \"" + titleInput.value + "\")";
	if (imageDiv != undefined)
		imageDiv.innerText = image;		
	else
		$(markdown).innerText = $(markdown).innerText + image;		
	conversion();
}

function setImageBrowserText (path) {
	imageBrowser.innerHTML = path;
	if (imageBrowser.innerHTML.length > 15) // Too long to be beautiful.
		imageBrowser.innerHTML = imageBrowser.innerHTML.substring(0, 6) + "(…)" + imageBrowser.innerHTML.substring(imageBrowser.innerHTML.length - 6, imageBrowser.innerHTML.length);
}

function setImageInputs () {
	initialText = imageDiv.innerText;
	if (/!\[.*\]\(.*\)/.test(imageDiv.innerText)) { // An image
		if (/!\[.*\]\(.*\s".*"\)/.test(imageDiv.innerText)) {// Optional title is here.
			titleInput.value = imageDiv.innerText.match(/".*"\)/)[0].substring(1, imageDiv.innerText.match(/".*"\)/)[0].length - 2); 
			imageLoaded = imageDiv.innerText.match(/.*\s"/)[0].substring(2, imageDiv.innerText.match(/.*\s"/)[0].length - 2).replace(/\\/g, "/");
			setImageBrowserText(fileName(imageLoaded));
		}
		else {
			imageLoaded = imageDiv.innerText.match(/\]\(\S+\)/)[0].substring(2, imageDiv.innerText.match(/\]\(\S+\)/)[0].length - 1).replace(/\\/g, "/");
			setImageBrowserText(fileName(imageLoaded));
		}
		altInput.value = imageDiv.innerText.match(/!\[.+\]/)[0].substring(2, imageDiv.innerText.match(/!\[.+\]/)[0].length - 1); 
	}
	
}

function update () {	
	chrome.mediaGalleries.getMediaFileSystems({ interactive : "no" }, chromeUpdate);
}