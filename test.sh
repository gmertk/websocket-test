#!/bin/sh
TIME_SLEEP=2
INCREASE_PUBLISHER=250
LIMIT=2250

for ((a=INCREASE_PUBLISHER; a <= LIMIT ; a = a + INCREASE_PUBLISHER))
do
    sar -o results.sar 1 > /dev/null 2>&1 &
    echo "Started with $a publishers"
    # ./load.js -t 0.25 -n $a
    echo "Done with $a publishers"
    sleep $TIME_SLEEP
done