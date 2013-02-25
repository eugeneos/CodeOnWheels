/*
 * Menu widget for GM In-Vehicle Apps: codeonwheels.widgets.Menu
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
 * 
 */

/* Usage:
 * 
 * //First, define a bunch of callbacks somewhere that will be called for
 * //the various menu options. Don't worry about understanding myCallback3 for now.
 * var myCallback1 = function(){console.log("Choice1 selected");};
 * var myCallbackA = function(){console.log("SubChoiceA selected");};
 * var myCallbackB = function(){console.log("SubChoiceB selected");};
 * var myCallback3 = function(value){
 * 		console.log("Choice3 selected with value:" + value);
 * 		value = !value;
 * 		myMenu.setValue("ch3",value);
 * 		myMenu.setDisplay("ch3","Choice3: " + (value?"ON":"OFF"));
 * };
 * 
 * //Now comes the most important part: here you define your actual menu structure
 * //Notice at the top level there's an object with a "menu" property 
 * var menuData = {menu:[
 * 		{display:"Choice1", action:myCallback1},
 * 		{display:"Choice2", menu:[
 * 			{display:"SubChoiceA", action:myCallbackA},
 * 			{display:"SubChoiceB", action:myCallbackB}
 * 		]},
 * 		{display:"Choice3: ON", action:myCallback3, tag:"ch3", value:true}, 
 * 			//Tag is needed if you want to find and modify the menu choice later 
 * 			//Can specify any value, will be passed to the callback
 * 		//You may even combine "menu" and "action" in the same menu row
 * 	]};
 * 
 * //You may set options here (e.g. an icon to display)
 * //Same options supported as for ScrollingSelector, 
 * //except for "name", "data", "on..." callbacks, "alphasort" and "multiselect"
 * var options = {}; 
 * 
 * //Now, create the menu. It is not yet displayed at this point.
 * var myMenu = new codeonwheels.widgets.Menu(menuData,options);
 * 
 * //Back button handling: first, you need to hook up the back button event to Menu.goBack()
 * //IMPORTANT: You must bind the callback to myMenu, see syntax below!
 * gm.info.watchButtons(
 *     myMenu.goBack.bind(myMenu),
 *     function(){},["BACK_SWITCH"]);
 * 
 * //Then, use Menu.onBackButtonAtRoot to decide what happens if the back button is pressed
 * //at the root menu level (or when the menu is not displayed)
 * myMenu.onBackButtonAtRoot = function() {gm.system.releaseFocus();};
 * 
 * //Optionally, you can set myMenu.subMenuIndicator to "" to get rid of the arrows for sub-menus
 * 
 * //Now we're ready to show the menu on the screen!
 * myMenu.render("menuDiv"); //DIV with this id must exist and must be visible 
 * 
 * //You can use myMenu.scrollingSelector to get the underlying gm.widgets.ScrollingSelector
 * //Call myMenu.destroy() to destroy the menu
 * 
 */

var codeonwheels = (codeonwheels === undefined) ? {} : codeonwheels;
if (codeonwheels.widgets === undefined) {codeonwheels.widgets = {};}

codeonwheels.widgets.Menu = function(menuData, options)
{
	"use strict";
	this.options = options;
	this.scrollingSelector = null;
	
	this.options.onselect = this.onselect.bind(this);
	this.options.alphasort = false;
	this.options.multiselect = false;
	
	this.tags = {};
	this.rootMenu = this.prepareData(menuData, 0, null);
	
	this.currentLevel = this.rootMenu;
	this.pastLevels = [];
	this.isActive = false;
	
	this.onBackButtonAtRoot = null;
	this.subMenuIndicator = " \u21db"; //Space followed by a right arrow Unicode character
};

//When render is called, elementId must exist and must be visible
codeonwheels.widgets.Menu.prototype.render = function(elementId)
{
	"use strict";
	
	this.options.name = elementId;
	this.options.data = this.getDataForCurrentLevel();
	
	this.scrollingSelector = new gm.widgets.ScrollingSelector(this.options);
	this.scrollingSelector.render("#"+elementId);
	this.isActive = true;
};

