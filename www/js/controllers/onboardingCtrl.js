angular.module('starter').controller('OnboardingCtrl', function($scope, $state, $ionicSlideBoxDelegate, $ionicLoading, $rootScope, $stateParams, qmService) {
    if(!$rootScope.appSettings){$rootScope.appSettings = window.config.appSettings;}
    $scope.$on('$ionicView.beforeEnter', function(e) {
        console.debug('OnboardingCtrl beforeEnter in state ' + $state.current.name);
        $rootScope.hideNavigationMenu = true;
        if(qmService.sendToLoginIfNecessaryAndComeBack('app.onboarding')){ return; }
        qmService.setupOnboardingPages();
        qmService.hideLoader();
        $rootScope.hideNavigationMenu = true;
        $scope.circlePage = $rootScope.appSettings.appDesign.onboarding.active[0];
    });
    $scope.$on('$ionicView.afterEnter', function(){
        console.debug('OnboardingCtrl afterEnter in state ' + $state.current.name);
        qmService.getConnectorsDeferred(); // Make sure they're ready in advance
    });
    var removeImportPage = function () {
        $rootScope.appSettings.appDesign.onboarding.active = $rootScope.appSettings.appDesign.onboarding.active.filter(function( obj ) {return obj.id.indexOf('import') === -1;});
        if(!$rootScope.appSettings.designMode){qmService.setLocalStorageItem('onboardingPages', JSON.stringify($rootScope.appSettings.appDesign.onboarding.active));}
        $scope.circlePage = $rootScope.appSettings.appDesign.onboarding.active[0];
    };
    $scope.onboardingGoToImportPage = function () {
        $rootScope.hideHomeButton = true;
        $rootScope.hideMenuButton = true;
        removeImportPage();
        $scope.circlePage = $rootScope.appSettings.appDesign.onboarding.active[0];
        $scope.circlePage.nextPageButtonText = "Done connecting data sources";
        qmService.goToState('app.import');
    };
    $scope.goToUpgradePage = function () {
        $rootScope.backButtonState = 'app.onboarding';
        qmService.goToState('app.upgrade');
    };
    $scope.skipOnboarding = function () {
        $rootScope.hideMenuButton = false;
        window.localStorage.onboarded = true;
        qmService.goToState(config.appSettings.appDesign.defaultState);
    };
    $scope.goToReminderSearchFromOnboarding = function() {
        $rootScope.hideHomeButton = true;
        $rootScope.hideMenuButton = true;
        if(!$rootScope.user){
            $rootScope.appSettings.appDesign.onboarding.active = null;
            qmService.deleteItemFromLocalStorage('onboardingPages');
            qmService.goToState('app.onboarding');
            return;
        }
        $scope.goToReminderSearch($scope.circlePage.variableCategoryName);
    };
    $scope.enableLocationTracking = function (event) {
        $scope.trackLocationChange(event, true);
        $scope.hideOnboardingPage();
    };
    $scope.connectWeatherOnboarding = function (event) {
        qmService.connectConnectorWithParamsDeferred({}, 'worldweatheronline');
        $scope.hideOnboardingPage();
    };
    $scope.doneOnboarding = function () {
        qmService.goToState('app.remindersInbox');
        $rootScope.hideMenuButton = false;
        window.localStorage.onboarded = true;
        qmService.deleteItemFromLocalStorage('onboardingPages');
    };
    $scope.hideOnboardingPage = function () {
        $rootScope.appSettings.appDesign.onboarding.active = $rootScope.appSettings.appDesign.onboarding.active.filter(function( obj ) {return obj.id !== $rootScope.appSettings.appDesign.onboarding.active[0].id;});
        qmService.setLocalStorageItem('onboardingPages', JSON.stringify($rootScope.appSettings.appDesign.onboarding.active));
        $scope.circlePage = $rootScope.appSettings.appDesign.onboarding.active[0];
        if(!$rootScope.appSettings.appDesign.onboarding.active || $rootScope.appSettings.appDesign.onboarding.active.length === 0){
            $rootScope.hideMenuButton = false;
            qmService.goToState(config.appSettings.appDesign.defaultState);
        } else {
            $rootScope.hideMenuButton = true;
        }
    };
    $scope.goToReminderSearch = function(variableCategoryName) {
        qmService.goToState('app.reminderSearch',
            {
                variableCategoryName : variableCategoryName,
                fromUrl: window.location.href,
                hideNavigationMenu: $rootScope.hideNavigationMenu,
                skipReminderSettingsIfPossible: true,
                doneState: $state.current.name
            });
    };
});
