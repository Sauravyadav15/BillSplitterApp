# backend/paddle_ocr/ocr_receipt.py
# Runs PaddleOCR on a single image and prints the raw detected text boxes
# (text + pixel bounding box) as JSON on stdout. Row/column reconstruction
# is left to the Node caller (utils/ocrLineBuilder.js) - this script's only
# job is detection + recognition.

import json
import os
import sys

import numpy as np
from PIL import Image
from paddleocr import PaddleOCR

# Receipt photos from phones commonly come in well above this (e.g.
# 3024x4032); at full resolution the text-detection model has been observed
# to crash outright (RuntimeError from the native inference runner) rather
# than just running slow. Downscaling first also sidesteps relying on
# paddleocr's own image loader for formats like .webp - PIL decodes it and
# hands over a plain RGB array instead.
MAX_DIMENSION = 2000

_ocr = None


def load_image(image_path):
    img = Image.open(image_path).convert("RGB")
    if max(img.size) > MAX_DIMENSION:
        img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)
    return np.array(img)


def get_ocr():
    global _ocr
    if _ocr is None:
        # Phone photos of receipts are rarely shot dead-on - orientation
        # classification + unwarping correct rotation/perspective/curl before
        # detection runs, which measurably fixes text-line boxes on an
        # angled photo (rows that would otherwise visually overlap enough to
        # get merged together downstream).
        _ocr = PaddleOCR(
            use_doc_orientation_classify=True,
            use_doc_unwarping=True,
            use_textline_orientation=True,
            text_detection_model_name="PP-OCRv5_mobile_det",
            text_recognition_model_name="PP-OCRv5_mobile_rec",
            # oneDNN's PIR executor on this paddlepaddle build can't run one of
            # these models' ops (ConvertPirAttribute2RuntimeAttribute /
            # ArrayAttribute<DoubleAttribute> - a Windows CPU oneDNN bug, not a
            # config issue). Plain CPU kernels don't hit it.
            enable_mkldnn=False,
        )
    return _ocr


# PaddleOCR's native (C++) backend writes its own diagnostic lines (e.g.
# "ReduceMeanCheckIfOneDNNSupport") straight to the process's stdout file
# descriptor, bypassing Python's sys.stdout entirely - redirecting sys.stdout
# alone would not catch them. The only way to keep those lines out of the
# JSON this script prints is to redirect real fd 1 to devnull for the
# duration of model load/inference, then restore it just to print the result.
class SuppressNativeStdout:
    def __enter__(self):
        self._devnull_fd = os.open(os.devnull, os.O_WRONLY)
        self._saved_fd = os.dup(1)
        os.dup2(self._devnull_fd, 1)
        return self

    def __exit__(self, *exc_info):
        os.dup2(self._saved_fd, 1)
        os.close(self._devnull_fd)
        os.close(self._saved_fd)


def boxes_from_image(image_path):
    with SuppressNativeStdout():
        ocr = get_ocr()
        results = ocr.predict(load_image(image_path))

        boxes = []
        for page in results:
            texts = page["rec_texts"]
            scores = page["rec_scores"]
            polys = page["rec_polys"]
            for text, score, poly in zip(texts, scores, polys):
                xs = [float(p[0]) for p in poly]
                ys = [float(p[1]) for p in poly]
                boxes.append(
                    {
                        "text": text,
                        "score": float(score),
                        "x0": min(xs),
                        "x1": max(xs),
                        "y0": min(ys),
                        "y1": max(ys),
                        # The axis-aligned box (y1 - y0 above) inflates badly
                        # for rotated text - a receipt photographed at even a
                        # modest angle (common: the paper lying at a slight
                        # tilt, not held perfectly flat/square to the camera)
                        # produces boxes whose axis-aligned height is much
                        # taller than the actual glyph height, especially for
                        # wide multi-word lines (observed ~30-65% inflation at
                        # only a few degrees of rotation on a real receipt).
                        # ocrLineBuilder.js needs the true perpendicular text
                        # height - the poly's left/right edge length, not its
                        # bounding box - to correctly judge whether two boxes
                        # belong to the same row; an inflated height makes its
                        # gap threshold too generous and merges separate rows.
                        "height": _poly_text_height(poly),
                    }
                )
    return boxes


def _poly_text_height(poly):
    def edge_length(p1, p2):
        return ((float(p2[0]) - float(p1[0])) ** 2 + (float(p2[1]) - float(p1[1])) ** 2) ** 0.5

    # PaddleOCR poly order is [top-left, top-right, bottom-right, bottom-left],
    # so edges 0-3 and 1-2 are the (near-vertical) left/right sides of the
    # text box - their length is the true text height regardless of rotation.
    left_edge = edge_length(poly[3], poly[0])
    right_edge = edge_length(poly[2], poly[1])
    return (left_edge + right_edge) / 2


def main():
    # One-shot CLI mode: pays PaddleOCR's full model-load cost (several
    # models, tens of seconds) on every invocation. Fine for a single manual
    # run; the app itself uses ocr_server.py instead, which pays that cost
    # once at startup and stays warm - see that file for why.
    if len(sys.argv) != 2:
        print(json.dumps({"error": "usage: ocr_receipt.py <image_path>"}), file=sys.stderr)
        sys.exit(1)

    boxes = boxes_from_image(sys.argv[1])
    print(json.dumps({"boxes": boxes}))


if __name__ == "__main__":
    main()
