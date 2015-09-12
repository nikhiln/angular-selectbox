/**
 * Author: Milica Kadic
 * Customized Version Author: Nikhil N
 * Date: 09/12/15
 * Time: 6:32 PM
 */
'use strict';

angular.module('selectbox', [])
    .filter('contains', [function() {
        return function(array, element) {
            if(array && element)
                return array.indexOf(element) !== -1;
            else
                return -1;

        };
    }])
    .service('SelectBox', [function() {
        return {
            counter: 0,
            init: function() {
                this.counter += 1;
            }
        };
    }])
    .controller('SelectBoxCtrl', ['$scope', '$document', '$element', 'SelectBox', '$analytics', function($scope, $document, $element, SelectBox, $analytics) {

        SelectBox.init();

        $scope.view = {};
        $scope.view.show = false;
        $scope.view.tabindex = SelectBox.counter;
        $scope.view.instanceId = 'inst-' + Date.now();

        $scope.analytics = {};
        /**
         * Check if clicked outside the currently active select box
         *
         * @param e
         * @returns {boolean}
         */
        var clickHandler = function(e) {

            var $element = angular.element(e.target);
            var targetId = $element.attr('id');
            var isMulti = $scope.multi && typeof targetId === 'undefined' && $element.hasClass('mad-selectbox-item');

            if ($scope.view.instanceId === targetId || isMulti) {
                return false;
            }

            $scope.view.show = false;

            $scope.$apply();

            unbindEvents();
        };

        /**
         * Handle keyboard key press
         * - if enter or space do the selection of the focused item form the list
         * - if down or up key arrow focus the appropriate item from the list
         *
         * @param e
         * @returns {boolean}
         */
        var keyHandler = function(e) {

            // enter | space
            if ([13, 32].indexOf(e.keyCode) !== -1 && typeof $scope.view.focus !== 'undefined') {

                $scope.selectItem($scope.view.focus);

                if (!$scope.multi) {
                    unbindEvents();
                    $scope.view.show = false;
                }

                $scope.$apply();

                return false;
            }

            if ([38, 40].indexOf(e.keyCode) === -1) { return false; }

            var min = 0;
            var max = $scope.list.length - 1;

            $scope.view.focus = (typeof $scope.view.focus === 'undefined') ? -1 : $scope.view.focus;

            // key arrow down
            if (e.keyCode === 40) {
                if ($scope.view.focus === max) {
                    $scope.view.focus = min;
                } else {
                    $scope.view.focus += 1;
                }
            }
            // key arrow up
            if (e.keyCode === 38) {
                if ($scope.view.focus <= min) {
                    $scope.view.focus = max;
                } else {
                    $scope.view.focus -= 1;
                }
            }

            $scope.$apply();

            var $container = $element[0].querySelector('.mad-selectbox-dropdown');
            var $focus = $container.querySelector('.focus');
            var containerHeight = $container.offsetHeight;
            var currentOffset = $focus.offsetHeight * ($scope.view.focus + 1);

            if (currentOffset >= containerHeight) {
                $container.scrollTop = currentOffset;
            } else if (currentOffset <= $container.scrollTop) {
                $container.scrollTop = 0;
            }


        };

        /**
         * Parse provided index in order to form selected object
         */
        var parseSelected = function() {

            if (typeof $scope.list !== 'undefined') {
                if ($scope.multi) {
                    $scope.view.selected = $scope.index;
                } else {
                    $scope.view.selected = $scope.list[$scope.index];
                }
            }

        };

        /**
         * Toggle drop-down list visibility
         *
         */
        $scope.toggleList = function() {

            $scope.view.show = !$scope.view.show;

            if ($scope.view.show) {
                $document.bind('click', clickHandler);
                $element.on('keydown', keyHandler);
            } else {
                unbindEvents();
            }
        };

        /**
         * Select an item and run parent handler if provided
         *
         * @param index
         */
        $scope.selectItem = function(index) {

            if ($scope.multi) {

                var selectedId = $scope.list[index];
                if(typeof($scope.key) != 'undefined')
                    selectedId = $scope.list[index][$scope.key];

                var selectedIndex = -1;
                if(typeof($scope.view.selected) != 'undefined')
                    selectedIndex = $scope.view.selected.indexOf(selectedId);
                else
                    $scope.view.selected = []

                if (selectedIndex !== -1) {

                    if ($scope.view.selected.length <= parseInt($scope.min, 10)) { return false; }

                    $scope.view.selected.splice(selectedIndex, 1);

                } else {
                    $scope.view.selected.push(selectedId);
                }

                $scope.index = $scope.view.selected;

                $scope.value = $scope.view.selected;

            } else {
                if($scope.list[index][$scope.key]) {
                    $scope.view.selected = $scope.list[index][$scope.key];
                }
                else {
                    $scope.view.selected = $scope.list[index];
                }
                $scope.index = index;
                $scope.value = $scope.view.selected;
            }
            $scope.sendAnalytics();
        };

        /* init parse selected */
        parseSelected();

        /* watch if list is asynchronously loaded */
        $scope.$watch('list.length', function(n, o) {
            if (n !== o) {
                parseSelected();
            }
        });

        /* watch if selected index has been changed */
        $scope.$watch('index', function(n, o) {
            if (n !== o) {
                parseSelected();
                // we only call the handler function after the index was updated:
                // (modified by @paulovelho)
                $scope.handler();
            }
        });

        /* watch if selected is specified */
        $scope.$watch('selected', function(n, o) {
            if(typeof(n) != 'undefined') {
                for(var index=0; index<$scope.list.length;index++) {
                    if($scope.key && $scope.list[index][$scope.key] == $scope.selected ) {
                        $scope.selectItem(index);
                    }
                    else if($scope.list[index] == $scope.selected) {
                        $scope.selectItem(index);
                    }
                }
            }
        });

        /* analytics event */
        $scope.sendAnalytics = function() {
            if($scope.analyticsevent) {
                $analytics.eventTrack($scope.analyticsevent, {  category: $scope.analyticscategory, label: $scope.analyticslabel });
            }
        }


        var unbindEvents = function() {

            $scope.view.focus = -1;
            $document.unbind('click', clickHandler);
            $element.off('keydown', keyHandler);

        };

        $scope.$on('$destroy', function() {
            unbindEvents();
        });

    }])
    .directive('selectbox', [function() {
        return {
            restrict: 'E',
            replace: true,
            scope: {
                list: '=',
                index: '@',
                value: '=ngModel',
                multi: '@',
                title: '@',
                min: '@',
                handler: '&',
                key: '@',
                display: '@',
                name: '@',
                selected: '@',
                analyticson: '@',
                analyticsevent: '@',
                analyticscategory: '@',
                analyticslabel: '@',
                id: '@',
            },
            controller: 'SelectBoxCtrl',
            template: '<div tabindex="{{ view.tabindex }}" class="mad-selectbox" ng-class="{\'mad-selectbox-multi\': multi}">'+
                        '<a href ' +
                            'id="{{ view.instanceId }}"'+
                            'class="mad-selectbox-toggle"'+
                            'ng-click="toggleList()"'+
                            'ng-class="{active: view.show}">'+
                            '<span ng-if="!multi">{{ (view.selected[display] || view.selected.name || view.selected || title || \'Select\') }}</span>' +
                            '<span ng-if="multi" ng-repeat="selval in view.selected track by $index">{{ (selval[display] || selval.name || selval || title || \'Select\') }}, </span>' +
                            '<span ng-if="multi && !view.selected">{{ (title || \'Select\') }}</span>' +
                        '</a>'+
                        '<input class="hide" type="text" name="{{ name }}" value="{{ value }}" data-ng-model="ngModel" data-ng-required="ngRequired" analytics-on="{{ analyticson }}" ' +
                           ' analytics-event="{{ analyticsevent }}" analytics-category="{{ analyticscategory }}" analytics-label="{{ analyticslabel }}" id="{{ id }}" />'+
                        '<ul class="mad-selectbox-dropdown" ng-show="view.show">'+
                            '<li ng-repeat="item in list track by $index"'+
                                'ng-class="{active: multi ? (view.selected | contains:item.id) : ($index === index), focus: ($index === view.focus)}">'+
                                '<a href class="mad-selectbox-item" ng-click="selectItem($index)">{{ item[display] || item.name || item  }}</a>'+
                            '</li>'+
                            '<li class="mad-empty" ng-if="list.length === 0">the list is empty</li>'+
                        '</ul>'+
                      '</div>'
        };
    }]);