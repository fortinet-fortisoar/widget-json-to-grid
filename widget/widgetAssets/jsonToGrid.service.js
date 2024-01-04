'use strict';
(function () {
    angular
        .module('fortisoar.marketplace')
        .factory('jsonToGridService', jsonToGridService);

    jsonToGridService.$inject = ['$http', 'API', '$q', '$window', 'toaster', '$uibModal'];

    function jsonToGridService($http, API, $q, $window, toaster, $uibModal) {
        var service = {
            launchStandaloneWidget: launchStandaloneWidget
        };

        return service;

        function launchStandaloneWidget(widgetName, widgetVersion, playbook, executeWithRecord, selectedRows) {
          var defer = $q.defer();
          let windowClass = {
            'Half Width': 'mp-detail-panel-view',
            'Full Width': 'no-animation modal-ingestion',
            'Pop-Up': 'modal no-animaiton'
          };
          let param = {
            name: widgetName,
            version: widgetVersion,
            installed: true
          };
          $http.post(API.BASE + 'widgets/detail', param).then(function (response) {
            if (response.data['hydra:totalItems'] === 0) {
                defer.reject();
                    toaster.error({
                    body: 'Please check if the widget ' + widgetName + '-' + widgetVersion + ' is installed.'
                });
            } else {
                let widegtDef = angular.copy(response.data['hydra:member'][0]);
                    widegtDef.metadata.playbook = playbook;
                    widegtDef.metadata.executeWithRecord = executeWithRecord;
                    widegtDef.metadata.getSelectedRows = selectedRows;
                    defer.resolve(true);
                    var modal = $uibModal.open({
                        animation: false,
                        backdrop: 'static',
                        component: 'standaloneWidgetComponent',
                        windowClass: windowClass[widegtDef.metadata.windowClass] || 'mp-detail-panel-view',
                        resolve: {
                            definition: function () {
                                return widegtDef;
                            }
                        }
                    });
                    modal.result.then(angular.noop);
            } 
          }).catch(function(error){
            defer.reject(error);
            toaster.error({
                body: error
            });
          });
            
          return defer.promise;
        }
    }
})();