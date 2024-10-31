
"use strict";

(function attachShadowRoots(root) {
	root.querySelectorAll("template[shadowrootmode]").forEach(template => {
		const mode = template.getAttribute("shadowrootmode");
		const shadowRoot = template.parentNode.attachShadow({ mode });
	
		shadowRoot.appendChild(template.content);
		template.remove();
		attachShadowRoots(shadowRoot);
	});
})(document);

this.textFit = (function () {

	var defaultSettings = {
		alignVert: false, // if true, textFit will align vertically using css tables
		alignHoriz: false, // if true, textFit will set text-align: center
		multiLine: false, // if true, textFit will not set white-space: no-wrap
		detectMultiLine: true, // disable to turn off automatic multi-line sensing
		minFontSize: 6,
		maxFontSize: 80,
		reProcess: true, // if true, textFit will re-process already-fit nodes. Set to 'false' for better performance
		widthOnly: false, // if true, textFit will fit text to element width, regardless of text height
		alignVertWithFlexbox: false, // if true, textFit will use flexbox for vertical alignment
	};

	return function textFit(els, options) {

		if (!options) options = {};

		// Extend options.
		var settings = {};
		for(var key in defaultSettings){
			if(options.hasOwnProperty(key)){
				settings[key] = options[key];
			} else {
				settings[key] = defaultSettings[key];
			}
		}

		// Convert jQuery objects into arrays
		if (typeof els.toArray === "function") {
			els = els.toArray();
		}

		// Support passing a single el
		var elType = Object.prototype.toString.call(els);
		if (elType !== '[object Array]' && elType !== '[object NodeList]' &&
				elType !== '[object HTMLCollection]'){
		els = [els];
		}

		// Process each el we've passed.
		for(var i = 0; i < els.length; i++){
		processItem(els[i], settings);
		}
	};

	/**
	 * The meat. Given an el, make the text inside it fit its parent.
	 * @param  {DOMElement} el       Child el.
	 * @param  {Object} settings     Options for fit.
	 */
	function processItem(el, settings){
		if (!isElement(el) || (!settings.reProcess && el.getAttribute('textFitted'))) {
		return false;
		}

		// Set textFitted attribute so we know this was processed.
		if(!settings.reProcess){
		el.setAttribute('textFitted', 1);
		}

		var innerSpan, originalHeight, originalHTML, originalWidth;
		var low, mid, high;

		// Get element data.
		originalHTML = el.innerHTML;
		originalWidth = innerWidth(el);
		originalHeight = innerHeight(el);

		// Don't process if we can't find box dimensions
		if (!originalWidth || (!settings.widthOnly && !originalHeight)) {
		if(!settings.widthOnly)
			throw new Error('Set a static height and width on the target element ' + el.outerHTML +
			' before using textFit!');
		else
			throw new Error('Set a static width on the target element ' + el.outerHTML +
			' before using textFit!');
		}

		// Add textFitted span inside this container.
		if (originalHTML.indexOf('textFitted') === -1) {
		innerSpan = document.createElement('span');
		innerSpan.className = 'textFitted';
		// Inline block ensure it takes on the size of its contents, even if they are enclosed
		// in other tags like <p>
		innerSpan.style['display'] = 'inline-block';
		innerSpan.innerHTML = originalHTML;
		el.innerHTML = '';
		el.appendChild(innerSpan);
		} else {
		// Reprocessing.
		innerSpan = el.querySelector('span.textFitted');
		// Remove vertical align if we're reprocessing.
		if (hasClass(innerSpan, 'textFitAlignVert')) {
			innerSpan.className = innerSpan.className.replace('textFitAlignVert', '');
			innerSpan.style['height'] = '';
			el.className.replace('textFitAlignVertFlex', '');
		}
		}

		// Prepare & set alignment
		if (settings.alignHoriz) {
		el.style['text-align'] = 'center';
		innerSpan.style['text-align'] = 'center';
		}

		// Check if this string is multiple lines
		// Not guaranteed to always work if you use wonky line-heights
		var multiLine = settings.multiLine;
		if (settings.detectMultiLine && !multiLine &&
			innerSpan.getBoundingClientRect().height >= parseInt(el.ownerDocument.defaultView.getComputedStyle(innerSpan)['font-size'], 10) * 2){
		multiLine = true;
		}

		// If we're not treating this as a multiline string, don't let it wrap.
		if (!multiLine) {
		el.style['white-space'] = 'nowrap';
		}

		low = settings.minFontSize;
		high = settings.maxFontSize;

		// Binary search for highest best fit
		var size = low;
		while (low <= high) {
		mid = (high + low) >> 1;
		innerSpan.style.fontSize = mid + 'px';
		var innerSpanBoundingClientRect = innerSpan.getBoundingClientRect();
		if (
			innerSpanBoundingClientRect.width <= originalWidth 
			&& (settings.widthOnly || innerSpanBoundingClientRect.height <= originalHeight)
		) {
			size = mid;
			low = mid + 1;
		} else {
			high = mid - 1;
		}
		// await injection point
		}
		// found, updating font if differs:
		if( innerSpan.style.fontSize != size + 'px' ) innerSpan.style.fontSize = size + 'px';

		// Our height is finalized. If we are aligning vertically, set that up.
		if (settings.alignVert) {
		addStyleSheet(el);
		var height = innerSpan.scrollHeight;
		if (el.ownerDocument.defaultView.getComputedStyle(el)['position'] === "static"){
			el.style['position'] = 'relative';
		}
		if (!hasClass(innerSpan, "textFitAlignVert")){
			innerSpan.className = innerSpan.className + " textFitAlignVert";
		}
		innerSpan.style['height'] = height + "px";
		if (settings.alignVertWithFlexbox && !hasClass(el, "textFitAlignVertFlex")) {
			el.className = el.className + " textFitAlignVertFlex";
		}
		}
	}

	// Calculate height without padding.
	function innerHeight(el){
		var style = el.ownerDocument.defaultView.getComputedStyle(el, null);
		return el.getBoundingClientRect().height -
		parseInt(style.getPropertyValue('padding-top'), 10) -
		parseInt(style.getPropertyValue('padding-bottom'), 10);
	}

	// Calculate width without padding.
	function innerWidth(el){
		var style = el.ownerDocument.defaultView.getComputedStyle(el, null);
		return el.getBoundingClientRect().width -
		parseInt(style.getPropertyValue('padding-left'), 10) -
		parseInt(style.getPropertyValue('padding-right'), 10);
	}

	//Returns true if it is a DOM element
	function isElement(o){
		return (
		typeof HTMLElement === "object" ? o instanceof HTMLElement : //DOM2
		o && typeof o === "object" && o !== null && o.nodeType === 1 && typeof o.nodeName==="string"
		);
	}

	function hasClass(element, cls) {
		return (' ' + element.className + ' ').indexOf(' ' + cls + ' ') > -1;
	}

	// Better than a stylesheet dependency
		function addStyleSheet(el) {
			
			let root = el.getRootNode();
			
			// Check if we're in the Shadow DOM
			if (!(root instanceof ShadowRoot)) {
				root = document.body;
			}

			if (root.querySelector('#textFitStyleSheet')) return;

			const style = `
			.textFitAlignVert {
				position: absolute;
				top: 0; right: 0; bottom: 0; left: 0;
				margin: auto;
				display: flex;
				justify-content: center;
				flex-direction: column;
			}
			.textFitAlignVertFlex {
				display: flex;
			}
			.textFitAlignVertFlex .textFitAlignVert {
				position: static;
			}
			`;

			const css = document.createElement('style');
			css.type = 'text/css';
			css.id = 'textFitStyleSheet';
			css.innerHTML = style;
			root.appendChild(css);
		}

})();

 

