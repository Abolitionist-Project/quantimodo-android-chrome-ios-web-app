angular.module('starter')

	// Controls the History Page of the App.
	.controller('historyAllMeasurementsCtrl', function($scope, $state, $stateParams, $rootScope, $timeout, $ionicActionSheet,
													   authService, measurementService,
													   variableCategoryService, ratingService, localStorageService,
													   qmLocationService, userService, $ionicLoading) {

	    $scope.controller_name = "historyAllMeasurementsCtrl";
        
	    $scope.state = {
	    	offset : 0,
	    	limit : 200,
	    	history : [],
			units : [],
			variableCategories : [],
			hideLoadMoreButton : true,
			showLocationToggle: false,
			noHistory: false
	    };

	    $scope.editMeasurement = function(measurement){
	    	$state.go('app.measurementAdd', {
	    		measurement: measurement,
				fromState: $state.current.name,
				fromUrl: window.location.href
	    	});
	    };

	    $scope.getVariableCategoryByUnit = function(unit){
	    	
	    	if(!unit) {
                return false;
            }
	    	
	    	var variableCategory = $scope.state.variableCategories.filter(function(vc){
	    		return vc.name === unit.category;
	    	})[0];

	    	return variableCategory? variableCategory : false;
	    };


	    var getHistory = function(concat){
			if($scope.state.history.length < 1){
				$scope.state.loading = true;
				//$scope.showLoader('Squirrels retrieving measurements...');
			}
			var params = {
				offset: $scope.state.offset,
				limit: $scope.state.limit,
				sort: "-startTimeEpoch"
			};

			if($stateParams.variableCategoryName){
				params.variableCategoryName = $stateParams.variableCategoryName;
			}

			if($stateParams.variableObject){
				params.variableName = $stateParams.variableObject.name;
			}

	    	measurementService.getHistoryMeasurements(params).then(function(history){
	    		if (concat) {
					$scope.state.history = $scope.state.history.concat(history);
				}
    			else {
					$scope.state.history = history;
				}
				$scope.state.history = ratingService.addInfoAndImagesToMeasurements($scope.state.history);
				$scope.hideLoader();
				if(history.length < 200){
					$scope.state.hideLoadMoreButton = true;
					$scope.state.noHistory = history.length === 0;
				} else {
					$scope.state.hideLoadMoreButton = false;
				}
				//Stop the ion-refresher from spinning
				$scope.$broadcast('scroll.refreshComplete');
				$scope.state.loading = false;
	    	}, function(error){
				Bugsnag.notify(error, JSON.stringify(error), {}, "error");
	    		console.error('error getting measurements' + JSON.stringify(error));
				//Stop the ion-refresher from spinning
				$scope.$broadcast('scroll.refreshComplete');
				$scope.state.loading = false;
				$scope.hideLoader();
	    	});
	    };

	    $scope.getNext = function(){
	    	$scope.state.offset += $scope.state.limit;
	    	getHistory(true);
	    };

		$scope.trackLocationChange = function() {

			console.log($state.current.name + ": " + 'trackLocation', $scope.state.trackLocation);
			$rootScope.user.trackLocation = $scope.state.trackLocation;
			userService.updateUserSettings({trackLocation: $rootScope.user.trackLocation});
			if($scope.state.trackLocation){
				qmLocationService.updateLocationVariablesAndPostMeasurementIfChanged();
			} else {
				console.debug($state.current.name + ": " + "Do not track location");
			}

		};
	    
	    // constructor
	    $scope.init = function(){
			$scope.state.loading = true;
			//$scope.showLoader('Fetching measurements...');
			if (typeof analytics !== 'undefined')  { analytics.trackView("All Measurements Controller"); }
			Bugsnag.context = "historyAll";
			$scope.state.offset = 0;
			if ($stateParams.variableObject){
				$scope.title = $stateParams.variableObject.name + ' History';
			}
			else if (!$stateParams.variableCategoryName || $stateParams.variableCategoryName === "Anything") {
				$scope.title = 'Measurement History';
			}
			else {
				$scope.title = $stateParams.variableCategoryName + ' History';
				$scope.state.showLocationToggle = $stateParams.variableCategoryName === "Location";
			}

			if($rootScope.user){
				$scope.state.trackLocation = $rootScope.user.trackLocation;
			}
			$scope.showHelpInfoPopupIfNecessary();
			variableCategoryService.getVariableCategories()
				.then(function(variableCategories){
					$scope.state.variableCategories = variableCategories;
				}, function(err){
					Bugsnag.notify(err, JSON.stringify(err), {}, "error");
					console.log($state.current.name + ": " + "error getting variable categories", err);
				});
			getHistory();

	    };

        // when view is changed
    	$scope.$on('$ionicView.enter', function(e) {
			console.debug($state.current.name + ": " + "Entering state " + $state.current.name);
    		$scope.init();
    	});


		$scope.showActionSheet = function(measurement, $index) {

			$scope.state.measurement = measurement;
			$scope.state.variableObject = measurement;
			$scope.state.variableObject.id = measurement.variableId;
			$scope.state.variableObject.name = measurement.variableName;
			// Show the action sheet
			var hideSheet = $ionicActionSheet.show({
				buttons: [
					{ text: '<i class="icon ion-edit"></i>Edit Measurement'},
					{ text: '<i class="icon ion-ios-star"></i>Add to Favorites'},
					{ text: '<i class="icon ion-android-notifications-none"></i>Add Reminder'},
					{ text: '<i class="icon ion-arrow-graph-up-right"></i>Visualize'},
					{ text: '<i class="icon ion-ios-list-outline"></i>' + 'History'},
					{ text: '<i class="icon ion-settings"></i>' + 'Variable Settings'},
					{ text: '<i class="icon ion-arrow-up-a"></i>Positive Predictors'},
					{ text: '<i class="icon ion-arrow-down-a"></i>Negative Predictors'}
				],
				cancelText: '<i class="icon ion-ios-close"></i>Cancel',
				cancel: function() {
					console.log($state.current.name + ": " + 'CANCELLED');
				},
				buttonClicked: function(index) {
					console.log($state.current.name + ": " + 'BUTTON CLICKED', index);
					if(index === 0){
						$scope.editMeasurement($scope.state.variableObject);
					}
					if(index === 1){
						$scope.addToFavoritesUsingVariableObject($scope.state.variableObject);
					}
					if(index === 2){
						$state.go('app.reminderAdd',
							{
								variableObject: $scope.state.variableObject,
								fromState: $state.current.name,
								fromUrl: window.location.href
							});
					}
					if (index === 3) {
						$scope.goToChartsPageForVariableObject($scope.state.variableObject);
					}
					if (index === 4) {
						$scope.goToHistoryForVariableObject($scope.state.variableObject);

					}
					if(index === 5){
						$state.go('app.variableSettings',
							{variableName: $scope.state.measurement.variableName});
					}
					if(index === 6){
						$state.go('app.predictors',
							{
								variableObject: $scope.state.variableObject,
								requestParams: {
									effect:  $scope.state.variableObject.name,
									correlationCoefficient: "(gt)0"
								}
							});
					}
					if(index === 7){
						$state.go('app.predictors',
							{
								variableObject: $scope.state.variableObject,
								requestParams: {
									effect:  $scope.state.variableObject.name,
									correlationCoefficient: "(lt)0"
								}
							});
					}

					return true;
				},
			});

			$timeout(function() {
				hideSheet();
			}, 20000);

		};


	});