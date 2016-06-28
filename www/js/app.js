// Database
//var db = null;

angular.module('starter',
    [
        'ionic',
        'oc.lazyLoad',
        'highcharts-ng',
        'ngCordova',
        'ionic-datepicker',
        'ionic-timepicker',
        'ngIOS9UIWebViewPatch',
        'ng-mfb',
        'fabric'
    ]
)

.run(function($ionicPlatform, $ionicHistory, $state, $rootScope) {
// Database
//.run(function($ionicPlatform, $ionicHistory, $state, $rootScope, $cordovaSQLite) {

    $rootScope.goToState = function(state, params){
        $state.go(state, params);
    };

    var intervalChecker = setInterval(function(){
        if(typeof config !== "undefined"){
            clearInterval(intervalChecker);

            if(!window.private_keys){
                console.error('intervalChecker: No private config file found!');
                return;
            }

            if(window.private_keys.bugsnag_key) {
                //Set Bugsnag Release Stage
                $rootScope.bugsnagApiKey = window.private_keys.bugsnag_key;
                Bugsnag.apiKey = window.private_keys.bugsnag_key;
                Bugsnag.releaseStage = config.getEnv();
                Bugsnag.notifyReleaseStages = config.bugsnag.notifyReleaseStages;
            } else {
                console.error('intervalChecker: No bugsnag_key found in private config!');
            }

            $ionicPlatform.ready(function() {
                // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
                // for form inputs)
                if (window.cordova && window.cordova.plugins.Keyboard) {
                    cordova.plugins.Keyboard.hideKeyboardAccessoryBar(false);
                }
                if (window.StatusBar) {
                    // org.apache.cordova.statusbar required
                    StatusBar.styleDefault();
                }
                // Database
                /*
                if (!$rootScope.isMobile) {
                    db = window.openDatabase("my.db", "1.0", "Cordova Demo", 200000);
                }
                else {
                    db = $cordovaSQLite.openDB("my.db");
                }
                */
            });

            $ionicPlatform.registerBackButtonAction(function (event) {
                if($ionicHistory.currentStateName() === config.appSettings.defaultState){
                    ionic.Platform.exitApp();
                }
                else {
                    if($ionicHistory.backView()){
                        $ionicHistory.goBack();
                    } else if(localStorage.user){
                        $rootScope.hideNavigationMenu = false;
                        console.debug('registerBackButtonAction: Going to default state...');
                        $state.go(config.appSettings.defaultState);
                    } else {
                        /*
                        console.debug('registerBackButtonAction: Going to welcome state...');
                        $state.go(config.appSettings.welcomeState);
                        */
                        console.debug('registerBackButtonAction: Closing the app');
                        ionic.Platform.exitApp();
                    }
                }
            }, 100);  
        }
    }, 500);

})

