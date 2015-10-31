#!/usr/bin/env bash

NAME='tabun-fixes'

cd "$(dirname "$0")"

# 1. meta

cat src/meta.js > dist/$NAME.meta.js


# 2. script itself

function add_module() {
    local F="$1"
    local OUT="$2"
    local MODUL="$(basename "${F%%.js}")"
    echo                             >> "$OUT"
    echo "define('$MODUL', [])"      >> "$OUT"
    cat "$F"                         >> "$OUT"
}

function add_image() {
    local F="$1"
    local OUT="$2"
    local NAME="$(basename "${F%%.*}")"
    local MIME="$(file -b --mime-type "$F")"
    echo                                >> "$OUT"
    echo -n "define('img/$NAME', [], '" >> "$OUT"
    echo -n "data:$MIME;base64,"        >> "$OUT"
    base64 --wrap=0 "$F"                >> "$OUT"
    echo "')"                           >> "$OUT"
}


# 2.1. bare script for testing purposes

OUT=dist/$NAME.bare.js

cat src/define.js                     > "$OUT"

for F in src/core/*.js; do
    add_module "$F" "$OUT"
done

for F in src/modules/*.js; do
    add_module "$F" "$OUT"
done

for F in src/res/*.png; do
    add_image "$F" "$OUT"
done

add_module "src/start.js" "$OUT"


# 2.2. main output file

OUT=dist/$NAME.user.js

cat src/meta.js                       > "$OUT"

echo                                 >> "$OUT"
cat src/head                         >> "$OUT"

echo                                 >> "$OUT"
cat dist/$NAME.bare.js                >> "$OUT"

echo                                 >> "$OUT"
cat src/tail                         >> "$OUT"
