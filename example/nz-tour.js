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
                    color: 'rgba(0,0,0,.7)'
                },
                dark: false,
                container: 'body',
                scrollBox: 'body',
                previousText: 'Previous',
                nextText: 'Next',
                finishText: 'Finish',
                animationDuration: 400,
            },
            current: false,
            container: false,
            box: false,

            // Methods
            start: start,
            stop: stop,
            pause: pause,
            next: next,
            previous: previous,
            gotoStep: gotoStep,

            //Utils
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
            return toggleElements(false)
                .then(abort);
        }

        function pause() {
            if (service.current) {
                hide();
            }
            return;
        }

        function next(skipAfter) {
            if (!service.current) {
                service.current.reject();
            }

            return doAfter()
                .then(checkHasNext)
                .then(queueNext)
                .then(doStep);
        }

        function previous() {
            var d = $q.defer();
            if (service.current.step > 0) {
                service.current.step--;
                return doStep();
            }
            d.reject();
            return d.promise;
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
                angular.element(tour.config.container).append(service.box);
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
                $timeout.cancel(timeout);
                timeout = $timeout(later, wait);
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

                var container = angular.element($scope.current.tour.config.container),
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
                    actions = el.find('#nzTour-actions'),
                    previous = el.find('#nzTour-previous'),
                    next = el.find('#nzTour-next'),
                    scrolling = false,
                    margin = 15,
                    vMargin = margin + 'px 0',
                    hMargin = '0 ' + margin + 'px';

                // Mask Events?
                masks.all.css('pointer-events', $scope.current.tour.config.mask.clickThrough ? 'none' : 'all');

                // Dark Box?
                if ($scope.current.tour.config.dark) {
                    box.addClass('dark-box');
                    margin = 7;
                }

                wrap.add(box).add(tip).css('transition', 'all ' + $scope.current.tour.config.animationDuration + 'ms ease');
                masks.top.add(masks.right).add(masks.bottom).add(masks.left).css({
                    'transition': 'all ' + $scope.current.tour.config.animationDuration + 'ms ease',
                    'background-color': $scope.current.tour.config.mask.color
                });

                $scope.$on('step', updateStep);

                // Scroll and Resize Tracking
                var onWindowScrollDebounced = $scope.debounce(onWindowScroll, 100);
                $scope.$on('remove', function() {
                    angular.element($window).off('resize', onWindowScrollDebounced);
                    scrollBox.off('scroll', onWindowScrollDebounced);
                });
                angular.element($window).on('resize', onWindowScrollDebounced);
                scrollBox.on('scroll', onWindowScrollDebounced);

                $scope.tryStop = function() {
                    if ($scope.current.tour.config.mask.clickExit) {
                        $scope.stop();
                    }
                };









                function onWindowScroll() {
                    if (scrolling) {
                        return;
                    }
                    if ($scope.view) {
                        updateStep(null, $scope.view.step);
                    }
                }

                function updateStep(e, step) {
                    $scope.view = {
                        step: step,
                        length: $scope.current.tour.steps.length,
                        content: $scope.current.tour.steps[step].content,
                        previousText: $scope.current.tour.config.previousText,
                        nextText: step == $scope.current.tour.steps.length - 1 ? $scope.current.tour.config.finishText : $scope.current.tour.config.nextText
                    };
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

                    if (isVisible(element)) {
                        d.resolve(element);
                    } else {

                        return doScroll(element);
                    }

                    d.resolve(element);
                    return d.promise;

                    function isVisible(el) {

                        var windowHeight = $(window).height();
                        var boxHeight = windowHeight < scrollBox.height() ? windowHeight : scrollBoxHeight;

                        var viewTop = scrollBox.scrollTop();
                        var viewBottom = viewTop + boxHeight;

                        var elTop = el.offset().top - scrollBox.offset().top + viewTop;
                        var elBottom = elTop + el.height();

                        console.log(elBottom, viewBottom, elTop, viewTop);

                        // Is element to large to fit?
                        if (el.height() > boxHeight) {
                            // Is any part visible?
                            return ((elBottom >= viewBottom) || (elTop <= viewTop));
                        }

                        console.log(((elBottom <= viewBottom) && (elTop >= viewTop)));

                        return ((elBottom <= viewBottom) && (elTop >= viewTop));
                    }

                    function doScroll(element) {
                        var d = $q.defer();

                        scrolling = true;

                        angular.element(scrollBox).animate({
                            //scrollTop: element.offset().top - scrollBox.offset().top + scrollBox.scrollTop() - margin
                        }, $scope.current.tour.config.animationDuration, function() {
                            d.resolve(element);
                            scrolling = false;
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
                    var parentElement = angular.element($scope.current.tour.config.container);
                    var windowHeight = $(window).height();
                    var child = {
                        pos: target.offset(),
                        width: target.outerWidth(),
                        height: target.outerHeight(),
                    };
                    var parent = {
                        pos: parentElement.offset(),
                        width: parentElement.width(),
                        height: parentElement.height() + parentElement.offset().top > windowHeight ? windowHeight : parentElement.height(),
                    };
                    var dimensions = {
                        width: child.width,
                        height: child.height,
                        top: child.pos.top - parent.pos.top,
                        left: child.pos.left - parent.pos.left,
                        bottom: parent.height - child.pos.top - child.height,
                        right: parent.width - child.pos.left - child.width,
                    };
                    return dimensions;
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
