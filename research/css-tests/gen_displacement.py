#!/usr/bin/env python3
"""
Generates an edge-only displacement map PNG for feDisplacementMap.
Technique: signed-distance-to-rounded-rect field. Center of the shape is
neutral (128,128,128,255) -> zero displacement. Near the border, pixels are
pushed outward (away from center) with magnitude ramping up from 0 at
`rim` px inside the edge to `max` at the outer edge, using a smoothstep
falloff. This produces "bends only at the rim, flat in the middle" lensing
instead of the uniform/noisy look of a linear gradient or feTurbulence map.

R channel = X displacement (128 = 0, >128 = +X i.e. rightward source sampling)
G channel = Y displacement (128 = 0, >128 = +Y i.e. downward source sampling)
B channel = unused (mid grey)
A channel = 255 (opaque)

Output: two files
  displacement-edge.png   (W x H, for the *inline* SVG filter test, panel 2)
  displacement-edge-ext.png (same map, referenced from an *external* .svg
                              filter file, panel 3)
"""
import struct
import zlib
import numpy as np
import os

W, H = 560, 320          # matches the .pane size used in the test page (px @1x)
RADIUS = 28               # corner radius of the glass pane, px
RIM = 34                  # width of the lensing band, px, measured inward from edge
MAX_PUSH = 1.0             # 1.0 -> full 127 magnitude at the very edge

def sdf_rounded_rect(x, y, w, h, r):
    # distance (positive outside, negative inside) to a rounded rect
    # centered coordinate system
    cx, cy = w / 2.0, h / 2.0
    qx = np.abs(x - cx) - (cx - r)
    qy = np.abs(y - cy) - (cy - r)
    qx_clamped = np.maximum(qx, 0)
    qy_clamped = np.maximum(qy, 0)
    outside = np.sqrt(qx_clamped**2 + qy_clamped**2)
    inside = np.minimum(np.maximum(qx, qy), 0)
    return outside + inside - r

def smoothstep(edge0, edge1, x):
    t = np.clip((x - edge0) / (edge1 - edge0), 0, 1)
    return t * t * (3 - 2 * t)

def build(w, h, radius, rim, max_push):
    xs = np.arange(w) + 0.5
    ys = np.arange(h) + 0.5
    X, Y = np.meshgrid(xs, ys)

    dist = sdf_rounded_rect(X, Y, w, h, radius)  # 0 at boundary, negative inside, positive outside

    # distance-from-edge, measured as positive going inward from the boundary
    d_inward = -dist  # >0 inside, 0 at edge, <0 outside

    # strength: 0 when d_inward >= rim (deep interior), ramps to max_push at d_inward = 0 (the edge)
    strength = max_push * (1.0 - smoothstep(0.0, rim, d_inward))
    # zero out strength outside the shape entirely (fully transparent/neutral there,
    # doesn't matter for our rectangular canvas since pane clips to border-radius anyway)
    strength = np.where(d_inward < -rim, 0.0, strength)

    # outward normal direction via numerical gradient of the SDF
    eps = 1.0
    dist_x1 = sdf_rounded_rect(X + eps, Y, w, h, radius)
    dist_x0 = sdf_rounded_rect(X - eps, Y, w, h, radius)
    dist_y1 = sdf_rounded_rect(X, Y + eps, w, h, radius)
    dist_y0 = sdf_rounded_rect(X, Y - eps, w, h, radius)
    nx = (dist_x1 - dist_x0) / (2 * eps)
    ny = (dist_y1 - dist_y0) / (2 * eps)
    norm = np.sqrt(nx**2 + ny**2) + 1e-6
    nx /= norm
    ny /= norm

    # push OUTWARD (towards nearest edge / away from center) => magnifies the
    # background sample from just inside the rim, which is what reads as a
    # convex lens bending light towards the rim. Negate for the opposite
    # (concave / pinched) look.
    disp_x = nx * strength
    disp_y = ny * strength

    r_chan = np.clip(128 + disp_x * 127, 0, 255).astype(np.uint8)
    g_chan = np.clip(128 + disp_y * 127, 0, 255).astype(np.uint8)
    b_chan = np.full((h, w), 128, dtype=np.uint8)
    a_chan = np.full((h, w), 255, dtype=np.uint8)

    rgba = np.dstack([r_chan, g_chan, b_chan, a_chan])
    return rgba

def write_png(path, rgba):
    h, w, _ = rgba.shape
    def chunk(tag, data):
        c = tag + data
        return struct.pack('!I', len(data)) + c + struct.pack('!I', zlib.crc32(c) & 0xffffffff)

    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('!IIBBBBB', w, h, 8, 6, 0, 0, 0)  # 8-bit, RGBA
    raw = bytearray()
    for row in rgba:
        raw.append(0)  # filter type 0 (none) per scanline
        raw.extend(row.tobytes())
    idat = zlib.compress(bytes(raw), 9)
    png = sig + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)

if __name__ == '__main__':
    import sys
    out_dir = sys.argv[1] if len(sys.argv) > 1 else '.'
    rgba = build(W, H, RADIUS, RIM, MAX_PUSH)
    write_png(os.path.join(out_dir, 'displacement-edge.png'), rgba)
    write_png(os.path.join(out_dir, 'displacement-edge-ext.png'), rgba)
    print(f"wrote {W}x{H} displacement maps to {out_dir}")
