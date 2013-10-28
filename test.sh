#!/bin/bash
TIME_SLEEP=60
INCREASE_PUBLISHER=250
LIMIT=2000
SERVER=$1

echo $SERVER
for ((a=INCREASE_PUBLISHER; a <= LIMIT ; a = a + INCREASE_PUBLISHER))
do
    sar -o sar$a.sar 1 > /dev/null 2>&1 &
    SAR_PID=$!
    echo "Started with $a publishers"
    ./load.js -t 0.25 -n $a -h $SERVER
    echo "Done with $a publishers"
    sleep $TIME_SLEEP
    kill $SAR_PID
done