#!/usr/bin/env bash

# Usage: Run `bash scripts/create_icons` from the root of repo with icon and splash in resources folder

#if ! type "imagemagick" > /dev/null;
#  then
#  echo -e "${GREEN}Installing imagemagick package...${NC}"
#  apt-get install imagemagick # For Linux
#  echo "If you are using OSX, install https://www.macports.org/install.php and run: 'sudo port install ImageMagick' in a new terminal..."
#fi

#ionic platform add ios
cd "${INTERMEDIATE_PATH}"
echo "Adding android platform for ${LOWERCASE_APP_NAME} at ${PWD}"
ionic platform add android
echo "Generating images for ${LOWERCASE_APP_NAME} at ${PWD}..."
ionic resources >/dev/null
cp resources/icon.png www/img/icon_700.png
convert resources/icon.png -resize 16x16 www/img/icon_16.png
convert resources/icon.png -resize 48x48 www/img/icon_48.png
convert resources/icon.png -resize 128x128 www/img/icon_128.png
