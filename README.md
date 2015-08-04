# nzTour

[![Join the chat at https://gitter.im/nozzle/nzTour](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/nozzle/nzTour?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
Touring and on-boarding made simple for AngularJS.

## [Awesome Demo](http://nozzle.github.io/nzTour)

## Features

*	Responsive & Intelligent
*	Automagic Positioning
*	Promise Driven Events & Hooks (Because we <3 Angular)
*	nzTour doesn't touch your DOM (more info below)

## Installation & Usage

1.	`$ bower/npm install nz-tour --save`
2.  Include jQuery (before Angular)
3.	Include `dist/nz-tour.min.js` and `dist/nz-tour.min.css` files.
4.	Add `nzTour` as a dependency in your app.
5.	Inject the `nzTour` service anywhere in your app.

## Simple Usage

```javascript
var tour = {
	config: {} // see config
    steps: [{
        target: '#first-element',
        content: 'This is the first step!',
    }, {
        target: '.some .other .element',
        content: 'Blah blah blah.',
    }, {
        target: '#menu-element',
        content: 'I guess this is a menu!',
    }, {
        target: '#last-element',
        content: 'It is over! :(',
    }]
};

nzTour.start(service.tours[tour])
    .then(function() {
        console.log('Tour Finished!');
    })
    .catch(function() {
        console.log('Tour Aborted!')
    });

```

## Config

Defaults:
```javascript
var tour = {
	config: {
        mask: {
            visible: true, // Shows the element mask
            clickThrough: false, // Allows the user to interact with elements beneath the mask
            clickExit: false, // Exit the tour when the user clicks on the mask
            scrollThrough: true // Allows the user to scroll the scrollbox or window through the mask
            color: 'rgba(0,0,0,.7)' // The mask color
        },
        scrollBox: 'body', // The container to scroll when searching for elements
        previousText: 'Previous',
        nextText: 'Next',
        finishText: 'Finish',
        animationDuration: 400, // Animation Duration for the box and mask
        placementPriority: ['bottom', 'right', 'top','left'],
        dark: false // Dark mode (Works great with `mask.visible = false`)
    },
	steps: []
}
```

## Shortcut Keys

*   Left/Right Arrow keys - Previous/Next
*   Esc - Abort the tour
*   1-9 - Goto step 1-9

## API

####.start(tour) - Starts a Tour
Params:
*	*tour*: Tour Object

Returns:
*	Promise that resolves when the tour is finished and rejected when aborted.

####.stop() - Stops a Tour
Returns:
*	Promise that resolves when the tour is stopped.

####.pause() - Pauses a Tour
Returns:
*	Promise that resolves when the tour is paused and hidden.

####.next() - Goes to the next step in the current tour
Returns:
*	Promise that resolves when the next step is reached

####.previous() - Goes to the previous step in the current tour
*	Promise that resolves when the previous step is reached

####.gotoStep(step): - Goes to a specific step in the tour
Params:
*	*step*: The number of the step starting at 1,2,3...

Returns:
*	Promise that resolves when the specific step is reached


## Promising Event Hooks

*	Before - function that returns a promise
*	After - function that returns a promise

#### Example
```javascript
var tour = {
	steps: [{
        target: '#first-element',
        content: 'This is the first step!',
    }, {
        target: '.some .other .element',
        content: 'Blah blah blah.',
        before: function(){
        	var d = $q.defer();
        	// Do something amazing
        	d.resolve(); // or d.reject()
        	return d.promise
    	}
    }, {
        target: '#menu-element',
        content: 'I guess this is a menu!',
        after: function(){
        	var d = $q.defer();
        	// Do some more cool stuff
        	d.resolve(); // or d.reject()
        	return d.promise
    	}
    }, {
        target: '#last-element',
        content: 'It is over! :(',
    }]
}
```


## Roadmap & Contributing

*   Reduce footprint
*   Dynamic Masking (opening select boxes and dynamically moving content)
*   Remove dependency on jQuery
*   Use angular $animate for animations and class changes
*   Add more hooks and config for customization

All PR's and contributions are more than welcome!
