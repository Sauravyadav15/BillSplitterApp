# backend/paddle_ocr/ocr_server.py
# A long-lived worker: loads PaddleOCR's models once, then serves any number
# of requests over stdin/stdout. Model load alone (5 models: orientation
# classifier, unwarping, text-line orientation, detection, recognition) has
# been measured at 20-30+ seconds even on a warm cache, on top of which
# inference itself can take much longer under memory pressure. Spawning a
# fresh process per receipt scan (as the one-shot ocr_receipt.py CLI does)
# means paying that load cost on every single request - this script pays it
# once, at startup, and reuses the same in-memory models for every request
# after that.
#
# Protocol: one JSON object per line in each direction.
#   stdin  request:  {"id": <string>, "image_path": <string>}
#   stdout response: {"id": <string>, "boxes": [...]}  or  {"id": <string>, "error": <string>}
# The first line this script prints once startup is complete is
# {"ready": true} - the Node side waits for that before sending any request.

import json
import sys

from ocr_receipt import SuppressNativeStdout, boxes_from_image, get_ocr


def main():
    with SuppressNativeStdout():
        get_ocr()  # load all models once, up front

    print(json.dumps({"ready": True}), flush=True)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
        except ValueError as exc:
            print(json.dumps({"error": f"bad request JSON: {exc}"}), flush=True)
            continue

        request_id = request.get("id")
        try:
            boxes = boxes_from_image(request["image_path"])
            print(json.dumps({"id": request_id, "boxes": boxes}), flush=True)
        except Exception as exc:  # keep the worker alive for the next request
            print(json.dumps({"id": request_id, "error": str(exc)}), flush=True)


if __name__ == "__main__":
    main()