function selectLanguage(lang = null) {
    lang = lang || navigator.language.slice(0, 2).toLowerCase()
    console.info(`🌍: Language ${lang}`)
    if (!["en", "fr"].includes(lang)) {
        lang = "en"
    }
    document.documentElement.lang = lang
    
    // Create a <style> element
    var style = document.createElement('style');

    
    // Add CSS rules to the <style> element
    style.innerHTML = `
        *[lang] { 
            display: none;
        }
        *[lang|=${lang}] { 
            display: inline;
        }
    `;
    
    // Append the <style> element to the <head>
    document.head.appendChild(style);
    /*
    document.body.querySelector(`#textarea[lang="en"]`)
    window.addEventListener(
        "load", () => {
            console.warn("lang", document.body.querySelectorAll(`*[lang]:not([lang="${lang}"])`))

            document.body.querySelectorAll(`[lang]:not([lang="${lang}"])`).forEach(element => {
                //element.remove(); // Remove each element from the DOM
                console.warn(element)
                element.parentNode.removeChild(element);
            });
        }
    )
    */

	window.lang = lang;
    
}
selectLanguage()

/*
addEventListener('unhandledrejection', function(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    // Log the unhandled rejection details
    console.warn({
        promise: event.promise,
        reason: event.reason,
    });
    // Properly throw an Error based on the rejection reason
    console.trace()
    //throw new Error(event.reason);
});
*/