codeonwheels.widgets.Menu.prototype.destroy = function()
{
	"use strict";
	this.isActive = false;
	this.scrollingSelector.destroy();
};

// Hook this up to your back button handler
// MUST be bound to the Menu instance!
codeonwheels.widgets.Menu.prototype.goBack = function()
{
	"use strict";
	
	//GM-specific "zombie process check"
	if (window === null) {return;}
	
	if ((!this.isActive) || (this.currentLevel === this.rootMenu))
	{
		if (this.onBackButtonAtRoot !== null)
		{
			this.onBackButtonAtRoot();
		}
	}
	else
	{
		this.currentLevel = this.pastLevels.pop();
		this.scrollingSelector.data = this.getDataForCurrentLevel();
		this.scrollingSelector.refresh();
	}
};

codeonwheels.widgets.Menu.prototype.setDisplay = function(tag, display)
{
	"use strict";
	if (this.tags[tag] !== undefined && this.tags[tag] !== null)
	{
		this.tags[tag].display = display;
		if (this.tags[tag].parent === this.currentLevel)
		{
			this.scrollingSelector.data = this.getDataForCurrentLevel();
			this.scrollingSelector.refresh();			
		}
	}
};

codeonwheels.widgets.Menu.prototype.setValue = function(tag, value)
{
	"use strict";
	if (this.tags[tag] !== undefined && this.tags[tag] !== null)
	{
		this.tags[tag].value = value;
	}
};

//Private implementation:

codeonwheels.widgets.Menu.prototype.prepareData = function(data, entryId, parent)
{
	"use strict";
	var idx, entry;
	
	entry = new codeonwheels.widgets.MenuEntry(
			data.display,
			data.action,
			data.tag,
			data.value,
			entryId,
			parent
		);
	
	if (data.menu !== undefined && data.menu !== null)
	{
		entry.menu =[];
		for (idx=0; idx<data.menu.length; idx++)
		{
			entry.menu.push(this.prepareData(data.menu[idx], idx, entry));
		}
	}
	
	if (data.tag !== undefined && data.tag !== null)
	{
		this.tags[data.tag] = entry;
	}

	return entry;
};

codeonwheels.widgets.Menu.prototype.onselect = function(args)
{
	"use strict";
	var entry;
	
	entry = args.data.value;
	
	if (entry.action !== undefined && entry.action !== null)
	{
		entry.action(entry.value);
	}
	
	if (entry.menu !== undefined && entry.menu !== null)
	{
		this.pastLevels.push(this.currentLevel);
		this.currentLevel = entry;
		this.scrollingSelector.data = this.getDataForCurrentLevel();
		this.scrollingSelector.refresh();
	}
	
	this.scrollingSelector.clearSelection();
};

codeonwheels.widgets.Menu.prototype.getDataForCurrentLevel = function()
{
	"use strict";
	var idx, data=[], disp;
	
	for (idx=0; idx<this.currentLevel.menu.length; idx++)
	{
		disp = this.currentLevel.menu[idx].display;
		if (this.currentLevel.menu[idx].menu !== null)
		{
			if (this.subMenuIndicator !== null)
			{
				disp = disp + this.subMenuIndicator;
			}
		}
		data.push({	display:disp,
					value:this.currentLevel.menu[idx]});
	}
	return data;
};

codeonwheels.widgets.MenuEntry = function(display, action, tag, value, id, parent)
{
	"use strict";
	this.display = display;
	this.action = action;
	this.tag = tag;
	this.value = value;
	this.id = id;
	this.menu = null;
	this.parent = parent;
};

codeonwheels.widgets.MenuEntry.prototype.toString = function() //Required for ScrollingSelector
{
	"use strict";
	return this.id;
};
