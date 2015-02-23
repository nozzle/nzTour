# nzTour
Touring and on-boarding made simple for AngularJS.

## [Awesome Demo](http://nozzle.github.io/nzTour/)

## Features

*	Responsive & Intelligent
*	Automagic Positioning
*	Promise Driven Events & Hooks (Because we <3 Angular)
*	nzTour doesn't touch your DOM (more info below)

## Installation

1.	`$ bower/npm install nz-tour --save`
2.	Include `dist/nz-tour.min.js` and `dist/nz-tour.min.css` files.
3.	Add `nzTour` as a dependency in your app.
4.	Inject the `nzTour` service anywhere in your app.

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
            visible: true,
            clickThrough: false,
            clickExit: false,
            color: 'rgba(0,0,0,.7)'
        },
        container: 'body',
        scrollBox: 'body',
        previousText: 'Previous',
        nextText: 'Next',
        finishText: 'Finish',
        animationDuration: 400,
    },
	steps: []
}
```

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

1. Remove dependency on jQuery
2. Use angular $animate for animations and class changes
3. Add more hooks and config for customization

All PR's and contributions are more than welcome!
