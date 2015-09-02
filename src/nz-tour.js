(function() {
    var module = angular.module('nzTour', []);

    module.factory('nzTour', function($q, $rootScope, $compile, $timeout) {

        var service = $rootScope.$new();

        angular.extend(service, {

            // Props
            config: {
                mask: {
                    visible: true,
                    clickThrough: false,
                    clickExit: false,
                    scrollThrough: true,
                    color: 'rgba(0,0,0,.7)'
                },
                dark: false,
                scrollBox: navigator.userAgent.indexOf('AppleWebKit') != -1 ? "body" : "html",
                previousText: 'Previous',
                nextText: 'Next',
                finishText: 'Finish',
                animationDuration: 400,
                placementPriority: ['bottom', 'right', 'top', 'left']
            },
            current: false,
            body: angular.element('body'),
            box: false,

            // Methods
            start: start,
            stop: stop,
            pause: pause,
            next: next,
            previous: previous,
            gotoStep: gotoStep,

            //Utils
            throttle: throttle,
            debounce: debounce
        });

        window.nzTour = service;

        return service;



        // API

        function start(tour) {
            if (!tour) {
                throw 'No Tour Specified!';
            }
            if (!tour.steps.length) {
                throw 'No steps were found in that tour!';
            }
            if (service.current) {
                return stop()
                    .then(function() {
                        return startTour(tour);
                    });
            }
            return startTour(tour);
        }

        function stop() {
            return doAfter()
                .then(function() {
                    return toggleElements(false);
                })
                .then(function() {
                    service.current.promise.reject();
                    service.current = false;
                    return true;
                });
        }

        function pause() {
            if (service.current) {
                hide();
            }
            return;
        }

        function next() {
            if (!service.current) {
                service.current.reject();
            }

            return doAfter()
                .then(checkHasNext)
                .then(function() {
                    service.current.step++;
                })
                .then(doStep);
        }

        function previous() {
            return doAfter()
                .then(function() {
                    if (service.current.step > 0) {
                        service.current.step--;
                        return true;
                    }
                    return $q.reject();
                })
                .then(doStep);
        }

        function gotoStep(i) {
            var d = $q.defer();
            if (i > 0 && i <= service.current.tour.steps.length) {
                return doAfter()
                    .then(function() {
                        service.current.step = i;
                    })
                    .then(doStep);
            }
            d.reject();
            return d.promise;
        }





        // Internals

        function startTour(tour) {

            tour.config = angular.extendDeep({}, service.config, tour.config);

            // Check for valid priorities
            var hasValidPriorities = true;
            angular.forEach(tour.config.placementPriority, function(priority) {
                if (hasValidPriorities && service.config.placementPriority.indexOf(priority) == -1) {
                    hasValidPriorities = false;
                    tour.config.placementOptions = service.config.placementPriority;
                }
            });

            service.current = {
                tour: tour,
                step: 0,
                promise: $q.defer()
            };

            toggleElements(true, tour);
            doStep();

            return service.current.promise.promise;
        }

        function toggleElements(state, tour) {

            var d = $q.defer();

            if (state) {
                service.box = angular.element($compile('<nz-tour class="hidden"></nz-tour>')(service));
                angular.element(service.body).append(service.box);
                service.box.removeClass('hidden');
                d.resolve();
            } else {
                service.box.addClass('hidden');
                $timeout(function() {
                    service.cleanup();
                    d.resolve();
                }, service.current.tour.config.animationDuration);
            }
            return d.promise;
        }

        function doStep() {
            return doBefore()
                .then(broadcastStep);
        }

        function doBefore() {
            var d = $q.defer();
            if (service.current.tour.steps[service.current.step].before) {
                return service.current.tour.steps[service.current.step].before();
            }
            d.resolve();
            return d.promise;
        }

        function broadcastStep() {
            var d = $q.defer();
            service.$broadcast('step', service.current.step);
            d.resolve();
            return d.promise;
        }



        function doAfter() {
            var d = $q.defer();
            if (service.current.tour.steps[service.current.step].after) {
                return service.current.tour.steps[service.current.step].after();
            }
            d.resolve();
            return d.promise;
        }

        function checkHasNext() {
            var d = $q.defer();
            if (service.current.step == service.current.tour.steps.length - 1) {
                finish();
                d.reject();
            }
            d.resolve();
            return d.promise;
        }



        function finish() {
            toggleElements(false)
                .then(function() {
                    service.current.promise.resolve();
                    service.current = false;
                    return true;
                });
        }


        function hide() {

        }

        function show() {

        }

        function throttle(callback, limit) {
            var wait = false;
            return function() {
                if (!wait) {
                    callback.call();
                    wait = true;
                    $timeout(function() {
                        wait = false;
                    }, limit);
                }
            };
        }

        function debounce(func, wait, immediate) {
            var timeout;
            return function() {
                var context = this,
                    args = arguments;
                var later = function() {
                    timeout = null;
                    if (!immediate) func.apply(context, args);
                };
                var callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func.apply(context, args);
            };
        }
    });

    module.directive('nzTour', function($q, $timeout, $window) {
        return {
            template: [
                '<div id="nzTour-box-wrap">',
                '   <div id="nzTour-box">',
                '        <div id="nzTour-tip" class="top center"></div>',
                '        <div id="nzTour-step">{{view.step + 1}}</div>',
                '        <div id="nzTour-length">{{view.length}}</div>',
                '        <div id="nzTour-close" ng-click="stop()">&#10005</div>',
                '        <div id="nzTour-content">',
                '           <div id="nzTour-inner-content"></div>',
                '        </div>',
                '        <div id="nzTour-actions">',
                '            <button id="nzTour-previous" ng-show="view.step > 0" ng-click="previous()" class="ng-hide">{{view.previousText}}</button>',
                '            <button id="nzTour-next" ng-show="view.step >= 0" ng-click="next()" class="success" class="ng-hide">{{view.nextText}}</button>',
                '        </div>',
                '    </div>',
                '</div>',
                '<div class="nzTour-masks" ng-show="current.tour.config.mask.visible" ng-click="tryStop()">',
                '    <div class="mask top"></div>',
                '    <div class="mask right"></div>',
                '    <div class="mask bottom"></div>',
                '    <div class="mask left"></div>',
                '</div>',
            ].join(' '),
            link: function($scope, el, attrs) {

                // $scope is the actual nzTour service :)

                var config = $scope.current.tour.config,
                    target = false,
                    seeking = false,
                    margin = 15,
                    vMargin = margin + 'px 0',
                    hMargin = '0 ' + margin + 'px',
                    maxHeight = 120,
                    maxWidth = 250,
                    scrolling = false,
                    maskTransitions = true;

                var els = {
                    window: angular.element(window),
                    wrap: el.find('#nzTour-box-wrap'),
                    box: el.find('#nzTour-box'),
                    tip: el.find('#nzTour-tip'),
                    step: el.find('#nzTour-step'),
                    close: el.find('#nzTour-close'),
                    content: el.find('#nzTour-content'),
                    innerContent: el.find('#nzTour-inner-content'),
                    actions: el.find('#nzTour-actions'),
                    previous: el.find('#nzTour-previous'),
                    next: el.find('#nzTour-next'),
                    masks_wrap: el.find('.nzTour-masks'),
                    masks_top: el.find('.nzTour-masks .top'),
                    masks_right: el.find('.nzTour-masks .right'),
                    masks_bottom: el.find('.nzTour-masks .bottom'),
                    masks_left: el.find('.nzTour-masks .left'),
                    scroll: angular.element(config.scrollBox),
                    target: false,
                };

                var dims = {
                    window: {},
                    scroll: {},
                    target: {},
                };



                // Turn on Transitions
                toggleMaskTransitions(true);
                toggleBoxTransitions(true);

                // Mask Events?
                els.masks_wrap.css('pointer-events', config.mask.clickThrough ? 'none' : 'all');

                // Dark Box?
                if (config.dark) {
                    els.box.addClass('dark-box');
                    margin = 7;
                }

                // Mask Background Color
                els.masks_top.add(els.masks_right).add(els.masks_bottom).add(els.masks_left).css({
                    'background-color': config.mask.color
                });



                // Step Update Listener
                var stepUpdater = $scope.$on('step', updateStep);
                // Thottle for 60fps
                var onWindowScrollDebounced = $scope.throttle(onWindowScroll, 16);
                var stopScrollingDebounced = $scope.debounce(stopScrolling, 100);

                // Key Bindings
                els.window.bind('keydown', keyDown);
                // window scroll, resize bindings
                els.window.bind('resize scroll', onWindowScrollDebounced);
                window.addWheelListener(window, onWindowScrollDebounced);
                // content scroll bindings
                els.content.bind('scroll', onBoxScroll);
                window.addWheelListener(els.content[0], onBoxScroll);
                // mask scroll bindings
                if (config.mask.scrollThrough === false) {
                    window.addWheelListener(els.masks_wrap, stopMaskScroll);
                }

                // Event Cleanup
                $scope.cleanup = function cleanup() {
                    stepUpdater();
                    els.window.unbind('keydown', keyDown);
                    els.window.unbind('resize scroll', onWindowScrollDebounced);
                    window.removeWheelListener(window, onWindowScrollDebounced);
                    els.content.unbind('scroll', onBoxScroll);
                    window.removeWheelListener(els.content[0], onBoxScroll);

                    if (config.mask.scrollThrough === false) {
                        window.removeWheelListener(els.masks_wrap[0], stopMaskScroll);
                    }
                    els = {};
                    el.remove();
                };

                window.tanner = $scope;





                // Events

                $scope.tryStop = function() {
                    if (config.mask.clickExit) {
                        $scope.stop();
                    }
                };

                function keyDown(e) {
                    if (e.which >= 49 && e.which <= 57) {
                        $scope.gotoStep(e.which - 48);
                        return;
                    }
                    switch (e.which) {
                        case 37:
                            $scope.previous();
                            prevent(e);
                            return;
                        case 39:
                            $scope.next();
                            prevent(e);
                            return;
                        case 27:
                            $scope.stop();
                            prevent(e);
                            return;
                        case 38:
                        case 40:
                            onWindowScrollDebounced();
                            return;
                    }
                }

                function stopMaskScroll(e) {
                    e.stopPropagation(e);
                    e.preventDefault(e);
                    e.returnValue = false;
                    return false;
                }

                function toggleMaskTransitions(state) {
                    var group = els.masks_top.add(els.masks_right).add(els.masks_bottom).add(els.masks_left);
                    if (state) {
                        maskTransitions = true;
                        group.css('transition', 'all ' + config.animationDuration + 'ms ease');
                    } else {
                        maskTransitions = false;
                        group.css('transition', 'all 0');
                    }
                }

                function toggleBoxTransitions(state) {
                    var group = els.wrap.add(els.box).add(els.tip);
                    if (state) {
                        group.css('transition', 'all ' + config.animationDuration + 'ms ease');
                    } else {
                        group.css('transition', 'all 0');
                    }
                }

                function onBoxScroll(e) {
                    var delta;
                    if (e.type == 'DOMMouseScroll') {
                        delta = e.detail * -40;
                    } else {
                        delta = e.wheelDelta;
                    }
                    var up = delta > 0;
                    var scrollTop = els.content.scrollTop();


                    if (up && !scrollTop) {
                        return prevent(e);
                    }
                    if (!up && (innerContent.height() - content.height() == scrollTop)) {
                        return prevent(e);
                    }
                }

                function prevent(e) {
                    e.stopPropagation(e);
                    e.preventDefault(e);
                    e.returnValue = false;
                    return false;
                }

                function onWindowScroll() {
                    if (seeking) {
                        return;
                    }

                    scrolling = true;
                    toggleMaskTransitions(false);
                    stopScrollingDebounced();

                    findTarget()
                        .then(getDimensions)
                        .then(scrollToTarget)
                        .then(getDimensions)
                        .then(moveToTarget);
                }

                function stopScrolling() {
                    scrolling = false;
                    toggleMaskTransitions(true);
                }

                function updateStep(e, step) {

                    els.target = false;
                    var steps = $scope.current.tour.steps;

                    $scope.view = {
                        step: step,
                        length: steps.length,
                        previousText: config.previousText,
                        nextText: step == steps.length - 1 ? config.finishText : config.nextText
                    };
                    //Don't mess around with angular sanitize for now. Add compile and sanitize later...
                    els.innerContent.html(steps[step].content);
                    // Scroll Back to the top
                    els.content.scrollTop(0);

                    // Reset Scrolling and Seeking states
                    seeking = true;

                    return findTarget(step)
                        .then(getDimensions)
                        .then(scrollToTarget)
                        .then(getDimensions)
                        .then(moveToTarget)
                        .then(function() {
                            seeking = false;
                        });
                }








                // Internal Functions

                function findTarget(step) {
                    var d = $q.defer();

                    if (els.target) {
                        d.resolve(target);
                    } else {
                        var foundTarget = angular.element($scope.current.tour.steps[step].target);
                        if (!foundTarget.length) {
                            d.resolve(false);
                        } else {
                            els.target = angular.element(foundTarget[0]);
                            d.resolve(els.target);
                        }
                    }
                    return d.promise;
                }

                function getDimensions() {

                    var d = $q.defer();

                    if (!els.target) {
                        d.resolve();
                        return d.promise;
                    }

                    // Window

                    dims.window = {
                        width: els.window.width(),
                        height: els.window.height(),
                    };


                    // Scrollbox 

                    dims.scroll = {
                        width: els.scroll.outerWidth(),
                        height: els.scroll.outerHeight(),
                        offset: els.scroll.offset(),
                        scroll: {
                            top: els.scroll.scrollTop(),
                            left: els.scroll.scrollLeft(),
                        }
                    };

                    // Round Offsets
                    angular.forEach(dims.scroll.offset, function(o, i) {
                        dims.scroll.offset[i] = Math.ceil(o);
                    });

                    dims.scroll.height = (dims.scroll.height + dims.scroll.offset.top > dims.window.height) ? dims.window.height : dims.scroll.height;
                    dims.scroll.width = (dims.scroll.width + dims.scroll.offset.left > dims.window.width) ? dims.window.width : dims.scroll.width;
                    dims.scroll.offset.toBottom = dims.scroll.height + dims.scroll.offset.top;
                    dims.scroll.offset.toRight = dims.scroll.width + dims.scroll.offset.left;
                    dims.scroll.offset.fromBottom = dims.window.height - dims.scroll.offset.top - dims.scroll.height;
                    dims.scroll.offset.fromRight = dims.window.width - dims.scroll.offset.left - dims.scroll.width;


                    // Target

                    dims.target = {
                        width: els.target.outerWidth(),
                        height: els.target.outerHeight(),
                        offset: els.target.offset(),
                    };

                    // For an html/body scrollbox
                    if (config.scrollBox == 'body' || config.scrollBox == 'html') {
                        dims.target.offset.top -= dims.scroll.scroll.top;
                    }

                    // Round Offsets
                    angular.forEach(dims.target.offset, function(o, i) {
                        dims.target.offset[i] = Math.ceil(o);
                    });

                    // Get Target Bottom and right
                    dims.target.offset.toBottom = dims.target.offset.top + dims.target.height;
                    dims.target.offset.toRight = dims.target.offset.left + dims.target.width;
                    dims.target.offset.fromBottom = dims.window.height - dims.target.offset.top - dims.target.height;
                    dims.target.offset.fromRight = dims.window.width - dims.target.offset.left - dims.target.width;

                    // Get Target Margin Points
                    dims.target.margins = {
                        offset: {
                            top: dims.target.offset.top - margin,
                            left: dims.target.offset.left - margin,
                            toBottom: dims.target.offset.toBottom + margin,
                            toRight: dims.target.offset.toRight + margin,
                            fromBottom: dims.target.offset.fromBottom - margin,
                            fromRight: dims.target.offset.fromRight - margin,
                        },
                        height: dims.target.height + margin * 2,
                        right: dims.target.offset.fromRight + margin * 2
                    };

                    d.resolve();

                    return d.promise;
                }

                function scrollToTarget() {
                    var d = $q.defer();

                    if (!els.target) {
                        d.resolve();
                        return d.promise;
                    }

                    var newScrollTop = findScrollTop();


                    if (!newScrollTop) {
                        d.resolve();
                    } else {
                        els.scroll.animate({
                                scrollTop: newScrollTop
                            }, scrolling ? 0 : config.animationDuration,
                            function() {
                                d.resolve();
                            });
                    }

                    return d.promise;
                }


                function findScrollTop() {
                    // Is element to large to fit?
                    if (dims.target.margins.height > dims.scroll.height) {
                        // Is the element too far above us?
                        if (dims.target.offset.toBottom - maxHeight < dims.scroll.offset.top) {
                            return dims.scroll.scroll.top - (dims.scroll.offset.top - (dims.target.offset.toBottom - maxHeight));
                        }
                        // Is the element too far below us?
                        if (dims.target.offset.top + maxHeight > dims.scroll.offset.toBottom) {
                            return dims.scroll.scroll.top + ((dims.target.offset.top + maxHeight) - dims.scroll.offset.toBottom);
                        }
                        // Must be visible on both ends?
                        return false;
                    }

                    // Is Element too far Above Us?
                    if (dims.target.margins.offset.top < dims.scroll.offset.top) {
                        return dims.scroll.scroll.top - (dims.scroll.offset.top - dims.target.margins.offset.top);
                    }

                    // Is Element too far Below Us?
                    if (dims.target.margins.offset.toBottom > dims.scroll.offset.toBottom) {
                        return dims.scroll.scroll.top + (dims.target.margins.offset.toBottom - dims.scroll.offset.toBottom);
                    }

                    return false;
                }

                function moveToTarget() {

                    return $q.all([
                        moveBox(),
                        moveMasks()
                    ]);
                }

                function moveBox() {

                    var step = $scope.current.tour.steps[$scope.current.step];

                    var d = $q.defer();

                    // Default Position?
                    if (!els.target) {
                        placeCentered();
                        return;
                    }

                    var placementOptions = {
                        bottom: bottom,
                        right: right,
                        left: left,
                        top: top
                    };

                    var placed = false;

                    // If placement is supplied, use that rather than positioning dynamically

                    if (step.placement && placementOptions[step.placement]) {
                        placementOptions[step.placement]();
                        placed = true;
                        d.resolve();
                    } else {
                        angular.forEach(config.placementPriority, function(priority) {
                            if (!placed && placementOptions[priority]()) {
                                placed = true;
                                d.resolve();
                            }
                        });
                    }

                    if (!placed) {
                        placeInside('bottom', 'center');
                        d.resolve();
                        return;
                    }

                    return d.promise;


                    // Placement Priorities

                    function bottom() {
                        // Can Below?
                        if (dims.target.margins.offset.fromBottom > maxHeight) {
                            // Can Centered?
                            if (dims.target.width > maxWidth) {
                                placeVertically('bottom', 'center');
                                return true;
                            }
                            // Can on the left?
                            if (dims.target.offset.fromRight + dims.target.width > maxWidth) {
                                placeVertically('bottom', 'left');
                                return true;
                            }
                            // Right, I guess...
                            placeVertically('bottom', 'right');
                            return true;
                        }
                        return false;
                    }

                    function right() {
                        // Can Right?
                        if (dims.target.margins.offset.fromRight > maxWidth) {

                            // Is Element to Large to fit?
                            if (dims.target.margins.height > dims.scroll.height) {

                                if (dims.target.offset.top > dims.window.height / 2) {
                                    placeHorizontally('right', 'top');
                                    return true;
                                }

                                if (dims.target.offset.fromBottom > dims.window.height / 2) {
                                    placeHorizontally('right', 'bottom');
                                    return true;
                                }

                                placeHorizontally('right', 'center', true);
                                return true;
                            }

                            // Can Center?
                            if (dims.target.height > maxHeight) {
                                placeHorizontally('right', 'center');
                                return true;
                            }
                            // can Top?
                            if (dims.target.offset.fromBottom + dims.target.height > maxHeight) {
                                placeHorizontally('right', 'top');
                                return true;
                            }
                            placeHorizontally('right', 'bottom');
                            return true;
                        }
                        return false;
                    }

                    function left() {
                        // Can Left?
                        if (dims.target.margins.offset.left > maxWidth) {
                            // Is Element to Large to fit?
                            if (dims.target.margins.height > dims.scroll.height) {
                                placeHorizontally('left', 'center', true);
                                return true;
                            }
                            // can Center?
                            if (dims.target.height > maxHeight) {
                                placeHorizontally('left', 'center');
                                return true;
                            }
                            // can Top?
                            if (dims.target.offset.fromBottom + dims.target.height > maxHeight) {
                                placeHorizontally('left', 'top');
                                return true;
                            }
                            placeHorizontally('left', 'bottom');
                            return true;
                        }
                        return false;
                    }

                    function top() {
                        // Can Above?
                        if (dims.target.margins.offset.top > maxHeight) {
                            // Can Centered?
                            if (dims.target.width > maxWidth) {
                                placeVertically('top', 'center');
                                return true;
                            }
                            // Can on the left?
                            if (dims.target.offset.fromRight + dims.target.width > maxWidth) {
                                placeVertically('top', 'left');
                                return true;
                            }
                            // Right, I guess...
                            placeVertically('top', 'right');
                            return true;
                        }
                        return false;
                    }






                    // Placement functions

                    function placeVertically(v, h) {

                        var top;
                        var left;
                        var translateX;
                        var translateY;
                        var tipY;

                        if (v == 'top') {
                            top = dims.target.margins.offset.top;
                            tipY = 'bottom';
                            translateY = '-100%';
                        } else {
                            top = dims.target.margins.offset.toBottom;
                            tipY = 'top';
                            translateY = '0';

                        }

                        if (h == 'right') {
                            left = dims.target.offset.toRight;
                            translateX = '-100%';
                        } else if (h == 'center') {
                            left = dims.target.offset.left + dims.target.width / 2;
                            translateX = '-50%';
                        } else {
                            left = dims.target.offset.left;
                            translateX = '0';
                        }

                        els.wrap.css({
                            left: left + 'px',
                            top: top + 'px',
                            transform: 'translate(' + translateX + ',' + translateY + ')',
                        });

                        els.tip.attr('class', 'vertical ' + tipY + ' ' + h);

                    }

                    function placeHorizontally(h, v, fixed) {

                        var top;
                        var left;
                        var translateX;
                        var translateY;
                        var tipX;

                        if (h == 'right') {
                            left = dims.target.margins.offset.toRight;
                            tipX = 'left';
                            translateX = '0';
                        } else {
                            left = dims.target.margins.offset.left;
                            tipX = 'right';
                            translateX = '-100%';
                        }

                        if (fixed) {
                            top = dims.window.height / 2;
                            translateY = '-50%';
                        } else if (v == 'top') {
                            top = dims.target.offset.top;
                            translateY = '0';
                        } else if (v == 'center') {
                            top = dims.target.offset.top + dims.target.height / 2;
                            translateY = '-50%';
                        } else {
                            top = dims.target.offset.toBottom;
                            translateY = '-100%';
                        }

                        els.wrap.css({
                            left: left + 'px',
                            top: top + 'px',
                            transform: 'translate(' + translateX + ',' + translateY + ')',
                        });

                        els.tip.attr('class', 'horizontal ' + tipX + ' ' + v);

                    }

                    function placeInside(v, h) {

                        var top;
                        var left;
                        var translateY;
                        var translateX;

                        if (v == 'top') {
                            top = dims.target.margins.offset.top < dims.scroll.offset.top ? margin : dims.target.offset.top;
                            translateY = '0';
                        } else {
                            top = dims.target.margins.offset.toBottom > dims.scroll.offset.toBottom ? dims.scroll.offset.toBottom - margin : dims.target.offset.toBottom;
                            translateY = '-100%';
                        }

                        if (h == 'right') {
                            left = dims.target.offset.left + dims.target.width;
                            translateX = '-100%';
                        } else if (h == 'center') {
                            left = dims.target.offset.left + dims.target.width / 2;
                            translateX = '-50%';
                        } else {
                            left = dims.target.offset.left;
                            translateX = '0';
                        }

                        els.wrap.css({
                            left: left + 'px',
                            top: top + 'px',
                            transform: 'translate(' + translateX + ',' + translateY + ')',
                        });

                        els.tip.attr('class', 'hidden');
                    }

                    function placeCentered() {
                        els.wrap.css({
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            margin: '0'
                        });
                        els.tip.attr('class', 'hidden');

                    }
                }

                function moveMasks() {

                    var d = $q.defer();

                    if (!els.target) {
                        els.masks_top.css({
                            height: '0px'
                        });
                        els.masks_bottom.css({
                            height: '0px'
                        });
                        els.masks_left.css({
                            top: '0px',
                            height: '100%',
                            width: '0px'
                        });
                        els.masks_right.css({
                            top: '0px',
                            height: '100%',
                            width: '0px'
                        });
                        return;
                    }

                    els.masks_top.css({
                        height: dims.target.offset.top + 'px',
                        top: dims.target.offset.top < 0 ? dims.target.offset.top + 'px' : 0
                    });
                    els.masks_bottom.css({
                        height: dims.target.offset.fromBottom + 'px',
                        bottom: dims.target.offset.fromBottom < 0 ? dims.target.offset.fromBottom + 'px' : 0
                    });
                    els.masks_left.css({
                        top: dims.target.offset.top + 'px',
                        height: dims.target.height + 'px',
                        width: dims.target.offset.left + 'px'
                    });
                    els.masks_right.css({
                        top: dims.target.offset.top + 'px',
                        height: dims.target.height + 'px',
                        width: dims.target.offset.fromRight + 'px'
                    });

                    d.resolve();

                    return d.promise;
                }
            }
        };
    });

    window.angular.extendDeep = function extendDeep(dst) {
        angular.forEach(arguments, function(obj) {
            if (obj !== dst) {
                angular.forEach(obj, function(value, key) {
                    if (dst[key] && dst[key].constructor && dst[key].constructor === Object) {
                        extendDeep(dst[key], value);
                    } else {
                        dst[key] = value;
                    }
                });
            }
        });
        return dst;
    };

    if (window.addWheelListener) {
        return;
    }

    var prefix = "",
        _addEventListener, onwheel, support;

    // detect event model
    if (window.addEventListener) {
        _addEventListener = "addEventListener";
        _removeEventListener = "removeEventListener";
    } else {
        _addEventListener = "attachEvent";
        _removeEventListener = "detachEvent";
        prefix = "on";
    }

    // detect available wheel event
    support = "onwheel" in document.createElement("div") ? "wheel" : // Modern browsers support "wheel"
        document.onmousewheel !== undefined ? "mousewheel" : // Webkit and IE support at least "mousewheel"
        "DOMMouseScroll"; // let's assume that remaining browsers are older Firefox

    window.addWheelListener = function(elem, callback, useCapture) {
        _addWheelListener(elem, support, callback, useCapture);

        // handle MozMousePixelScroll in older Firefox
        if (support == "DOMMouseScroll") {
            _addWheelListener(elem, "MozMousePixelScroll", callback, useCapture);
        }
    };

    window.removeWheelListener = function(elem, callback, useCapture) {
        _removeWheelListener(elem, support, callback, useCapture);

        // handle MozMousePixelScroll in older Firefox
        if (support == "DOMMouseScroll") {
            _removeWheelListener(elem, "MozMousePixelScroll", callback, useCapture);
        }
    };

    function _removeWheelListener(elem, eventName, callback, useCapture) {
        elem[_removeEventListener](prefix + eventName, support == "wheel" ? callback : original, useCapture || false);
    }

    function _addWheelListener(elem, eventName, callback, useCapture) {
        elem[_addEventListener](prefix + eventName, support == "wheel" ? callback : original, useCapture || false);
    }

    function original(originalEvent) {
        !originalEvent && (originalEvent = window.event);

        // create a normalized event object
        var event = {
            // keep a ref to the original event object
            originalEvent: originalEvent,
            target: originalEvent.target || originalEvent.srcElement,
            type: "wheel",
            deltaMode: originalEvent.type == "MozMousePixelScroll" ? 0 : 1,
            deltaX: 0,
            deltaZ: 0,
            preventDefault: function() {
                originalEvent.preventDefault ?
                    originalEvent.preventDefault() :
                    originalEvent.returnValue = false;
            }
        };

        // calculate deltaY (and deltaX) according to the event
        if (support == "mousewheel") {
            event.deltaY = -1 / 40 * originalEvent.wheelDelta;
            // Webkit also support wheelDeltaX
            originalEvent.wheelDeltaX && (event.deltaX = -1 / 40 * originalEvent.wheelDeltaX);
        } else {
            event.deltaY = originalEvent.detail;
        }

        // it's time to fire the callback
        return callback(event);
    }


})();



//
