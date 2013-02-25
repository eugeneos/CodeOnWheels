/*
 * Simple PopUp widget for GM In-Vehicle Apps: codeonwheels.widgets.SimplePopUp
 * Copyright (c) 2013, Eugene Osovetsky
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons
 * to whom the Software is furnished to do so, subject to the following conditions:
 * 
 *  The above copyright notice and this permission notice shall be included in all copies or
 *  substantial portions of the Software.
 *  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 *  INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 *  PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
 *  FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 *  OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 *  DEALINGS IN THE SOFTWARE.
 */

/* The SimplePopUp is a singleton object. The idea is to make it as simple to use as a
 * JavaScript alert(). See instructions below:
 * 
 * 1) Here's how you create a popup with a title, text, a button and a callback function:
 * codeonwheels.widgets.SimplePopUp.show("Error","Cannot drive to the moon","Ok",function(){
 *    console.log("Ok was clicked")
 * });
 * 
 * 2) Before you do that, however, you need to include the matching CSS file in your HTML HEAD:
 * <link rel="stylesheet" href="codeonwheels.widgets.SimplePopUp.css" type="text/css"/> 
 * 
 * 3) You also probably want to hook up the BACK button correctly before showing any popups:
 * gm.info.watchButtons(codeonwheels.widgets.SimplePopUp.back, function(){},["BACK_SWITCH"]);
 * codeonwheels.widgets.SimplePopUp.onBackIfNoPopUp = function(){};
 * //Point this at your real back button handler, SimplePopUp will pass the call through
 * //if there's no popup visible at the moment
 * 
 * Additional notes:
 * 
 * Both the popup title and popup text are passed in as HTML. Button text is just text.
 * 
 * Popup is automatically hidden when the user taps the button.
 * 
 * .show() will return true if popup can be shown, or false if one can't be shown because
 * there is already a popup visible.
 * 
 * You may also use the following properties before creating popups:
 * .backTriggersCallback: false by default - determines whether the back button triggers the callback
 * .backDismissesPopup: true by default - determines whether the back button dismisses the popup
 * .buttonHeight - passed to gm.widgets.Button
 * .buttonWidth - passed to gm.widgets.Button
 * .hide() - forces the popup to be hidden
 * 
 */

var codeonwheels = (codeonwheels === undefined) ? {} : codeonwheels;
if (codeonwheels.widgets === undefined) {codeonwheels.widgets = {};}

codeonwheels.widgets.SimplePopUp =
{
	isInitialized: false,
	isVisible: false,
	callback: null,
	button: null,
	
	//Defaults - these can all be changed
	backTriggersCallback: false,
	backDismissesPopup: true,
	buttonHeight: 90,
	buttonWidth: 200,
	onBackIfNoPopUp: null, //Callback: back button pressed but no popup visible
	
	show: function(titleHTML, detailsHTML, buttonText, callback)
	{
		"use strict";
		var buttonElem, self = codeonwheels.widgets.SimplePopUp;
		
		if (!self.isInitialized) 
		{
			self.initialize();
		}
		
		//Can't show a popup over existing popup
		if (self.isVisible) {return false;}
		
		if (self.callback !== undefined)
		{
			self.callback = callback;
		}
		else
		{
			self.callback = null;
		}
		
		document.getElementById(self.prefix + "-Title").innerHTML = titleHTML;
		document.getElementById(self.prefix + "-Details").innerHTML = detailsHTML;
		buttonElem = document.getElementById(self.prefix + "-Button");
		self.button = new gm.widgets.Button({
			label:buttonText,
			width:self.buttonWidth,
			height:self.buttonHeight,
			callBack:function(){
				self.hide();
				callback();
			},
			parentElement:buttonElem});
		self.button.render();
		
		document.getElementById(self.prefix).style.display="block";
		self.isVisible = true;
		return true;
	},

	hide: function()
	{
		"use strict";
		var self = codeonwheels.widgets.SimplePopUp;
		
		if (!self.isVisible) {return;}

		self.button.destroy(); //Undocumented feature of gm.widgets.Button
		document.getElementById(self.prefix).style.display="none";
		self.isVisible = false;
	},
	
	back: function()
	{
		"use strict";
		var self = codeonwheels.widgets.SimplePopUp;
		
		if (self.isZombieProcess()) {return;}
		
		if (!self.isVisible)
		{
			if (self.onBackIfNoPopUp !== null)
			{
				self.onBackIfNoPopUp();
			}
		}
		else
		{
			if (self.backDismissesPopup)
			{
				self.hide();
			}
			if (self.backTriggersCallback)
			{
				if (self.callback !== null)
				{
					self.callback();
				}				
			}
		}
	},
	
	//Private implementation:
	
	prefix: "codeonwheels-widgets-SimplePopUp",
	prefixGeneric: "codeonwheels-widgets",
	
	initialize: function()
	{
		"use strict";
		var elem, elemTitle, elemDetails, elemCbo, elemCbm, elemButton, self;
		self = codeonwheels.widgets.SimplePopUp;
		
		elem = document.createElement("div");
		elem.setAttribute("id", self.prefix);
		elem.setAttribute("class", self.prefix);
		elem.setAttribute("style", "display:none;");
		
		elemTitle = document.createElement("div");
		elemTitle.setAttribute("id", self.prefix + "-Title");
		elemTitle.setAttribute("class", self.prefix + "-Title");
		elem.appendChild(elemTitle);
		
		elemDetails = document.createElement("div");
		elemDetails.setAttribute("id", self.prefix + "-Details");
		elemDetails.setAttribute("class", self.prefix + "-Details");
		elem.appendChild(elemDetails);
		
		elemCbo = document.createElement("div");
		elemCbo.setAttribute("class", self.prefixGeneric + "-cbo");
		
		elemCbm = document.createElement("div");
		elemCbm.setAttribute("class", self.prefixGeneric + "-cbm");
		
		elemButton = document.createElement("div");
		elemButton.setAttribute("id", self.prefix + "-Button");
		elemButton.setAttribute("class", self.prefix + "-Button"
				+ " " + self.prefixGeneric + "-cbi");
		
		elemCbm.appendChild(elemButton);
		elemCbo.appendChild(elemCbm);
		elem.appendChild(elemCbo);
		
		if (document.body.childNodes.length >= 1)
		{
			document.body.insertBefore(elem, document.body.childNodes[0]);
		}
		else
		{
			document.body.appendChild(elem);
		}
		
		self.isInitialized = true;
	},
	
	isZombieProcess: function()
	{
		"use strict";
		return (window === null);
	}
};