const ForeignObjectPolyfill = {
	_isRequiredPolyfill: null,
	async isRequiredPolyfill() {
		if (this._isRequiredPolyfill === null) {
			const canvas = document.createElement('canvas')
			canvas.width = 10
			canvas.height = 10

			const ctx = canvas.getContext('2d')

			const svgImg = new Image(10, 10)
			const svgOnLoadPromise = new Promise(resolve => {
			svgImg.addEventListener('load', resolve)
			})

			svgImg.crossOrigin = 'anonymous'
			svgImg.src =
			'data:image/svg+xml;charset=utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2210%22%20height%3D%2210%22%20viewBox%3D%220%200%201%201%22%3E%3CforeignObject%20width%3D%221%22%20height%3D%221%22%20requiredExtensions%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxhtml%22%3E%3Cdiv%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F1999%2Fxhtml%22%20style%3D%22width%3A%201px%3B%20height%3A%201px%3B%20background%3A%20red%3B%20position%3A%20relative%22%3E%3C%2Fdiv%3E%3C%2FforeignObject%3E%3C%2Fsvg%3E'

			await svgOnLoadPromise
			ctx.drawImage(svgImg, 0, 0)

			this._isRequiredPolyfill = ctx.getImageData(5, 5, 1, 1).data[3] < 128
		}
		return this._isRequiredPolyfill
	},
	polyfill({svg, fo}) {

		const isTemplated = fo.classList.contains('_polyfilledForeignObject');
		/*if (isTemplated) {
			fo = fo.content
		}*/

		const x = parseFloat(fo.getAttribute("x"));
		const y = parseFloat(fo.getAttribute("y"));
		const width = parseFloat(fo.getAttribute("width"));
		const height = parseFloat(fo.getAttribute("height"));
	
		const pointA = svg.createSVGPoint();
		pointA.x = x;
		pointA.y = y;
		const transformedPointA = pointA.matrixTransform(fo.getScreenCTM());
	
		// Corrected width and height scaling based on the matrix
		const scaleX = fo.getCTM().a;
		const scaleY = fo.getCTM().d;
		
		let adjustedWidth = width * scaleX;
		let adjustedHeight = height * scaleY;
	
		const overlay = document.createElement('div');
		overlay.style.cssText = window.getComputedStyle(fo).cssText;
		overlay.style.position = "fixed" //"absolute";

		if (adjustedHeight < 0) {
			overlay.style.top = (transformedPointA.y + adjustedHeight ) + "px";
			adjustedHeight = Math.abs(adjustedHeight) 
		} else {
			overlay.style.top = transformedPointA.y + "px";
		}

		if (adjustedWidth < 0) {
			overlay.style.left = (transformedPointA.x + adjustedWidth ) + "px";
			adjustedWidth = Math.abs(adjustedWidth) 
		} else {
			overlay.style.left = transformedPointA.x + "px";
		}
	
		// Applying the scaled width and height
		overlay.style.width = adjustedWidth + "px";
		overlay.style.height = adjustedHeight + "px";
	
		overlay.classList.add('foreignObjecPolyfill');
		overlay.innerHTML = ((isTemplated)?fo.firstChild.innerHTML:fo.innerHTML);
	
		/*
		let mat;
		try {
			mat = fo.transform.baseVal.consolidate().matrix;
		} catch {
			mat = svg.createSVGMatrix();
		}
		*/
		//const mat = new DOMMatrix(window.getComputedStyle(fo).transform)

		const styleTransform = fo.style.transform;
		let mat;
		if (!styleTransform) {
			try {
				mat = fo.transform.baseVal.consolidate().matrix;
			} catch {
				mat = svg.createSVGMatrix();
			}
		} else {
			mat = new DOMMatrix(styleTransform)
		}
	
		// Applying transformation matrix
		overlay.style.transform = `matrix(${mat.a}, ${mat.b}, ${mat.c}, ${mat.d}, ${mat.e}, ${mat.f})`;
		overlay.style.transformOrigin = `${mat.e}px ${mat.f}px`;
	
		//document.body.appendChild(overlay);
		svg.parentElement.appendChild(overlay);
		//fo.appendChild(overlay)

		if (!isTemplated) {
			fo.classList.add("_polyfilledForeignObject")
			fo.innerHTML = `<template>${fo.innerHTML}</template>`
		}
	},
	async apply() {
		
		//if (!(await this.isRequiredPolyfill())) return;
		console.log("apply !!");

		if (!document.getElementById("_foreignObjecPolyfillFix")) {
			
			const styleEl = document.createElement("style");
			styleEl.id = "_foreignObjecPolyfillFix"
			
			// Append <style> element to <head>
			document.head.appendChild(styleEl);

			const styleSheet = styleEl.sheet;

			console.log(
				styleEl,
				styleSheet
			)
			
			styleSheet.insertRule(
				`foreignObject > * {
					display: none;
				}`,
				styleSheet.cssRules.length,
			);
		
		}

		[...document.getElementsByClassName("foreignObjecPolyfill")].forEach(
			div => {
				div.remove()
			}
		);

		[...document.getElementsByTagName("svg")].forEach(
			svg => {
				[...svg.getElementsByTagName("foreignObject")].forEach(
					fo => this.polyfill({svg, fo})
				)
			}
		);

	}
}

