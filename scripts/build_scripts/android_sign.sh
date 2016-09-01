#!/bin/bash

cd ${BUILD_PATH}/${LOWERCASE_APP_NAME}/android

echo "zip -d ${UNSIGNED_GENERIC_APK_FILENAME} META-INF/\*"
zip -d ${UNSIGNED_GENERIC_APK_FILENAME} META-INF/\*
echo "Signing ${UNSIGNED_GENERIC_APK_FILENAME}"
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore ${ANDROID_GENERIC_KEYSTORE_PATH} -storepass ${ANDROID_GENERIC_KEYSTORE_PASSWORD} ${UNSIGNED_GENERIC_APK_FILENAME} ${GENERIC_ALIAS} >/dev/null
echo "Verifying ${UNSIGNED_GENERIC_APK_FILENAME}"
jarsigner -verify ${UNSIGNED_GENERIC_APK_FILENAME} >/dev/null
echo "Zipaligning ${UNSIGNED_GENERIC_APK_FILENAME}"
${ANDROID_BUILD_TOOLS}/zipalign -v 4 ${UNSIGNED_GENERIC_APK_FILENAME} ${SIGNED_GENERIC_APK_FILENAME} >/dev/null

rm ${UNSIGNED_GENERIC_APK_FILENAME}

echo -e "${GREEN}Copying ${SIGNED_GENERIC_APK_FILENAME} to $DROPBOX_PATH/QuantiModo/apps/${LOWERCASE_APP_NAME}/android/${SIGNED_GENERIC_APK_FILENAME}${NC}"
cp ${SIGNED_GENERIC_APK_FILENAME} "$DROPBOX_PATH/QuantiModo/apps/${LOWERCASE_APP_NAME}/android/${SIGNED_GENERIC_APK_FILENAME}"

if [ -f "$DROPBOX_PATH/QuantiModo/apps/${LOWERCASE_APP_NAME}/android/${SIGNED_GENERIC_APK_FILENAME}" ];
then
   echo echo "${SIGNED_GENERIC_APK_FILENAME} is ready in $DROPBOX_PATH/QuantiModo/apps/${LOWERCASE_APP_NAME}/android/${SIGNED_GENERIC_APK_FILENAME}"
else
   echo "ERROR: File ${SIGNED_GENERIC_APK_FILENAME} does not exist. Build FAILED"
   exit 1
fi

if [ -f "$IONIC_PATH/build/${LOWERCASE_APP_NAME}/android/${SIGNED_GENERIC_APK_FILENAME}" ];
then
   echo echo "${SIGNED_GENERIC_APK_FILENAME} is ready in $IONIC_PATH/build/${LOWERCASE_APP_NAME}/android/${SIGNED_GENERIC_APK_FILENAME}"
else
   echo "ERROR: File ${SIGNED_GENERIC_APK_FILENAME} does not exist in build folder. Build FAILED"
   exit 1
fi