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
                scrollBox: 'body',
                previousText: 'Previous',
                nextText: 'Next',
                finishText: 'Finish',
                animationDuration: 400,
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
            return toggleElements(false)
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

            console.log(tour);

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
                '           <div id="nzTour-inner-content">{{view.content}}</div>',
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
                    hMargin = '0 ' + margin + 'px';

                // Turn on Transitions
                toggleTransitions(true);

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
                    masks.all.bind('DOMMouseScroll mousewheel', stopMaskScroll);
                }

                // Step Update Listener
                $scope.$on('step', updateStep);

                // Thottle for 60fps
                var onWindowScrollDebounced = $scope.throttle(onWindowScroll, 14);
                // Bindings
                angular.element($window).bind('resize DOMMouseScroll mousewheel', onWindowScrollDebounced);
                content.bind('DOMMouseScroll mousewheel', onBoxScroll);
                // Event Cleanup
                $scope.$on('remove', function() {
                    angular.element($window).unbind('resize DOMMouseScroll mousewheel', onWindowScrollDebounced);
                    content.unbind('DOMMouseScroll mousewheel', onBoxScroll);

                    if ($scope.current.tour.config.mask.scrollThrough === false) {
                        masks.all.unbind('DOMMouseScroll mousewheel', stopMaskScroll);
                    }
                });

                $scope.tryStop = function() {
                    if ($scope.current.tour.config.mask.clickExit) {
                        $scope.stop();
                    }
                };





                function stopMaskScroll(e) {
                    e.stopPropagation(e);
                    e.preventDefault(e);
                    e.returnValue = false;
                    return false;
                }

                function toggleTransitions(state) {
                    var group = wrap.add(box).add(tip).add(masks.top).add(masks.right).add(masks.bottom).add(masks.left);
                    if (state) {
                        group.css('transition', 'all ' + $scope.current.tour.config.animationDuration + 'ms ease');
                    } else {
                        group.css('transition', 'none');
                    }
                }

                function onWindowScroll() {
                    if (seeking) {
                        return;
                    }
                    if ($scope.view) {
                        updateStep(null, $scope.view.step, true);
                    }
                }

                function onBoxScroll(e) {
                    var delta = (e.type == 'DOMMouseScroll' ?
                        e.originalEvent.detail * -40 :
                        e.originalEvent.wheelDelta);
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

                function updateStep(e, step, resize) {
                    if (!resize) {
                        $scope.view = {
                            step: step,
                            length: $scope.current.tour.steps.length,
                            previousText: $scope.current.tour.config.previousText,
                            nextText: step == $scope.current.tour.steps.length - 1 ? $scope.current.tour.config.finishText : $scope.current.tour.config.nextText
                        };
                        //Don't mess around with angular sanitize.  Keep it simple.
                        content.html($scope.current.tour.steps[step].content);
                        // Scroll Back to the top
                        content.scrollTop(0);
                    } else {
                        toggleTransitions(false);
                    }
                    return findTarget($scope.current.tour.steps[step].target)
                        .then(scrollToTarget)
                        .then(moveToTarget);
                }

                function findTarget(selector) {
                    var d = $q.defer();
                    var target = angular.element(selector);
                    if (!target.length) {
                        d.resolve(false);
                    } else {
                        d.resolve(angular.element(target[0]));
                    }
                    return d.promise;
                }

                function scrollToTarget(element) {
                    var d = $q.defer();

                    if (!element) {
                        d.resolve();
                        return d.promise;
                    }

                    var viewHeight = w.height() - scrollBox.offset().top;
                    var boxScrollTop = scrollBox.scrollTop();
                    var boxScrollBottom = boxScrollTop + viewHeight;
                    var elTop = element.offset().top;
                    var elHeight = element.outerHeight();
                    var elBottom = elTop + elHeight;

                    if (isVisible(element)) {
                        d.resolve(element);
                    } else {
                        return doScroll(element);
                    }

                    d.resolve(element);
                    return d.promise;

                    function isVisible() {

                        console.log(boxScrollTop, elTop, elBottom, boxScrollBottom);

                        // Is element to large to fit?
                        if (element.outerHeight() > viewHeight) {
                            // Are we above the element?
                            if (elTop > boxScrollTop + viewHeight) {
                                return false;
                            }
                            // Are we too far down?
                            if (boxScrollTop > elBottom) {
                                return false;
                            }
                            // Is any part visible?
                            return elBottom >= boxScrollBottom ||
                                elTop <= boxScrollTop;
                        }

                        return elBottom <= boxScrollBottom &&
                            elTop >= boxScrollTop;
                    }

                    function doScroll() {
                        var d = $q.defer();

                        seeking = true;
                        var scroll;

                        // Is Element to Large to fit?
                        if (elHeight > viewHeight) {
                            // Are we above the element?
                            if (elTop > boxScrollTop + viewHeight) {
                                scroll = elTop - viewHeight / 2;
                            }
                            // Are we below the element?
                            if (boxScrollTop > elBottom) {
                                scroll = elTop + elHeight - viewHeight / 2;
                            }
                        } else {
                            scroll = elTop - margin;
                        }

                        angular.element(scrollBox).animate({
                            scrollTop: scroll
                        }, $scope.current.tour.config.animationDuration, function() {
                            d.resolve(element);
                            seeking = false;
                            toggleTransitions(true);
                        });

                        return d.promise;
                    }
                }

                function moveToTarget(element) {
                    toggleTransitions(true);
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

                    // Can Below?
                    if (dimensions.bottom > 135) {
                        // Can Centered?
                        if (dimensions.width > 250) {
                            placeVertically('bottom', 'center');
                            return;
                        }
                        // Can on the left?
                        if (dimensions.right + dimensions.width > 250) {
                            placeVertically('bottom', 'left');
                            return;
                        }
                        // Right, I guess...
                        placeVertically('bottom', 'right');
                        return;
                    }

                    // Can Right?
                    if (dimensions.right > 250) {
                        // Can Center?
                        if (dimensions.height > 135) {
                            placeHorizontally('right', 'center');
                            return;
                        }
                        // can Top?
                        if (dimensions.bottom + dimensions.height > 135) {
                            placeHorizontally('right', 'top');
                            return;
                        }
                        placeHorizontally('right', 'bottom');
                        return;
                    }
                    // Can Left?
                    if (dimensions.left > 250) {
                        // can Center?
                        if (dimensions.height > 135) {
                            placeHorizontally('left', 'center');
                            return;
                        }
                        // can Top?
                        if (dimensions.bottom + dimensions.height > 135) {
                            placeHorizontally('left', 'top');
                            return;
                        }
                        placeHorizontally('left', 'bottom');
                        return;
                    }

                    // Can Above?
                    if (dimensions.top > 135) {
                        // Can Centered?
                        if (dimensions.width > 250) {
                            placeVertically('top', 'center');
                            return;
                        }
                        // Can on the left?
                        if (dimensions.right + dimensions.width > 250) {
                            placeVertically('top', 'left');
                            return;
                        }
                        // Right, I guess...
                        placeVertically('top', 'right');
                        return;
                    }

                    placeInside('bottom', 'center');
                    return;


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

                        tip.attr('class', tipY + ' ' + h);

                    }

                    function placeHorizontally(h, v) {

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

                        if (v == 'top') {
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

                        tip.attr('class', 'side ' + tipX + ' ' + v);

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

})();



//