.config(function($stateProvider, $urlRouterProvider, $compileProvider, ionicTimePickerProvider,
                 ionicDatePickerProvider, $ionicConfigProvider) {
    $compileProvider.imgSrcSanitizationWhitelist(/^\s*(https?|ftp|file|mailto|chrome-extension):/);
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|file|ftp|mailto|chrome-extension):/);
    $ionicConfigProvider.tabs.position("bottom"); //Places them at the bottom for all OS

    var config_resolver = {
      loadMyService: ['$ocLazyLoad', function($ocLazyLoad) {
        var getAppNameFromUrl = function () {
            var sPageURL = document.location.toString().split('?')[1];
            if(!sPageURL) {
                return false;
            }
            var sURLVariables = sPageURL.split('&');
            if(!sURLVariables) {
                return false;
            }
            for (var i = 0; i < sURLVariables.length; i++)
            {
                var sParameterName = sURLVariables[i].split('=');
                if (sParameterName[0] === 'app')
                {
                    return sParameterName[1].split('#')[0];
                }
            }
            return false;
        };

        var appName = getAppNameFromUrl();

        if(appName){
            console.log('loading', appsManager.getAppConfig(appName), appsManager.getPrivateConfig(appName));
            return $ocLazyLoad.load([appsManager.getAppConfig(appName), appsManager.getPrivateConfig(appName)]);
        } else{
            console.log('Loading default app: ' + appsManager.getDefaultApp());
            return $ocLazyLoad.load([appsManager.getDefaultConfig(), appsManager.getDefaultPrivateConfig()]);          
        }

      }]
    };

    // Configure timepicker
    var timePickerObj = {
        format: 12,
        step: 1,
        closeLabel: 'Cancel'
    };
    ionicTimePickerProvider.configTimePicker(timePickerObj);

    // Configure datepicker
    var datePickerObj = {
        inputDate: new Date(),
        setLabel: 'Set',
        todayLabel: 'Today',
        closeLabel: 'Cancel',
        mondayFirst: false,
        weeksList: ["S", "M", "T", "W", "T", "F", "S"],
        //monthsList: ["Jan", "Feb", "March", "April", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"],
        templateType: 'modal',
        from: new Date(2012, 8, 1),
        to: new Date(),
        showTodayButton: true,
        dateFormat: 'dd MMMM yyyy',
        closeOnSelect: false
    };
    ionicDatePickerProvider.configDatePicker(datePickerObj);

    $stateProvider
      .state('intro', {
          url: '/',
          templateUrl: 'templates/intro-tour.html',
          controller: 'IntroCtrl',
          resolve : config_resolver
      })
      
      .state('app', {
        url: "/app",
        templateUrl: "templates/menu.html",
        controller: 'AppCtrl',
        resolve : config_resolver
      })

      .state('app.welcome', {
          cache: false,
        url: "/welcome",
        views: {
          'menuContent': {
            templateUrl: "templates/welcome.html",
            controller: 'WelcomeCtrl'
          }
        }
      })
      .state('app.login', {
        url: "/login",
        params: {
          fromState : null,
            fromUrl : null
        },
        views: {
          'menuContent': {
            templateUrl: "templates/login-page.html",
            controller: 'LoginCtrl'
          }
        }
      })
        .state('app.intro', {
            url: "/intro",
            views: {
                'menuContent': {
                    templateUrl: "templates/intro-tour.html",
                    controller: 'IntroPageCtrl'
                }
            }
        })
      .state('app.track', {
          url: "/track",
          //cache:false,
          views: {
              'menuContent': {
                  templateUrl: "templates/track-primary-outcome-variable.html",
                  controller: 'TrackPrimaryOutcomeCtrl'
              }
          }
      })
      .state('app.track_factors', {
          url: "/track_factors",
          params: {
              reminder : null,
              fromState : null,
              measurement : null,
              variableObject : null
          },
          views: {
              'menuContent': {
                  templateUrl: "templates/variable-search.html",
                  controller: 'TrackFactorsCategoryCtrl'
              }
          }
      })
      .state('app.track_factors_category', {
          url: "/track_factors_category/:variableCategoryName",
          cache:false,
          params: {
              variableCategoryName : null,
              fromState : null,
              fromUrl : null,
              measurement : null
          },
          views: {
              'menuContent': {
                  templateUrl: "templates/variable-search.html",
                  controller: 'TrackFactorsCategoryCtrl'
              }
          }
      })
        .state('app.reminderSearchCategory', {
            url: "/reminderSearchCategory/:variableCategoryName",
            cache:false,
            params: {
                variableCategoryName : null,
                fromState : null,
                fromUrl : null,
                measurement : null,
                reminderSearch: true
            },
            views: {
                'menuContent': {
                    templateUrl: "templates/variable-search.html",
                    controller: 'TrackFactorsCategoryCtrl'
                }
            }
        })

        .state('app.reminderSearch', {
            url: "/reminderSearch",
            cache:false,
            params: {
                variableCategoryName : null,
                fromState : null,
                fromUrl : null,
                measurement : null,
                reminderSearch: true
            },
            views: {
                'menuContent': {
                    templateUrl: "templates/variable-search.html",
                    controller: 'TrackFactorsCategoryCtrl'
                }
            }
        })
        .state('app.measurementAdd', {
            url: "/measurement-add/:variableName",
            cache:false,
            params: {
                reminder : null,
                fromState : null,
                fromUrl : null,
                measurement : null,
                variableObject : null
            },
            views: {
                'menuContent': {
                    templateUrl: "templates/measurement-add.html",
                    controller: 'MeasurementAddCtrl'
                }
            }
        })
        .state('app.variable_settings', {
            url: "/variable_settings/:variableName",
            params: {
                reminder : null,
                fromState : null,
                fromUrl : null,
                measurement : null,
                variableObject : null
            },
            views: {
                'menuContent': {
                    templateUrl: "templates/variable-settings.html",
                    controller: 'VariableSettingsCtrl'
                }
            }
        })
      .state('app.import', {
          url: "/import",
          cache:"false",
          views: {
              'menuContent': {
                  templateUrl: "templates/import-data.html",
                  controller: 'ImportCtrl'
              }
          }
      })
      .state('app.searchVariablesEmbed', {
          url: "/search-variables",
          cache:false,
          views: {
              'menuContent': {
                  templateUrl: "templates/iframe-embed.html",
                  controller: 'IframeScreenCtrl'
              }
          }
      })
      .state('app.variableSearch', {
          url: "/search-variables-native",
          cache: false,
          params: {
              variableCategoryName: null,
              fromState: null,
              fromUrl: null,
              measurement: null,
              variableSearch: true
          },
          views: {
              'menuContent': {
                  templateUrl: "templates/variable-search.html",
                  controller: 'TrackFactorsCategoryCtrl'
              }
          }

       })
        .state('app.variables', {
            url: "/variables/:variableName",
            cache: false,
            params: {
                variableName : null,
                fromState : null,
                fromUrl : null,
            },
            views: {
                'menuContent': {
                    templateUrl: "templates/variable-page.html",
                    //controller: 'VariablePageCtrl'
                    controller: 'VariablePageCtrl'
                }
            }
        })
      .state('app.searchCommonRelationships', {
          url: "/search-common-relationships",
          cache:false,
          views: {
              'menuContent': {
                  templateUrl: "templates/iframe-embed.html",
                  controller: 'IframeScreenCtrl'
              }
          }
      })
      .state('app.search-user-relationships', {
          url: "/search-user-relationships",
          cache:false,
          views: {
              'menuContent': {
                  templateUrl: "templates/iframe-embed.html",
                  controller: 'IframeScreenCtrl'
              }
          }
      })
      .state('app.negative', {
          url: "/negative",
          cache:false,
          views: {
              'menuContent': {
                  templateUrl: "templates/negative.html",
                  controller: 'NegativeCtrl'
              }
          }
      })
      .state('app.positive', {
          url: "/positive",
          cache:false,
          views: {
              'menuContent': {
                  templateUrl: "templates/positive.html",
                  controller: 'PositiveCtrl'
              }
          }
      })
      .state('app.settings', {
          url: "/settings",
          views: {
              'menuContent': {
                  templateUrl: "templates/settings.html",
                  controller: 'SettingsCtrl'
              }
          }
      })
      .state('app.help', {
          url: "/help",
          views: {
              'menuContent': {
                  templateUrl: "templates/help.html",
                  controller: 'ExternalCtrl'
              }
          }
      })
      .state('app.feedback', {
          url: "/feedback",
          views: {
              'menuContent': {
                  templateUrl: "templates/feedback.html",
                  controller: 'ExternalCtrl'
              }
          }
      })
      .state('app.contact', {
          url: "/contact",
          views: {
              'menuContent': {
                  templateUrl: "templates/contact.html",
                  controller: 'ExternalCtrl'
              }
          }
      })
      // Broken; redirecting to help page instead
      /*
      .state('app.postIdea', {
          url: "/postidea",
          views: {
              'menuContent': {
                  templateUrl: "templates/post-idea.html",
                  controller: 'ExternalCtrl'
              }
          }
      })
      */
      .state('app.history', {
          url: "/history",
          cache:false,
          views: {
              'menuContent': {
                  templateUrl: "templates/history-primary-outcome-variable.html",
                  controller: 'HistoryPrimaryOutcomeCtrl'
              }
          }
      })
        .state('app.historyAll', {
            url: "/history-all",
            cache: false,
            params: {
                variableCategoryName : null,
                fromState : null,
                fromUrl : null
            },
            views: {
                'menuContent': {
                    templateUrl: "templates/history-all.html",
                    controller: 'historyAllMeasurementsCtrl'
                }
            }
        })
      .state('app.historyAllCategory', {
          url: "/history-all/:variableCategoryName",
          params: {
              variableCategoryName : null,
              fromState : null,
              fromUrl : null
          },
          views: {
              'menuContent': {
                  templateUrl: "templates/history-all.html",
                  controller: 'historyAllMeasurementsCtrl'
              }
          }
      })
      .state('app.remindersInbox', {
          url: "/reminders-inbox",
          cache:false,
          params: {
            unit: null,
            variableName : null,
            dateTime : null,
            value : null,
              fromUrl : null
          },
          views: {
              'menuContent': {
                  templateUrl: "templates/reminders-inbox.html",
                  controller: 'RemindersInboxCtrl'
              }
          }
      })
        .state('app.remindersInboxToday', {
            url: "/reminders-inbox-today",
            cache:false,
            params: {
                unit: null,
                variableName : null,
                dateTime : null,
                value : null,
                fromUrl : null,
                today : true
            },

            views: {
                'menuContent': {
                    templateUrl: "templates/reminders-inbox.html",
                    controller: 'RemindersInboxCtrl'
                }
            }
        })
        .state('app.remindersInboxTodayCategory', {
            url: "/reminders-inbox-today/:variableCategoryName",
            cache:false,
            params: {
                unit: null,
                variableName : null,
                dateTime : null,
                value : null,
                fromUrl : null,
                today : true
            },

            views: {
                'menuContent': {
                    templateUrl: "templates/reminders-inbox.html",
                    controller: 'RemindersInboxCtrl'
                }
            }
        })
      .state('app.remindersInboxCategory', {
          url: "/reminders-inbox/:variableCategoryName",
          cache:false,
          params: {
            unit: null,
            variableName : null,
            dateTime : null,
            value : null, 
            fromUrl : null
          },
          views: {
              'menuContent': {
                  templateUrl: "templates/reminders-inbox.html",
                  controller: 'RemindersInboxCtrl'
              }
          }
      })
      .state('app.remindersManage', {
          url: "/reminders-manage",
          cache:false,
          views: {
              'menuContent': {
                  templateUrl: "templates/reminders-manage.html",
                  controller: 'RemindersManageCtrl'
              }
          }
      })
      .state('app.remindersManageCategory', {
          url: "/reminders-manage/:variableCategoryName",
          cache:false,
          views: {
              'menuContent': {
                  templateUrl: "templates/reminders-manage.html",
                  controller: 'RemindersManageCtrl'
              }
          }
      })
      .state('app.reminderAddCategory', {
          url: "/reminder_add/:variableCategoryName",
          cache:false,
          params: {
              variableCategoryName : null,
              reminder : null,
              fromState : null,
              fromUrl : null,
              measurement : null,
              variableObject : null
          },
          views: {
              'menuContent': {
                  templateUrl: "templates/reminder-add.html",
                  controller: 'RemindersAddCtrl'
              }
          }
      })
      .state('app.reminderAdd', {
          url: "/reminder_add",
          cache:false,
          params: {
              variableCategoryName : null,
              reminder : null,
              fromState : null,
              fromUrl : null,
              measurement : null,
              variableObject : null
          },
          views: {
              'menuContent': {
                  templateUrl: "templates/reminder-add.html",
                  controller: 'RemindersAddCtrl'
              }
          }
      });


      // if none of the above states are matched, use this as the fallback
      $urlRouterProvider.otherwise('/');
});

angular.module('exceptionOverride', []).factory('$exceptionHandler', function () {
    return function (exception, cause) {
        Bugsnag.notifyException(exception, {diagnostics:{cause: cause}});
    };
});