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
            throttle: throttle
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
                    return false;
                })
                .then(toggleElements)
                .then(abort);
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
                .then(queueNext)
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
                service.current.step = i - 2;
                return doStep(true);
            }
            d.reject();
            return d.promise;
        }





        // Internals

        function startTour(tour) {

            tour.config = angular.extendDeep({}, service.config, tour.config);

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
                $timeout(function() {
                    service.box.removeClass('hidden');
                }, 10);
                d.resolve();
            } else {
                service.box.addClass('hidden');
                $timeout(function() {
                    service.box.remove();
                    service.$broadcast('remove');
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

        function queueNext() {
            var d = $q.defer();
            service.current.step++;
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

        function abort() {
            service.current.promise.reject();
            service.current = false;
            return true;
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

                var w = angular.element(window),
                    scrollBox = angular.element($scope.current.tour.config.scrollBox),
                    masks = {
                        all: el.find('.nzTour-masks'),
                        top: el.find('.nzTour-masks .top'),
                        right: el.find('.nzTour-masks .right'),
                        bottom: el.find('.nzTour-masks .bottom'),
                        left: el.find('.nzTour-masks .left'),
                    },
                    wrap = el.find('#nzTour-box-wrap'),
                    box = el.find('#nzTour-box'),
                    tip = el.find('#nzTour-tip'),
                    step = el.find('#nzTour-step'),
                    close = el.find('#nzTour-close'),
                    content = el.find('#nzTour-content'),
                    innerContent = el.find('#nzTour-inner-content'),
                    actions = el.find('#nzTour-actions'),
                    previous = el.find('#nzTour-previous'),
                    next = el.find('#nzTour-next'),
                    seeking = false,
                    scrolling = false,
                    margin = 15,
                    vMargin = margin + 'px 0',
                    hMargin = '0 ' + margin + 'px',
                    maxHeight = 120,
                    maxWidth = 250,
                    maskTransitions = true,
                    scrollDimensions = {},
                    currentElement = false;

                // Turn on Transitions
                toggleMaskTransitions(true);
                toggleBoxTransitions(true);

                // Mask Events?
                masks.all.css('pointer-events', $scope.current.tour.config.mask.clickThrough ? 'none' : 'all');

                // Dark Box?
                if ($scope.current.tour.config.dark) {
                    box.addClass('dark-box');
                    margin = 7;
                }

                // Mask Background Color
                masks.top.add(masks.right).add(masks.bottom).add(masks.left).css({
                    'background-color': $scope.current.tour.config.mask.color
                });

                // Mask Scrollthrough disabled?
                if ($scope.current.tour.config.mask.scrollThrough === false) {
                    window.addWheelListener(masks[0], stopMaskScroll);
                }

                // Step Update Listener
                $scope.$on('step', updateStep);

                // Thottle for 60fps
                var onWindowScrollDebounced = $scope.throttle(onWindowScroll, 16.666);
                // Bindings
                w.bind('resize scroll', onWindowScrollDebounced);
                w.bind('keydown', keyDown);
                window.addWheelListener(window, onWindowScrollDebounced);
                window.addWheelListener(content[0], onBoxScroll);
                // Event Cleanup
                $scope.$on('remove', function() {
                    w.unbind('resize scroll', onWindowScrollDebounced);
                    w.unbind('keydown', keyDown);
                    window.removeWheelListener(content[0], onBoxScroll);

                    if ($scope.current.tour.config.mask.scrollThrough === false) {
                        window.removeWheelListener(masks[0], stopMaskScroll);
                    }
                });

                $scope.tryStop = function() {
                    if ($scope.current.tour.config.mask.clickExit) {
                        $scope.stop();
                    }
                };




                // Event Functions

                function keyDown(e) {
                    switch (e.which) {
                        case 37:
                            $scope.previous();
                            return;
                        case 39:
                            $scope.next();
                            return;
                        case 27:
                            $scope.stop();
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
                    var group = masks.top.add(masks.right).add(masks.bottom).add(masks.left);
                    if (state) {
                        group.css('transition', 'all ' + $scope.current.tour.config.animationDuration + 'ms ease');
                    } else {
                        group.css('transition', 'all 0');
                    }
                }

                function toggleBoxTransitions(state) {
                    var group = wrap.add(box).add(tip);
                    if (state) {
                        group.css('transition', 'all ' + $scope.current.tour.config.animationDuration + 'ms ease');
                    } else {
                        group.css('transition', 'all 0');
                    }
                }

                function onWindowScroll() {
                    if (seeking) {
                        return;
                    }

                    scrolling = true;

                    if (maskTransitions) {
                        toggleMaskTransitions(false);
                    }
                    updateBox($scope.view.step);
                }

                function onBoxScroll(e) {
                    var delta;
                    if (e.type == 'DOMMouseScroll') {
                        delta = e.detail * -40;
                    } else {
                        delta = e.wheelDelta;
                    }
                    var up = delta > 0;
                    var scrollTop = content.scrollTop();


                    if (up && !scrollTop) {
                        return prevent(e);
                    }
                    if (!up && (innerContent.height() - content.height() == scrollTop)) {
                        return prevent(e);
                    }

                    function prevent(e) {
                        e.stopPropagation(e);
                        e.preventDefault(e);
                        e.returnValue = false;
                        return false;
                    }
                }

                function updateStep(e, step) {

                    currentElement = false;

                    $scope.view = {
                        step: step,
                        length: $scope.current.tour.steps.length,
                        previousText: $scope.current.tour.config.previousText,
                        nextText: step == $scope.current.tour.steps.length - 1 ? $scope.current.tour.config.finishText : $scope.current.tour.config.nextText
                    };
                    //Don't mess around with angular sanitize.  Keep it simple.
                    innerContent.html($scope.current.tour.steps[step].content);
                    // Scroll Back to the top
                    content.scrollTop(0);

                    // Update Box with transitions
                    toggleMaskTransitions(true);
                    scrolling = seeking = false;
                    return updateBox(step);
                }

                function updateBox(step) {
                    return findTarget($scope.current.tour.steps[step].target)
                        .then(scrollToTarget)
                        .then(function(dimensions) {
                            seeking = false;
                            return dimensions;
                        })
                        .then(moveToTarget);
                }








                // Internal Functions

                function findTarget(selector) {
                    var d = $q.defer();
                    var target = angular.element(selector);
                    if (!target.length) {
                        d.resolve(false);
                    } else {
                        if (currentElement) {
                            d.resolve(currentElement);
                        } else {
                            currentElement = angular.element(target[0]);
                            d.resolve(currentElement);
                        }
                    }
                    return d.promise;
                }

                function scrollToTarget(element) {
                    var d = $q.defer();

                    if (!element) {
                        d.resolve();
                        return d.promise;
                    }

                    var viewHeight = scrollDimensions.viewHeight = w.height() - scrollBox.offset().top;
                    var boxScrollTop = scrollDimensions.boxScrollTop = scrollBox.scrollTop();
                    var boxScrollBottom = scrollDimensions.boxScrollBottom = boxScrollTop + viewHeight;
                    var elTop = scrollDimensions.elTop = element.offset().top;
                    var elHeight = scrollDimensions.elHeight = element.outerHeight();
                    var elBottom = scrollDimensions.elBottom = elTop + elHeight;

                    var visibility = isVisible(element);

                    if (visibility === true) {
                        d.resolve(element);
                    } else {
                        return doScroll(visibility);
                    }

                    d.resolve(element);
                    return d.promise;

                    function isVisible() {

                        // Is element to large to fit?
                        if (element.outerHeight() > viewHeight - margin * 2) {
                            // Is the element below us?
                            if (elTop > boxScrollTop + viewHeight - maxHeight) {
                                return 'large-below';
                            }
                            // Is the element above us?
                            else if (boxScrollTop > elBottom - maxHeight) {
                                return 'large-above';
                            }
                            // Is any part visible?
                            if (elBottom > boxScrollBottom ||
                                elTop < boxScrollTop) {
                                return 'large-visible';
                            }
                        }

                        if (elTop - margin <= boxScrollTop) {
                            return 'small-above';
                        }

                        if (elBottom + margin >= boxScrollTop + viewHeight) {
                            return 'small-below';
                        }

                        return true;
                    }

                    function doScroll(state) {
                        var d = $q.defer();

                        var scroll;

                        // Is Element to Large to fit?
                        if (state.indexOf('large') > -1) {
                            // Is the element below us?
                            if (state == 'large-below') {
                                scroll = elTop - viewHeight + maxHeight + margin;
                            }
                            // Is the element above us?
                            else if (state == 'large-above') {
                                scroll = elTop + elHeight - maxHeight - margin;
                            }
                        } else {
                            // Is the element below us?
                            if (state == 'small-below') {
                                scroll = elTop - viewHeight + elHeight + margin;
                            } else {
                                scroll = elTop - margin;
                            }
                        }

                        seeking = true;

                        scrollBox.animate({
                                scrollTop: scroll
                            }, scrolling ? 0 : $scope.current.tour.config.animationDuration,
                            function() {
                                d.resolve(element);
                                scrolling = false;
                                toggleMaskTransitions(true);
                            });

                        return d.promise;
                    }
                }

                function moveToTarget(element) {
                    var d = $q.defer();

                    if (!element) {
                        moveBox();
                        moveMasks();
                        return;
                    }

                    var dimensions = getDimensions(element);

                    moveBox(dimensions);
                    moveMasks(dimensions);

                    $timeout(function() {
                        d.resolve();
                    }, $scope.current.tour.config.animationDuration);

                    return d.promise;
                }

                function getDimensions(target) {
                    var child = {
                        top: target.offset().top - scrollBox.scrollTop() + scrollBox.offset().top,
                        left: target.offset().left - scrollBox.scrollLeft() + scrollBox.offset().left,
                        width: target.outerWidth(),
                        height: target.outerHeight(),
                    };
                    var parent = {
                        width: w.width(),
                        height: w.height() - scrollBox.offset().top,
                    };
                    return {
                        width: child.width,
                        height: child.height,
                        top: child.top,
                        left: child.left,
                        bottom: parent.height - child.top - child.height,
                        right: parent.width - child.left - child.width,
                    };
                }

                function moveBox(dimensions) {

                    // Default Position?
                    if (!dimensions) {
                        placeCentered();
                        return;
                    }

                    var placementOptions = {
                        bottom: bottom,
                        right: right,
                        left: left,
                        top: top
                    };

                    var hasValidPriorities = true;
                    angular.forEach($scope.current.tour.config.placementPriority, function(priority) {
                        if (!placementOptions[priority]) {
                            hasValidPriorities = false;
                        }
                    });

                    var done = false;

                    angular.forEach(hasValidPriorities ? $scope.current.tour.config.placementPriority : $scope.config.placementPriority, function(priority) {
                        if (!done && placementOptions[priority]()) {
                            done = true;
                        }
                    });

                    if (!done) {
                        placeInside('bottom', 'center');
                        return;
                    }


                    // Placement Priorities

                    function bottom() {
                        // Can Below?
                        if (dimensions.bottom > maxHeight) {
                            // Can Centered?
                            if (dimensions.width > maxWidth) {
                                placeVertically('bottom', 'center');
                                return true;
                            }
                            // Can on the left?
                            if (dimensions.right + dimensions.width > maxWidth) {
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
                        if (dimensions.right > maxWidth) {

                            // Is Element to Large to fit?
                            if (dimensions.height > scrollDimensions.viewHeight) {

                                if (dimensions.top > scrollDimensions.viewHeight / 2) {
                                    placeHorizontally('right', 'top');
                                    return true;
                                }

                                if (dimensions.bottom > scrollDimensions.viewHeight / 2) {
                                    placeHorizontally('right', 'bottom');
                                    return true;
                                }

                                placeHorizontally('right', 'center', true);
                                return true;
                            }

                            // Can Center?
                            if (dimensions.height > maxHeight) {
                                placeHorizontally('right', 'center');
                                return true;
                            }
                            // can Top?
                            if (dimensions.bottom + dimensions.height > maxHeight) {
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
                        if (dimensions.left > maxWidth) {
                            // Is Element to Large to fit?
                            if (dimensions.height > scrollDimensions.viewHeight) {
                                placeHorizontally('left', 'center', true);
                                return true;
                            }
                            // can Center?
                            if (dimensions.height > maxHeight) {
                                placeHorizontally('left', 'center');
                                return true;
                            }
                            // can Top?
                            if (dimensions.bottom + dimensions.height > maxHeight) {
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
                        if (dimensions.top > maxHeight) {
                            // Can Centered?
                            if (dimensions.width > maxWidth) {
                                placeVertically('top', 'center');
                                return true;
                            }
                            // Can on the left?
                            if (dimensions.right + dimensions.width > maxWidth) {
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
                            top = dimensions.top - margin;
                            tipY = 'bottom';
                            translateY = '-100%';
                        } else {
                            top = dimensions.top + dimensions.height + margin;
                            tipY = 'top';
                            translateY = '0';

                        }

                        if (h == 'right') {
                            left = dimensions.left + dimensions.width;
                            translateX = '-100%';
                        } else if (h == 'center') {
                            left = dimensions.left + dimensions.width / 2;
                            translateX = '-50%';
                        } else {
                            left = dimensions.left;
                            translateX = '0';
                        }

                        wrap.css({
                            left: left + 'px',
                            top: top + 'px',
                            transform: 'translate(' + translateX + ',' + translateY + ')',
                        });

                        tip.attr('class', 'vertical ' + tipY + ' ' + h);

                    }

                    function placeHorizontally(h, v, fixed) {

                        var top;
                        var left;
                        var translateX;
                        var translateY;
                        var tipX;

                        if (h == 'right') {
                            left = dimensions.left + dimensions.width + margin;
                            tipX = 'left';
                            translateX = '0';
                        } else {
                            left = dimensions.left - margin;
                            tipX = 'right';
                            translateX = '-100%';
                        }

                        if (fixed) {
                            top = scrollDimensions.viewHeight / 2;
                            translateY = '-50%';
                        } else if (v == 'top') {
                            top = dimensions.top;
                            translateY = '0';
                        } else if (v == 'center') {
                            top = dimensions.top + dimensions.height / 2;
                            translateY = '-50%';
                        } else {
                            top = dimensions.top + dimensions.height;
                            translateY = '-100%';
                        }

                        wrap.css({
                            left: left + 'px',
                            top: top + 'px',
                            transform: 'translate(' + translateX + ',' + translateY + ')',
                        });

                        tip.attr('class', 'horizontal ' + tipX + ' ' + v);

                    }

                    function placeInside(v, h) {

                        var top;
                        var left;
                        var translateY;
                        var translateX;

                        if (v == 'top') {
                            top = dimensions.top + margin;
                            translateY = '0';
                        } else {
                            top = dimensions.top + dimensions.height - margin - (dimensions.bottom < 0 ? -dimensions.bottom : 0);
                            translateY = '-100%';
                        }

                        if (h == 'right') {
                            left = dimensions.left + dimensions.width - margin;
                            translateX = '-100%';
                        } else if (h == 'center') {
                            left = dimensions.left + dimensions.width / 2;
                            translateX = '-50%';
                        } else {
                            left = dimensions.left + margin;
                            translateX = '0';
                        }

                        wrap.css({
                            left: left + 'px',
                            top: top + 'px',
                            transform: 'translate(' + translateX + ',' + translateY + ')',
                        });

                        tip.attr('class', 'hidden');
                    }

                    function placeCentered() {
                        wrap.css({
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            margin: '0'
                        });
                        tip.attr('class', 'hidden');

                    }
                }

                function moveMasks(dimensions) {

                    if (!dimensions) {
                        masks.top.css({
                            height: '0px'
                        });
                        masks.bottom.css({
                            height: '0px'
                        });
                        masks.left.css({
                            top: '0px',
                            height: '100%',
                            width: '0px'
                        });
                        masks.right.css({
                            top: '0px',
                            height: '100%',
                            width: '0px'
                        });
                        return;
                    }

                    masks.top.css({
                        height: dimensions.top + 'px'
                    });
                    masks.bottom.css({
                        height: dimensions.bottom + 'px'
                    });
                    masks.left.css({
                        top: dimensions.top + 'px',
                        height: dimensions.height + 'px',
                        width: dimensions.left + 'px'
                    });
                    masks.right.css({
                        top: dimensions.top + 'px',
                        height: dimensions.height + 'px',
                        width: dimensions.right + 'px'
                    });
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
    } else {
        _addEventListener = "attachEvent";
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

    function _addWheelListener(elem, eventName, callback, useCapture) {
        elem[_addEventListener](prefix + eventName, support == "wheel" ? callback : function(originalEvent) {
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

        }, useCapture || false);
    }


})();



//
