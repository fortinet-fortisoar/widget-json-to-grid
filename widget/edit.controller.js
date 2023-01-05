'use strict';
(function () {
    angular
        .module('cybersponse')
        .controller('editJsonToGrid100DevCtrl', editJsonToGrid100DevCtrl);

        editJsonToGrid100DevCtrl.$inject = ['$scope', '$resource', 'API', '$uibModalInstance', 'config', 'playbookService', 'statusCodeService', 'Field', '$filter'];

    function editJsonToGrid100DevCtrl($scope, $resource, API, $uibModalInstance, config, playbookService, statusCodeService, Field, $filter) {
        $scope.cancel = cancel;
        $scope.save = save;
        $scope.config = config;
        if(!$scope.config.actionButtons){
          $scope.config.actionButtons = [];
        }
        $scope.changedCollection = changedCollection;
        $scope.addButton = addButton;
        $scope.removeButton = removeButton;
		$scope.config.selectedPlaybooks = []; 
      
        function changedCollection() {
			$scope.config.selectedPlaybooks = [];  
          $scope.config.actionButtons = [];
            getCollectionPlaybooks();
        }
      
      function getCollectionPlaybooks() {
        var collectionUUID = $filter('getEndPathName')(config.playbookCollection['@id']);
            var playbookQuery = {
                '$limit': 100,
                '$orderby': 'name',
                'collection': collectionUUID,
                '__selectFields': 'name,description'
            };
            $resource(API.BASE + 'workflows').get(playbookQuery).$promise.then(function (response) {
                //defer.resolve(response);
                $scope.playbookData = response['hydra:member'];
            }, function (error) {
                defer.reject(error);

            });
      }
        function cancel() {
            $uibModalInstance.dismiss('cancel');
        }

        function save() {
            $uibModalInstance.close($scope.config);
        }
		
        function addButton(playbook) {
   $scope.config.actionButtons.push(playbook);
      }
  
      function removeButton(index) {
        $scope.config.actionButtons.splice(index, 1);
      }
      
        function _init() {
            $scope.getWorkflowCollectionsField = new Field({
                'name': 'Workflow Collections',
                'title': 'Workflow Collections',
                'writeable': true,
                'dataSource': {
                    'model': 'workflow_collections',
                    'query': {
                        '$limit': 1000,
                        'sort': [{
                            'field': 'name',
                            'direction': 'asc',
                            '_fieldName': 'name'

                        }],
                        'filters': []
                    }
                },
                'validation': {
                    'required': true
                }
            });
            $scope.getWorkflowCollectionsField.displayTemplate = '{{ name }}';
          if(config.playbookCollection) {
           getCollectionPlaybooks(); 
          }
        }
        _init();

    }
})();