// Where el is the DOM element you'd like to test for visibility
function isHidden(el) {
    return (el.offsetParent === null)
}

window.onresize = (event, n_time = 1) => {

    /*
	if (n_time == 1) {
		ForeignObjectPolyfill.apply()
	}
	*/

    console.log("resize", n_time);

	let elements = [...document.getElementsByClassName("text2fit")];

	[...document.getElementsByClassName("shadow")].forEach(e => {
		if (e.shadowRoot) {
			console.warn(e, e.shadowRoot);
			let shadowElements = e.shadowRoot.querySelectorAll(".text2fit");
			elements = elements.concat([...shadowElements]);
		} else {
			console.warn(e, "No shadowRoot");
		}
	});

    for(var e of elements) {
        if (!isHidden(e))
			try {
				window.textFit(e, {
					multiLine: true,
					minFontSize: 5,
					maxFontSize: window.innerHeight,
					alignVert: true,
					alignHoriz: true,
					//alignVertWithFlexbox: true,
					//reProcess: true,
				});
			} catch (error) {
				console.error("Element error", e)
				console.error("text2fit error", error)
			}
    }

    if (n_time) {
        setTimeout(() => window.onresize(null, n_time - 1), 200);
    }
}

window.addEventListener(
    "load",
    () => {
        //log("window.onload");
        window.onresize();
    }
)

function clipboard(txt) {
    //alert(window.isSecureContext + ": " + txt);
    if (window.isSecureContext) {
        navigator.clipboard.writeText(txt);
    } else {
        alert(txt);
    }
}