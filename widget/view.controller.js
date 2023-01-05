'use strict';
(function () {
    angular
        .module('cybersponse')
        .controller('jsonToGrid100DevCtrl', jsonToGrid100DevCtrl);

        jsonToGrid100DevCtrl.$inject = ['$scope', '$resource', 'API', 'playbookService', 'config', '$http', '$q', 'toaster', 'Entity'];

    function jsonToGrid100DevCtrl($scope, $resource, API, playbookService, config, $http, $q, toaster, Entity) {

        $scope.executeGridPlaybook = executeGridPlaybook;
        $scope.refreshGridData = refreshGridData;
        var selectButtons = [];
        var buttons = [];
        var playbookQuery = {
            "$limit": 30,
            "$relationships": true
        };
        if ($scope.config.selectedPlaybooksWithoutRecord.length > 0) {
            angular.forEach($scope.config.selectedPlaybooksWithoutRecord, function (record, index) {
                $resource(API.BASE + API.WORKFLOWS + record.uuid).get(playbookQuery).$promise.then(function (playbook) {
                    var triggerStep = _.find(playbook.steps, function (item) { return item['@id'] === playbook.triggerStep; });
                    var buttonText = triggerStep.arguments.title;
                    var button = {
                        id: 'btn-pb-without-record_' + index,
                        text: buttonText || record.name,
                        onClick: function () {
                            executeGridPlaybook(record.uuid, false);
                        },
                        class: 'btn-primary margin-right-sm',
                        iconClass: 'icon icon-execute',
                        disabled: false,
                        hide: false
                    };
                    buttons.push(button);
                });
            });
            setGridOptions();
        }

        if ($scope.config.selectedPlaybooksWithRecord.length > 0) {
            angular.forEach($scope.config.selectedPlaybooksWithRecord, function (record, index) {
                $resource(API.BASE + API.WORKFLOWS + record.uuid).get(playbookQuery).$promise.then(function (playbook) {
                    var triggerStep = _.find(playbook.steps, function (item) { return item['@id'] === playbook.triggerStep; });
                    var buttonText = triggerStep.arguments.title;
                    var button = {
                        id: 'btn-pb-with-record_' + index,
                        text: buttonText || record.name,
                        onClick: function () {
                            executeGridPlaybook(record.uuid, true);
                        },
                        class: 'btn-primary margin-right-sm',
                        iconClass: 'icon icon-execute',
                        disabled: false,
                        hide: false
                    };
                    selectButtons.push(button);
                });
            });
            setGridOptions();
        }


        function setGridOptions() {
            $scope.gridOptions = {
                csOptions: {
                    allowDelete: false,
                    allowAdd: false,
                    allowClone: false,
                    showPagination: false,
                    allowGlobalFilter: false,
                    allowCardView: true,
                    viewType: 'staticGrid',
                    onRegisterApi: setGridApi,
                    buttons: buttons,
                    selectButtons: selectButtons
                },
                enableFiltering: false,
                enableSelectAll: true,
                enableRowSelection: false,
                enableRowHeaderSelection: true,
                selectWithCheckboxOnly: true,
                showSelectionCheckbox: true,
                enableColumnResizing: true,
                enableColumnMoving: true,
                useExternalFiltering: true,
                enableGridMenu: false,
                refresh: $scope.refreshGridData
            };
        }

        function refreshGridData() {
            _init(true);
        }

        function setGridApi(gridApi) {
            $scope.gridApi = gridApi;
            $scope.gridApi.selection.clearSelectedRows();
        }

        $scope.getSelectedRows = function () {
            return $scope.gridApi.selection.getSelectedRows();
        };

        function executeGridPlaybook(playbookUUId, executeWithRecord) {
            $resource(API.BASE + API.WORKFLOWS + playbookUUId).get({ '$relationships': true }).$promise.then(function (playbook) {
                var triggerStep = playbookService.getTriggerStep(playbook);
                var entity = new Entity(triggerStep.arguments.resources[0]);
                entity.loadFields().then(function () {
                    playbookService.triggerPlaybookAction(playbook, $scope.getSelectedRows, $scope, true, entity);
                });
            });
        }


        function _init(refreshDataOnly) {
            if (refreshDataOnly) {
                $scope.processing = false;
            } else {
                $scope.processing = true;
            }
            triggerPlaybook($scope.config.actionButtons[0].uuid, refreshDataOnly);
        }

        function triggerPlaybook(uuid, refreshDataOnly) {
            var playbookQuery = {
                "$limit": 30,
                "$relationships": true
            };
            $resource(API.BASE + API.WORKFLOWS + uuid).get(playbookQuery).$promise.then(function (playbook) {
                getTriggeredTaskID(playbook, refreshDataOnly);
            }).finally(function () {
                $scope.processing = false;
            });
        }

        function getTriggeredTaskID(selectedPlaybook, refreshDataOnly) {
            var defer = $q.defer();
            $http.post(API.WORKFLOW + 'workflow/create-start/?format=json&force_debug=true', selectedPlaybook).then(function (result) {
                if (result && result.data && result.data.task_id) {
                    playbookService.checkPlaybookExecutionCompletion([result.data.task_id], function (response) {
                        if (response && (response.status === 'finished' || response.status === 'failed')) {
                            playbookService.getExecutedPlaybookLogData(response.instance_ids).then(function (executionResult) {
                                if (response.status === 'finished') {
                                    $scope.workflowTableResult = executionResult.result.grid_data;
                                    $scope.columnDefs = executionResult.result.grid_columns.columns;
                                    _showGrid($scope.workflowTableResult);
                                }
                                else if (response.status === 'failed') {
                                    toaster.error({
                                        body: executionResult.result['Error message']
                                    });
                                }
                            })

                        }
                    }, function (error) {
                        defer.reject(error);
                    }, $scope);
                }
            }, function (err) {
                defer.reject(err);
            }).finally(function () {
                $scope.processing = false;
            });
            return defer.promise;
        }

        function _showGrid(workflowTableResult) {
            $scope.gridOptions.data = workflowTableResult;
        }
        _init();
    }
})();