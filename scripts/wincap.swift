// VS Glass dev tool — capture a VS Code window the way the OS composites it (macOS 14+, ScreenCaptureKit).
//
//   xcrun swiftc -O -o scratch/wincap scripts/wincap.swift
//   scratch/wincap <pid> out.png [window|display]
//
//   window  (default) the window's own pixels: glass planes, rims and lensing exactly as rendered; the see-through
//           parts come out as the flat grey the vibrancy view paints without a backdrop.
//   display the screen region under the window as the user sees it (desktop + OS material + window). Refused unless
//           the window is on screen, because it captures whatever is really there.
//
// `screencapture` and `osascript` may be denied in sandboxed shells; this needs a window-server connection, so run it
// from a normal terminal. The first run asks for Screen Recording permission once.
import Foundation
import AppKit
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers
import ScreenCaptureKit

_ = NSApplication.shared; _ = CGMainDisplayID()
let args = CommandLine.arguments
guard args.count >= 3, let pid = Int32(args[1]) else { print("usage: wincap <pid> <out.png> [window|display]"); exit(64) }
let out = args[2]; let mode = args.count > 3 ? args[3] : "window"
let sem = DispatchSemaphore(value: 0)
Task {
  do {
    let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: false)
    let wins = content.windows.filter { $0.owningApplication?.processID == pid && $0.windowLayer == 0 && $0.frame.height > 300 && $0.frame.width > 600 }
      .sorted { $0.frame.height > $1.frame.height }
    guard let w = wins.first else { print("no window for pid \(pid)"); exit(1) }
    print("window", w.windowID, w.title ?? "", w.frame, "onScreen", w.isOnScreen)
    let cfg = SCStreamConfiguration()
    cfg.showsCursor = false; cfg.captureResolution = .best
    let filter: SCContentFilter
    if mode == "display" {
      guard w.isOnScreen else { print("refusing a display capture: the window is not on screen (it would capture something else)"); exit(3) }
      guard let d = content.displays.first(where: { $0.frame.intersects(w.frame) }) ?? content.displays.first else { print("no display"); exit(1) }
      filter = SCContentFilter(display: d, excludingWindows: [])
      let r = w.frame.intersection(d.frame)
      cfg.sourceRect = CGRect(x: r.origin.x - d.frame.origin.x, y: r.origin.y - d.frame.origin.y, width: r.width, height: r.height)
      cfg.width = Int(r.width) * 2; cfg.height = Int(r.height) * 2
    } else {
      filter = SCContentFilter(desktopIndependentWindow: w)
      cfg.width = Int(w.frame.width) * 2; cfg.height = Int(w.frame.height) * 2
    }
    let img = try await SCScreenshotManager.captureImage(contentFilter: filter, configuration: cfg)
    let url = URL(fileURLWithPath: out) as CFURL
    guard let dest = CGImageDestinationCreateWithURL(url, UTType.png.identifier as CFString, 1, nil) else { print("cannot write \(out)"); exit(2) }
    CGImageDestinationAddImage(dest, img, nil)
    print(CGImageDestinationFinalize(dest) ? "wrote \(out) (\(img.width)×\(img.height))" : "write failed")
  } catch { print("capture failed:", error); exit(2) }
  sem.signal()
}
_ = sem.wait(timeout: .now() + 20)
