'use strict';
(function () {
    angular
        .module('cybersponse')
        .controller('jsonToGrid100Ctrl', jsonToGrid100Ctrl);

        jsonToGrid100Ctrl.$inject = ['$scope', '$resource', 'API', 'playbookService', 'config', '$http', '$q', 'toaster', 'Entity', '$filter', 'Modules', '_'];

    function jsonToGrid100Ctrl($scope, $resource, API, playbookService, config, $http, $q, toaster, Entity, $filter, Modules, _) {
        $scope.executeGridPlaybook = executeGridPlaybook;
        $scope.refreshGridData = refreshGridData;
        var selectButtons = [];
        var buttons = [];
      
        function loadGriOptions(){
            setGridOptions();
            var playbookIds = _.pluck(_.union($scope.config.selectedPlaybooksWithRecord, $scope.config.selectedPlaybooksWithoutRecord),'uuid');
            var params = {
                module: 'workflows',
                'uuid$in': playbookIds.join('|'),
                $relationships: true,
                $export: true
            };
            Modules.get(params).$promise.then(function(result){
              createGridButtons(result['hydra:member']);
            });
        }

      function createGridButtons(playbooks){
            angular.forEach(playbooks, function(playbook, index){
                var triggerStep = _.find(playbook.steps, function (item) { return item.uuid === $filter('getEndPathName')(playbook.triggerStep);});
                var buttonText = triggerStep.arguments.title;
                var button = {
                    id: 'btn-pb-with-record_' + index,
                    text: buttonText || playbook.name,
                    onClick: function () {
                        executeGridPlaybook(playbook.uuid, true);
                    },
                    class: 'btn-primary margin-right-sm',
                    disabled: false,
                    hide: false
                };
             
                var  playbookButtonWithoutRecordObject = _.find($scope.config.selectedPlaybooksWithoutRecord, function (item) { return item.uuid === playbook.uuid;});
                var  playbookButtonWithRecordObject = _.find($scope.config.selectedPlaybooksWithRecord, function (item) { return item.uuid === playbook.uuid;});

                if(playbookButtonWithoutRecordObject){
                  button.iconClass = playbookButtonWithoutRecordObject.icon || 'icon icon-execute';
                  buttons.push(button);
                  $scope.gridOptions.csOptions.buttons = buttons;
                }
              
                if(playbookButtonWithRecordObject){
                  button.iconClass = playbookButtonWithRecordObject.icon || 'icon icon-execute';
                  selectButtons.push(button);	
                  $scope.gridOptions.csOptions.selectButtons = selectButtons;
                }
                
            });
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
                    selectButtons: selectButtons,
                    noResultsMessage: 'No change requests available.',
                },
                expandableRowTemplate: 'widgets/installed/jsonToGrid-1.0.0/widgetAssets/html/rowExpandable.html',
                enableExpandable: true,
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
         	_init();
        }

        function setGridApi(gridApi) {
            $scope.gridApi = gridApi;
            $scope.gridApi.selection.clearSelectedRows();
        }
        
        $scope.getSelectedRows = function () {
            return $scope.gridApi.selection.getSelectedRows();
        };

      
        function executeGridPlaybook(playbookUUId, executeWithRecord) {
          
           if(executeWithRecord){
             var apiNoTrigger = API.MANUAL_TRIGGER + playbookUUId;
             var selectedRows = $scope.getSelectedRows();
             var env = {
               'request':{
                 'data':{
                   'records': selectedRows
                 }
               }
             };
             $resource(apiNoTrigger).save(env).$promise.then(function() {
             });
             $scope.gridApi.selection.clearSelectedRows();
           } else{
              $resource(API.BASE + API.WORKFLOWS + playbookUUId).get({ '$relationships': true }).$promise.then(function (playbook) {
                var triggerStep = playbookService.getTriggerStep(playbook);
                var entity = new Entity(triggerStep.arguments.resources[0]);
                entity.loadFields().then(function () {
                    playbookService.triggerPlaybookAction(playbook, $scope.getSelectedRows, $scope, true, entity);
                    $scope.gridApi.selection.clearSelectedRows();
                });
            });
           }
        }

        function _init() {
            loadGriOptions();
            triggerPlaybook($scope.config.actionButtons[0].uuid);
        }

        function triggerPlaybook(uuid) {
          var defer = $q.defer();
            var playbookQuery = {
                '$limit': 30,
                '$relationships': true
            };
            $resource(API.BASE + API.WORKFLOWS + uuid).get(playbookQuery).$promise.then(function (playbook) {
                getTriggeredTaskID(playbook);
            }).finally(function () {
              defer.resolve();
            });
          return defer.promise;
        }

        function getTriggeredTaskID(selectedPlaybook) {
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
            });
            return defer.promise;
        }

        function _showGrid(workflowTableResult) {
            setGridOptions();
            $scope.gridOptions.data = workflowTableResult;
        }
        _init();
    }
})();