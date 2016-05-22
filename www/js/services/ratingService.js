angular.module('starter')
	.factory('ratingService', function(variableCategoryService){
        
		var ratingService = {

            getRatingInfo : function() {
                var ratingInfo =
                { 
                    1 : {
                        displayDescription: 'Depressed',
                        positiveImage: 'img/ic_face_depressed.png',
                        negativeImage: 'img/ic_face_ecstatic.png',
                        numericImage:  'img/ic_1.png'
                        },
                    2 :  {
                        displayDescription: 'Sad',
                        positiveImage: 'img/ic_face_sad.png',
                        negativeImage: 'img/ic_face_happy.png',
                        numericImage:  'img/ic_1.png'
                        },
                    3 : {
                        displayDescription: 'OK',
                        positiveImage: 'img/ic_face_ok.png',
                        negativeImage: 'img/ic_face_ok.png',
                        numericImage:  'img/ic_1.png'
                        },
                    4 : {
                        displayDescription: 'Happy',
                        positiveImage: 'img/ic_face_happy.png',
                        negativeImage: 'img/ic_face_sad.png',
                        numericImage:  'img/ic_1.png'
                        },
                    5 : {
                        displayDescription: 'Ecstatic',
                        positiveImage: 'img/ic_face_ecstatic.png',
                        negativeImage: 'img/ic_face_depressed.png',
                        numericImage:  'img/ic_1.png'
                        }
                };
                return ratingInfo;
            },

            getPrimaryOutcomeVariableOptionLabels : function(shouldShowNumbers){
                if(shouldShowNumbers || !config.appSettings.primaryOutcomeVariableRatingOptionLabels){
                    return ['1',  '2',  '3',  '4', '5'];
                } else {
                    return config.appSettings.primaryOutcomeVariableRatingOptionLabels;
                }
            },

            getPositiveImageByRatingValue : function(ratingValue){
                var ratingInfo = this.getRatingInfo();
                var positiveImage = ratingInfo['ratingValue'];
            	return positiveImage;
            },

            getNegativeImageByRatingValue : function(ratingValue){
                var negativeRatingOptions = this.getNegativeRatingOptions();
                var filteredList = negativeRatingOptions.filter(function(option){
                    return option.value === ratingValue;
                });

                return filteredList.length? filteredList[0].img || false : false;
            },

            getNumericImageByRatingValue : function(ratingValue){
                var numericRatingOptions = this.getNumericRatingOptions();
                var filteredList = numericRatingOptions.filter(function(option){
                    return option.value === ratingValue;
                });

                return filteredList.length? filteredList[0].img || false : false;
            },

            getImageForPrimaryOutcomeVariableByNumber : function(ratingValue){

                var primaryOutcomeVariable = config.appSettings.ratingValueToTextConversionDataSet[ratingValue] ?
                    config.appSettings.ratingValueToTextConversionDataSet[ratingValue] : false;
                return primaryOutcomeVariable ? 
                    ratingService.getImageForPrimaryOutcomeVariableByValue(primaryOutcomeVariable) : false;
            },
    
            getPrimaryOutcomeVariableByNumber : function(num){
                return config.appSettings.ratingValueToTextConversionDataSet[num] ?
                    config.appSettings.ratingValueToTextConversionDataSet[num] : false;
            },

            getRatingFaceImageByText : function(lowerCaseRatingTextDescription){
                var positiveRatingOptions = ratingService.getPositiveRatingOptions();
                
                var filteredList = positiveRatingOptions.filter(
                    function(option){
                    return option.lowerCaseTextDescription === lowerCaseRatingTextDescription;
                });

                return filteredList.length ? filteredList[0].img || false : false;
            },

            getPositiveRatingOptions : function() {
                return [
                    {
                        numericValue: 1,
                        displayDescription: 'Depressed',
                        lowercaseTextDescription: 'depressed',
                        img: 'img/ic_face_depressed.png'
                    },
                    {
                        numericValue: 2,
                        displayDescription: 'Sad',
                        lowerCaseTextDescription: 'sad',
                        img: 'img/ic_face_sad.png'
                    },
                    {
                        numericValue: 3,
                        displayDescription: 'OK',
                        lowerCaseTextDescription: 'ok',
                        img: 'img/ic_face_ok.png'
                    },
                    {
                        numericValue: 4,
                        displayDescription: 'Happy',
                        lowerCaseTextDescription: 'happy',
                        img: 'img/ic_face_happy.png'
                    },
                    {
                        numericValue: 5,
                        displayDescription: 'Ecstatic',
                        lowerCaseTextDescription: 'ecstatic',
                        img: 'img/ic_face_ecstatic.png'
                    }
                ]
            },

            getNegativeRatingOptions : function() {
                return [
                    {
                        numericValue: 1,
                        displayDescription: 'Ecstatic',
                        value: 'ecstatic',
                        img: 'img/ic_face_ecstatic.png'
                    },
                    {
                        numericValue: 2,
                        displayDescription: 'Happy',
                        value: 'happy',
                        img: 'img/ic_face_happy.png'
                    },
                    {
                        numericValue: 3,
                        displayDescription: 'OK',
                        value: 'ok',
                        img: 'img/ic_face_ok.png'
                    },
                    {
                        numericValue: 4,
                        displayDescription: 'Sad',
                        value: 'sad',
                        img: 'img/ic_face_sad.png'
                    },
                    {
                        numericValue: 5,
                        displayDescription: 'Depressed',
                        value: 'depressed',
                        img: 'img/ic_face_depressed.png'
                    }
                ]
            },

            getNumericRatingOptions : function() {
                return [
                    {
                        value: '1',
                        img: 'img/ic_1.png'
                    },
                    {
                        value: '2',
                        img: 'img/ic_2.png'
                    },
                    {
                        value: '3',
                        img: 'img/ic_3.png'
                    },
                    {
                        value: '4',
                        img: 'img/ic_4.png'
                    },
                    {
                        value: '5',
                        img: 'img/ic_5.png'
                    }
                ]
            },
            
            addImagesToMeasurements : function (measurements){
                var ratingInfo = ratingService.getRatingInfo();
                var index;
                for (index = 0; index < measurements.length; ++index) {
                    if(measurements[index].variableId === config.appSettings.primaryOutcomeVariableDetails.id){
                        measurements[index].variableDescription = config.appSettings.primaryOutcomeVariableDetails.description;
                    }

                    if (measurements[index].abbreviatedUnitName === '/5') {
                        measurements[index].roundedValue = Math.round(measurements[index].value);
                    }

                    if (measurements[index].abbreviatedUnitName === '%') {
                        measurements[index].roundedValue = Math.round(measurements[index].value / 25 + 1);
                    }

                    if (measurements[index].roundedValue && measurements[index].variableDescription === 'positive') {
                        if (ratingInfo[measurements[index].roundedValue]) {
                            measurements[index].image = ratingInfo[measurements[index].roundedValue].positiveImage;
                        }
                    }

                    if (measurements[index].roundedValue && measurements[index].variableDescription === 'negative') {
                        if (ratingInfo[measurements[index].roundedValue]) {
                            measurements[index].image = ratingInfo[measurements[index].roundedValue].negativeImage;
                        }
                    }

                    if (!measurements[index].image && measurements[index].roundedValue) {
                        if (ratingInfo[measurements[index].roundedValue]) {
                            measurements[index].image = ratingInfo[measurements[index].roundedValue].numericImage;
                        }
                    }

                    if (measurements[index].variableCategoryName){
                        measurements[index].icon =
                            variableCategoryService.getVariableCategoryIcon(measurements[index].variableCategoryName);
                    }
                }
                return measurements;
            }
		};

		return ratingService;
	});