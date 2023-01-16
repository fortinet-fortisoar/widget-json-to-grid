'use strict';
(function () {
    angular
        .module('cybersponse')
        .controller('editJsonToGrid100Ctrl', editJsonToGrid100Ctrl);

        editJsonToGrid100Ctrl.$inject = ['$scope', '$resource', 'API', '$uibModalInstance', 'config', 'playbookService', 'statusCodeService', 'Field', '$filter'];

    function editJsonToGrid100Ctrl($scope, $resource, API, $uibModalInstance, config, playbookService, statusCodeService, Field, $filter) {
        $scope.cancel = cancel;
        $scope.save = save;
        $scope.config = config;
        if (!$scope.config.actionButtons) {
            $scope.config.actionButtons = [];
        }
        if (!$scope.config.selectedPlaybooksWithoutRecord) {
            $scope.config.selectedPlaybooksWithoutRecord = [];
        }
        if (!$scope.config.selectedPlaybooksWithRecord) {
            $scope.config.selectedPlaybooksWithRecord = [];
        }
        $scope.changedCollection = changedCollection;
        $scope.addButton = addButton;
        $scope.addButtonWithRecord = addButtonWithRecord;
        $scope.addButtonWithoutRecord = addButtonWithoutRecord;
        $scope.removeButton = removeButton;
        $scope.removeButtonWithRecord = removeButtonWithRecord;
        $scope.removeButtonWithoutRecord = removeButtonWithoutRecord;
        $scope.config.selectedPlaybooks = [];

        function changedCollection() {
            $scope.config.selectedPlaybooks = [];
            $scope.config.actionButtons = [];
            $scope.config.selectedPlaybooksWithoutRecord = [];
            $scope.config.selectedPlaybooksWithRecord = [];
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
            $scope.selectedPlaybook = '';
        }

        function addButtonWithoutRecord(playbook) {
            $scope.config.selectedPlaybooksWithoutRecord.push(playbook);
        }

        function addButtonWithRecord(playbook) {
            $scope.config.selectedPlaybooksWithRecord.push(playbook);
        }

        function removeButton(index) {
            $scope.config.actionButtons.splice(index, 1);
        }

        function removeButtonWithRecord(index) {
            $scope.config.selectedPlaybooksWithRecord.splice(index, 1);
        }

        function removeButtonWithoutRecord(index) {
            $scope.config.selectedPlaybooksWithoutRecord.splice(index, 1);
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
            if (config.playbookCollection) {
                getCollectionPlaybooks();
            }
        }
        _init();

    }
})();
