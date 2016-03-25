#!/usr/bin/env bash

echo -e "${GREEN}Install imagemagick package if it doesn't exist${NC}"
if ! type "imagemagick" > /dev/null;
  then
  apt-get install imagemagick
fi

ionic resources
convert resources/icon.png -resize 16x16 www/img/icon_16.png
convert resources/icon.png -resize 48x48 www/img/icon_48.png
convert resources/icon.png -resize 128x128 www/img/icon_128.png