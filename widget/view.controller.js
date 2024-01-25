'use strict';
(function () {
  angular
    .module('cybersponse')
    .controller('jsonToGrid110Ctrl', jsonToGrid110Ctrl);

  jsonToGrid110Ctrl.$inject = ['$scope', '$resource', 'API', 'playbookService', '$q', 'toaster', 'Entity', '$filter', 'Modules', '_', 'exportService', 'currentPermissionsService', 'FIXED_MODULE', 'statusCodeService', '$uibModal', 'widgetService'];


  function jsonToGrid110Ctrl($scope, $resource, API, playbookService, $q, toaster, Entity, $filter, Modules, _, exportService, currentPermissionsService, FIXED_MODULE, statusCodeService, $uibModal, widgetService) {
    $scope.executeGridPlaybook = executeGridPlaybook;
    $scope.refreshGridData = refreshGridData;
    var selectButtons = [];
    var buttons = [];

    function loadGriOptions() {
      setGridOptions();
      var playbookIds = _.pluck(_.union($scope.config.selectedPlaybooksWithRecord, $scope.config.selectedPlaybooksWithoutRecord), 'uuid');
      var params = {
        module: 'workflows',
        'uuid$in': playbookIds.join('|'),
        $relationships: true,
        $export: true
      };
      Modules.get(params).$promise.then(function (result) {
        createGridButtons(result['hydra:member']);
      });
    }

    function createGridButtons(playbooks) {
      angular.forEach(playbooks, function (playbook, index) {
        var triggerStep = _.find(playbook.steps, function (item) { return item.uuid === $filter('getEndPathName')(playbook.triggerStep); });
        var buttonText = triggerStep.arguments.title;
        var playbookButtonWithoutRecordObject = _.find($scope.config.selectedPlaybooksWithoutRecord, function (item) { return item.uuid === playbook.uuid; });
        var playbookButtonWithRecordObject = _.find($scope.config.selectedPlaybooksWithRecord, function (item) { return item.uuid === playbook.uuid; });
        var button = {
          id: 'btn-pb-with-record_' + index,
          text: buttonText || playbook.name,
          class: 'btn-primary margin-right-sm',
          disabled: false,
          hide: false
        };

        if (playbookButtonWithoutRecordObject) {
          button.onClick = function () {
            if ($scope.config.showExecutionProgress) {
              var selectedRows = $scope.getSelectedRows();
              var payload = {
                "playbookDetails": playbook,
                "selectedRecord": selectedRows
              };
              widgetService.launchStandaloneWidget($scope.config.widgetName, $scope.config.widgetVersion, null, null, payload).then(function () {
                angular.noop;
              });
              $scope.loadProcessing = false;
              $scope.refreshProcessing = false;
            }
            else {
              executeGridPlaybook(playbook, false);
            }
          },
            button.iconClass = playbookButtonWithoutRecordObject.icon || 'icon icon-execute';
          buttons.push(button);
          $scope.gridOptions.csOptions.buttons = buttons;
        }

        if (playbookButtonWithRecordObject) {
          button.onClick = function () {
            if ($scope.config.showExecutionProgress) {
              var selectedRows = $scope.getSelectedRows();
              var payload = {
                "playbookDetails": playbook,
                "selectedRecord": selectedRows
              };
              widgetService.launchStandaloneWidget($scope.config.widgetName, $scope.config.widgetVersion, null, null, payload).then(function () {
                angular.noop;
              });
              $scope.gridApi.selection.clearSelectedRows();
            }
            else {
              executeGridPlaybook(playbook, true);
            }
          },
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
        expandableRowTemplate: 'widgets/installed/jsonToGrid-1.1.0/widgetAssets/html/rowExpandable.html',
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
      $scope.gridOptions.data = [];
      return triggerPlaybook($scope.config.actionButtons[0].uuid, true);
    }

    function setGridApi(gridApi) {
      $scope.gridApi = gridApi;
    }

    $scope.getSelectedRows = function () {
      return $scope.gridApi.selection.getSelectedRows();
    };


    function executeGridPlaybook(playbook, executeWithRecord) {
      $resource(API.BASE + API.WORKFLOWS + playbook.uuid).get({ '$relationships': true }).$promise.then(function (playbook) {
        var triggerStep = playbookService.getTriggerStep(playbook);
        var entity = new Entity(triggerStep.arguments.resources[0]);
        entity.loadFields().then(function () {
          if (!executeWithRecord) {
            _playbookButtonsExecution(playbook, executeWithRecord, triggerStep, entity);
          } else if (triggerStep.arguments.inputVariables && triggerStep.arguments.inputVariables.length > 0) {
            var modalInstance = $uibModal.open({
              templateUrl: 'widgets/installed/jsonToGrid-1.1.0/widgetAssets/html/inputVariables.html',
              controller: 'InputVariablesCtrl',
              backdrop: 'static',
              resolve: {
                playbook: playbook,
                entity: angular.copy(entity),
                rows: function () {
                  var selectedFields = _.pluck(_.filter(triggerStep.arguments.inputVariables, function (inputVariable) {
                    return inputVariable.useRecordFieldDefault;
                  }), 'moduleField');
                  selectedFields.push('uuid');
                  return exportService.loadRowsForExport($scope.getSelectedRows, entity.name, _.uniq(selectedFields)).then(function (response) {
                    return response || [];
                  });
                }
              }
            });

            modalInstance.result.then(function (result) {
              _playbookButtonsExecution(playbook, executeWithRecord, triggerStep, entity, result);
            });
          } else {
            var result = { inputVariables: {} };
            _playbookButtonsExecution(playbook, executeWithRecord, triggerStep, entity, result);
          }

        });
      });
    }

    function _playbookButtonsExecution(playbook, executeWithRecord, triggerStep, entity, manualTriggerInput) {
      var selectedRows = $scope.getSelectedRows();
      if (executeWithRecord && selectedRows.length > 0) {
        var apiNoTrigger = API.MANUAL_TRIGGER + playbook.uuid;
        var env = {
          'request': {
            'data': {
              'records': selectedRows,
              'singleRecordExecution': true,
              '__resource': triggerStep.arguments.resources[0],
              '__uuid': playbook.uuid
            }
          }
        };
        env = _.extend(env, manualTriggerInput.inputVariables);
        $resource(apiNoTrigger).save(env).$promise.then(function () {
        });
        $scope.gridApi.selection.clearSelectedRows();
      } else {
        $resource(API.BASE + API.WORKFLOWS + playbook.uuid).get({ '$relationships': true }).$promise.then(function (playbook) {
          playbookService.triggerPlaybookAction(playbook, $scope.getSelectedRows, $scope, true, entity);
          $scope.loadProcessing = false;
          $scope.refreshProcessing = false;
        });
      }
    }



    function _init() {
      $scope.loadProcessing = true;
      $scope.refreshProcessing = false;
      loadGriOptions();
      triggerPlaybook($scope.config.actionButtons[0].uuid, false);
    }

    function triggerPlaybook(uuid, refreshGrid) {
      var defer = $q.defer();
      $resource(API.BASE + API.WORKFLOWS + uuid).get({ '$relationships': true }).$promise.then(function (playbook) {
        if (playbook.recordTags.indexOf('SystemWaitForCompletion') === -1) {
          playbook.recordTags.push('SystemWaitForCompletion');
        }
        var triggerStep = playbookService.getTriggerStep(playbook);
        var entity = new Entity(triggerStep.arguments.resources[0]);
        entity.loadFields().then(function () {
          _triggerPlaybookAction(playbook, $scope.getSelectedRows, $scope, true, entity, refreshGrid).then(function () {
            defer.resolve();
          }, function () {
            defer.reject();
          });
          $scope.gridApi.selection.clearSelectedRows();
        });
        defer.resolve();
      }, function () {
        defer.reject();
      });
      return defer.promise;
    }

    function _triggerPlaybookAction(playbook, getSelectedRows, scope, isSync, entity, refreshGrid) {
      var defer = $q.defer();
      var playbookExeOption = {};
      var triggerStep = playbookService.getTriggerStep(playbook);
      if (angular.isDefined(triggerStep.arguments.singleRecordExecution)) {
        playbookExeOption = {
          'singleRecordExecution': triggerStep.arguments.singleRecordExecution
        };
      }
      if (!triggerStep.arguments.inputVariables || !triggerStep.arguments.inputVariables.length) {
        _sendPost(triggerStep.arguments.route, playbook, playbookExeOption, getSelectedRows, scope, isSync, entity.name, refreshGrid).then(function () {
          defer.resolve();
        }, function () {
          defer.reject();
        });
        return defer.promise;
      }

      var modalInstance = $uibModal.open({
        templateUrl: 'widgets/installed/jsonToGrid-1.1.0/widgetAssets/html/inputVariables.html',
        controller: 'InputVariablesCtrl',
        backdrop: 'static',
        resolve: {
          playbook: playbook,
          entity: angular.copy(entity),
          rows: function () {
            var selectedFields = _.pluck(_.filter(triggerStep.arguments.inputVariables, function (inputVariable) {
              return inputVariable.useRecordFieldDefault;
            }), 'moduleField');
            selectedFields.push('uuid');
            return exportService.loadRowsForExport(getSelectedRows(), entity.name, _.uniq(selectedFields)).then(function (response) {
              return response || [];
            });
          }
        }
      });

      modalInstance.result.then(function (result) {
        var inputVariables = angular.extend(result.inputVariables, playbookExeOption);
        _sendPost(triggerStep.arguments.route, playbook, inputVariables, getSelectedRows, scope, isSync, entity.name, refreshGrid).then(function () {
          defer.resolve();
        }, function () {
          defer.reject();
        });
      });
      return defer.promise;
    }


    function _sendPost(route, playbook, inputVariables, getSelectedRows, scope, isSync, moduleName, refreshGrid) {
      var defer = $q.defer();
      $scope.loadProcessing = !refreshGrid;
      $scope.refreshProcessing = refreshGrid;
      var workflowsReadPermission = currentPermissionsService.availablePermission(FIXED_MODULE.PLAYBOOK, 'read');
      var data = getSelectedRows();
      var records = [];
      angular.forEach(data, function (record) {
        records.push(record['@id']);
      });
      var inputData = inputVariables;
      inputData.__resource = moduleName;
      inputData.__uuid = $filter('getEndPathName')(playbook['@id']);
      inputData.records = records;
      if (scope.parentRecordId) {
        inputData.__parentRecordId = scope.parentRecordId;
      }
      var url = API.ACTION_TRIGGER + route;
      if (isSync && workflowsReadPermission && playbook.recordTags.includes('SystemWaitForCompletion')) {
        url = API.ACTION_TRIGGER + route + '?force_debug=true';
      }
      $resource(url).save(inputData).$promise.then(function (response) {
        /* jshint camelcase: false */
        var taskIds = [];
        if (response.task_ids && response.task_ids.length > 0) {
          taskIds = response.task_ids;
        } else if (response.task_id) {
          taskIds.push(response.task_id);
        }
        var recordsText = records.length === 1 ? 'record' : 'records';
        if (isSync && workflowsReadPermission) {
          playbookService.checkPlaybookExecutionCompletion(taskIds, function (result) {
            playbookService.getExecutedPlaybookLogData(result.instance_ids).then(function (data) {
              if (data.status) {
                if (data.status === 'finished') {
                  $scope.workflowTableResult = data.result.grid_data;
                  $scope.columnDefs = data.result.grid_columns.columns;
                  _showGrid($scope.workflowTableResult);
                  $scope.loadProcessing = false;
                  $scope.refreshProcessing = false;
                  defer.resolve();
                }
              }
            }, statusCodeService);
          }, function () {
            toaster.warning({
              body: 'Not able to fetch the status of the triggered playbook "' + playbook.name + '" or the playbook is taking too long to complete. Kindly check the Playbook Execution Log for more details.'
            });
            $scope.loadProcessing = false;
            $scope.refreshProcessing = false;
            defer.reject();
          }, scope);
        } else {
          var nextText = records.length > 0 ? '" on ' + records.length + ' ' + recordsText : '"';
          toaster.success({
            body: 'Triggered action "' + playbook.name + nextText + '.'
          });
          defer.resolve();
          $scope.loadProcessing = false;
          $scope.refreshProcessing = false;
          scope.$emit('playbookActions:triggerCompleted');
        }
      });
      return defer.promise;
    }

    function _showGrid(workflowTableResult) {
      $scope.gridOptions.data = workflowTableResult;
    }
    _init();
  }
})();