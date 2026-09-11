#!/bin/zsh
# VS Glass dev tool — quit and relaunch one of the scratch test beds (see CONTRIBUTING.md): dev-relaunch-bed.sh 9334|9337.
# Uses the bundled bin/code launcher so the app outlives the shell; a plain `nohup Code &` dies with a sandboxed shell.
set -e
PORT=$1
APP=/Users/miloshampl/Repos/personal/vs-glass/scratch/VSCode-pristine.app/Contents/Resources/app/bin/code
case $PORT in
  9334) ARGS=(--user-data-dir /Users/miloshampl/Repos/personal/vs-glass/scratch/profile-clean/user --extensions-dir /Users/miloshampl/Repos/personal/vs-glass/scratch/profile-clean/ext) ;;
  9337) ARGS=(--user-data-dir /tmp/vsg-play2 --extensions-dir /tmp/vsg-play-ext) ;;
  9338) APP=/Users/miloshampl/Repos/personal/vs-glass/scratch/VSCode-fresh.app/Contents/Resources/app/bin/code; ARGS=(--user-data-dir /tmp/vsg-fresh --extensions-dir /tmp/vsg-fresh-ext) ;;
  9339) APP=/Users/miloshampl/Repos/personal/vs-glass/scratch/VSCode-fresh.app/Contents/Resources/app/bin/code; ARGS=(--user-data-dir /tmp/vsg-shots --extensions-dir /tmp/vsg-shots-ext) ;;  # screenshot bed: never a review window
  *) echo "unknown port"; exit 1 ;;
esac
PID=$(ps -axo pid,command | grep -E "remote-debugging-port=$PORT" | grep -v grep | grep -v Helper | awk '{print $1}' | head -1)
if [ -n "$PID" ]; then kill $PID; for i in $(seq 1 40); do kill -0 $PID 2>/dev/null || break; sleep 0.25; done; kill -9 $PID 2>/dev/null || true; fi
sleep 1
"$APP" "${ARGS[@]}" --remote-debugging-port=$PORT --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-features=CalculateNativeWinOcclusion /Users/miloshampl/Repos/personal/vs-glass/samples >/dev/null 2>&1
for i in $(seq 1 60); do curl -s "http://127.0.0.1:$PORT/json/version" >/dev/null 2>&1 && break; sleep 0.5; done
echo "relaunched $PORT"
