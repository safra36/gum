#!/bin/bash


echo "executing this shett$1"
cd "$1"

git log \
    --pretty=format:'{%n  "commit": "%H",%n  "author": "%aN <%aE>",%n  "date": "%ad",%n  "message": "%f"%n},' \
    $@ |
    perl -pe 'BEGIN{print "["}; END{print "]\n"}' |
    perl -pe 's/},]/}]/'
