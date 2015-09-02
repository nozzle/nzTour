(function() {
    var module = angular.module('demo', ['nzTour']);

    module.controller('mainController', function($scope, $q, nzTour) {

        var tour = window.tour = {
            config: {
                //dark: true,
            },
            steps: [{
                target: '#features',
                content: "Let's take a look at some features!"
            }, {
                target: '#feature1',
                content: "No matter the browser size, I'm always in the right spot."
            }, {
                target: '#feature2',
                content: "No more defining the position for every step! Try resizing your browser..."
            }, {
                target: '#start-demo',
                content: "I even know when to step aside when your browser gets too short :)"
            }, {
                target: '#feature3',
                content: "Promises are passed around and resolved like candy. Yes, that means asyncronous hooks for tour progression!"
            }, {
                target: '#feature4',
                content: "Unlike intro.js, ng-joyride, and others, I WON'T relayer your DOM, shuffle your z-indexes or otherwise F up your perfectly architected UI."
            }, {
                target: '#vader',
                content: "Luke, come to the dark side...",
                before: function() {
                    var d = $q.defer();
                    angular.element('#vader').css('opacity', '1');
                    angular.element('#nzTour-box').addClass('dark-box');
                    d.resolve();
                    return d.promise;
                },
                after: function() {
                    var d = $q.defer();
                    angular.element('#vader').css('opacity', '0');
                    angular.element('#nzTour-box').removeClass('dark-box');
                    d.resolve();
                    return d.promise;
                }
            }, {
                target: '#installation',
                content: "Installation is a breeze, and I'm only 4kb gzipped! (14kb non-zipped)"
            }, {
                target: '#usage',
                content: "Tours are simple JSON, as everything should be in life."
            }, {
                target: '#config',
                content: "Customization is a snap! These are my defaults which you can override globally or per tour."
            }, {
                target: '#api',
                content: "Easy peezy."
            }, {
                target: '#promises',
                content: "Built in promises make angular awesome, and now your tours can be just as powerful!"
            }, {
                target: '#forkme_banner',
                content: "I'll let you take it from here. <h4 style='text-align:right'><strong><3 <a href='http://github.com/nozzle'>Nozzle</a></h4> "
            }]
        };

        $scope.start = function() {
            nzTour.start(tour);
        };

    });

})();
