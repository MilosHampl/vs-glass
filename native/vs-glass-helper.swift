// vs-glass-helper — the window slab of VS Glass (macOS 26 and newer).
//
// A tiny separate process that keeps a real Liquid Glass plane directly under every window of one VS Code instance.
// The plane is composited by the OS, so it bends and colour-splits whatever is *live* behind the window — other
// windows, video, the desktop — the way the in-window rims bend the workbench. Nothing is screen-captured.
//
// Why a separate process: VS Code's main process runs with the hardened runtime and library validation on, so no
// extension can load native code into it, and the compositor's glass exists only as native views. So the slab is a
// transparent, click-through, shadowless window of its own, ordered just below the VS Code window and kept in sync
// with its frame from the window list (frames at up to 120 Hz while something moves, 20 Hz at rest, and at once
// when an application is activated, deactivated or the Space changes).
//
// How the optics are made: AppKit's NSGlassEffectView carries a CoreAnimation backdrop layer with a `glassBackground`
// filter. By default the helper keeps Apple's own Clear material (its blur and face) and only retunes the rim
// refraction, samples at full resolution and adds chromatic-aberration bands driven by live shape masks; the
// "clear-plane" body turns blur and face off so the body is a pixel-exact pass-through. These filter
// keys are CoreAnimation's undocumented ones (the same AppKit sets); if a future macOS drops them the helper exits
// with status 3 and the extension falls back to the plain see-through window.
//
//   vs-glass-helper --pid <VS Code main pid> --state <user-data/vs-glass> [--params <file>] [--verbose]
//   vs-glass-helper --version
//
// Parameters are read from <state>/window-glass.json (rewritten live by the extension; `enabled: false` or a missing
// file ends the helper). One helper serves one VS Code instance: a lock in the state folder makes later starts exit.
import AppKit
import QuartzCore
import Darwin

let VERSION = "1.2.0" // kept equal to package.json by scripts/build-helper.sh

let timeFormat: DateFormatter = { let f = DateFormatter(); f.dateFormat = "HH:mm:ss.SSS"; return f }()
func say(_ s: String) { FileHandle.standardOutput.write("\(timeFormat.string(from: Date())) \(s)\n".data(using: .utf8)!) }

// ---- arguments -----------------------------------------------------------------------------------------------------
var targetPid: Int32 = 0, stateDir = "", paramsPath = "", verbose = false
var argIt = CommandLine.arguments.dropFirst().makeIterator()
while let a = argIt.next() {
  switch a {
  case "--version": print(VERSION); exit(0)
  case "--pid": targetPid = Int32(argIt.next() ?? "") ?? 0
  case "--state": stateDir = argIt.next() ?? ""
  case "--params": paramsPath = argIt.next() ?? ""
  case "--verbose": verbose = true
  default: FileHandle.standardError.write("vs-glass-helper: unknown option \(a)\n".data(using: .utf8)!); exit(64)
  }
}
guard targetPid > 0, !stateDir.isEmpty else {
  print("usage: vs-glass-helper --pid <VS Code main pid> --state <user-data/vs-glass dir> [--params <file>] [--verbose]"); exit(64)
}
if paramsPath.isEmpty { paramsPath = stateDir + "/window-glass.json" }

// ---- capability check (exit 3 = this macOS cannot do it) ------------------------------------------------------------
let app = NSApplication.shared
app.setActivationPolicy(.accessory)
// (globals, not guard-bound locals: the Slab class below refers to them)
let glassClass: NSView.Type = {
  guard let c = NSClassFromString("NSGlassEffectView") as? NSView.Type else { say("unsupported: no NSGlassEffectView (Liquid Glass needs macOS 26)"); exit(3) }
  return c
}()
let caFilterClass: NSObject.Type = {
  guard let c = NSClassFromString("CAFilter") as? NSObject.Type else { say("unsupported: CoreAnimation has no CAFilter"); exit(3) }
  return c
}()
let filterTypes: [String] = (caFilterClass.perform(NSSelectorFromString("filterTypes"))?.takeUnretainedValue() as? [String]) ?? []
if !filterTypes.contains("glassBackground") { say("unsupported: CoreAnimation has no glassBackground filter"); exit(3) }
let chromaAvailable = filterTypes.contains("chromaticAberrationMap")
func makeFilter(_ type: String) -> NSObject? { caFilterClass.perform(NSSelectorFromString("filterWithType:"), with: type)?.takeUnretainedValue() as? NSObject }
let backdropClass: AnyClass? = NSClassFromString("CABackdropLayer")

// ---- one helper per VS Code instance --------------------------------------------------------------------------------
let lockFd = open(stateDir + "/window-glass.lock", O_CREAT | O_RDWR, 0o644)
if lockFd < 0 || flock(lockFd, LOCK_EX | LOCK_NB) != 0 { say("another vs-glass-helper already serves pid \(targetPid); nothing to do"); exit(0) }
let pidPath = stateDir + "/window-glass.pid"
try? "\(getpid())\n".write(toFile: pidPath, atomically: true, encoding: .utf8)
func quit(_ why: String) -> Never { say(why); try? FileManager.default.removeItem(atPath: pidPath); exit(0) }

// ---- parameters (written by the extension) --------------------------------------------------------------------------
struct Params: Equatable {
  var enabled = true
  var radius: CGFloat = 20          // the window's corner radius (--vsg-radius-window)
  var margin: CGFloat = 40          // slab window outset, so the rim can pull pixels from beyond the window edge
  var refraction = -60.0            // glassBackground inner refraction amount (Apple's clear style uses -60)
  var refractionHeight = 20.0       // ... over this many points from the rim
  var chroma = 0.0                  // chromatic aberration at the rim, in points (0 = off)
  var chromaBand = 12.0             // width of each aberration band from the rim, in points
  var chromaLevels = 1              // number of bands (each further band gets a proportionally smaller offset)
  /// What the body of the slab is: Apple's stock Clear material (blur 10, a light face), Apple's stock Regular
  /// material (blur 4, a darker face) or a pixel-exact pass-through with only the rim bending ("clear-plane").
  var body = "apple-clear"
}
func loadParams() -> Params? {
  guard let d = FileManager.default.contents(atPath: paramsPath), let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any] else { return nil }
  var p = Params()
  if let v = o["enabled"] as? Bool { p.enabled = v }
  if let v = o["radius"] as? Double { p.radius = CGFloat(max(0, min(60, v))) }
  if let v = o["margin"] as? Double { p.margin = CGFloat(max(0, min(200, v))) }
  if let v = o["refraction"] as? Double { p.refraction = max(-400, min(400, v)) }
  if let v = o["refractionHeight"] as? Double { p.refractionHeight = max(0, min(200, v)) }
  if let v = o["chroma"] as? Double { p.chroma = max(0, min(12, v)) }
  if let v = o["chromaBand"] as? Double { p.chromaBand = max(1, min(80, v)) }
  if let v = o["chromaLevels"] as? Double { p.chromaLevels = Int(max(0, min(4, v))) }
  if let v = o["body"] as? String, ["apple-clear", "apple-regular", "clear-plane"].contains(v) { p.body = v }
  return p
}
guard var params = loadParams(), params.enabled else { quit("window glass is off (\(paramsPath) missing or disabled); nothing to do") }
var paramsMtime = (try? FileManager.default.attributesOfItem(atPath: paramsPath)[.modificationDate] as? Date) ?? Date()

// ---- geometry helpers -----------------------------------------------------------------------------------------------
var primaryHeight: CGFloat { NSScreen.screens.first?.frame.height ?? 0 }
/** Window-list bounds (top-left origin, global) → AppKit frame (bottom-left origin). */
func appKitFrame(_ r: CGRect) -> NSRect { NSRect(x: r.minX, y: primaryHeight - r.maxY, width: r.width, height: r.height) }
func roundedPath(_ rect: CGRect, _ radius: CGFloat) -> CGPath {
  let r = max(0, min(radius, min(rect.width, rect.height) / 2))
  return r > 0 ? CGPath(roundedRect: rect, cornerWidth: r, cornerHeight: r, transform: nil) : CGPath(rect: rect, transform: nil)
}

// ---- a slab: one glass window under one VS Code window ------------------------------------------------------------------
final class Slab: NSObject {
  let target: CGWindowID
  let win: NSWindow
  let glass: NSView
  var bounds = CGRect.zero              // the target's window-list bounds
  var missingSince: Date? = nil
  var refusedFor: CGRect? = nil         // bounds at which the window server put the slab ABOVE its window; stay hidden until they change
  private var masks: [CAShapeLayer] = []
  private var maskSize = CGSize.zero
  private var applied = Params()
  private var expectedFilters = 0
  private var expectedBlur = 10.0
  private var observed: CALayer?
  private var applying = false
  var resets = 0

  init(target: CGWindowID, frame: NSRect, p: Params) {
    self.target = target
    win = NSWindow(contentRect: frame, styleMask: .borderless, backing: .buffered, defer: false)
    win.isOpaque = false; win.backgroundColor = .clear; win.hasShadow = false
    win.ignoresMouseEvents = true; win.level = .normal; win.hidesOnDeactivate = false
    // no fullScreenAuxiliary: a window that joins a native full-screen Space is placed ABOVE the full-screen window,
    // and a slab over the editor is the one thing this must never do
    win.collectionBehavior = [.transient, .ignoresCycle]
    win.isReleasedWhenClosed = false; win.animationBehavior = .none; win.isExcludedFromWindowsMenu = true
    let root = NSView(frame: NSRect(origin: .zero, size: frame.size)); root.wantsLayer = true
    glass = glassClass.init(frame: root.bounds.insetBy(dx: p.margin, dy: p.margin))
    glass.autoresizingMask = [.width, .height]
    root.addSubview(glass); win.contentView = root
    super.init()
  }
  deinit { observed?.removeObserver(self, forKeyPath: "filters") }
  var windowID: CGWindowID { CGWindowID(win.windowNumber) }

  /** The CABackdropLayer inside the glass view's (SwiftUI-hosted) layer tree. */
  func backdrop() -> CALayer? {
    guard let bd = backdropClass, let l0 = glass.layer else { return nil }
    var stack = [l0]
    while let l = stack.popLast() { if l.isKind(of: bd) { return l }; stack.append(contentsOf: l.sublayers ?? []) }
    return nil
  }

  /** Tune the glass: pass-through body, rim refraction, aberration bands. False when the filter is not where we expect. */
  @discardableResult func apply(_ p: Params) -> Bool {
    glass.setValue(p.body == "apple-regular" ? 0 : 1, forKey: "style")   // NSGlassEffectView.Style: regular = 0, clear = 1
    glass.setValue(p.radius, forKey: "cornerRadius")
    if let root = win.contentView { glass.frame = root.bounds.insetBy(dx: p.margin, dy: p.margin) }
    win.contentView?.layoutSubtreeIfNeeded(); win.displayIfNeeded()
    guard let bd = backdrop(), let existing = bd.filters as? [NSObject],
          let bg0 = existing.first(where: { ($0.value(forKey: "type") as? String) == "glassBackground" }),
          let bg = bg0.mutableCopy() as? NSObject else { return false }
    // the body: Apple's own numbers for its two styles (read from a live NSGlassEffectView), or nothing at all
    switch p.body {
    case "clear-plane": expectedBlur = 0; bg.setValue(0.0, forKey: "inputBlurRadius"); bg.setValue(0.0, forKey: "inputFaceOpacity")
    case "apple-regular": expectedBlur = 4; bg.setValue(4.0, forKey: "inputBlurRadius"); bg.setValue(1.0, forKey: "inputFaceOpacity")
    default: expectedBlur = 10; bg.setValue(10.0, forKey: "inputBlurRadius"); bg.setValue(1.0, forKey: "inputFaceOpacity")
    }
    bg.setValue(p.refraction, forKey: "inputInnerRefractionAmount")
    bg.setValue(p.refractionHeight, forKey: "inputInnerRefractionHeight")
    bg.setValue(0.0, forKey: "inputOuterRefractionAmount")
    bg.setValue(0.0, forKey: "inputOuterRefractionHeight")
    bd.setValue(1.0, forKey: "scale")               // Apple samples the backdrop at half resolution; we want it exact
    var chain: [NSObject] = [bg]
    for m in masks { m.removeFromSuperlayer() }
    masks = []
    if chromaAvailable && p.chroma > 0 && p.chromaLevels > 0 {
      for level in 0..<p.chromaLevels {
        let d = p.chroma * (1 - Double(level) / Double(p.chromaLevels))
        // red is pulled towards the centre, blue away from it, on every edge; corners get both axes
        for (dir, vec) in [("L", CGPoint(x: d, y: 0)), ("R", CGPoint(x: -d, y: 0)), ("T", CGPoint(x: 0, y: -d)), ("B", CGPoint(x: 0, y: d))] {
          guard let f = makeFilter("chromaticAberrationMap") else { continue }
          let m = CAShapeLayer(); m.name = "@vsg\(dir)\(level)"; m.fillColor = CGColor(gray: 1, alpha: 1); m.frame = bd.bounds
          bd.addSublayer(m); masks.append(m)
          f.setValue(m.name, forKey: "inputSourceSublayerName")
          f.setValue(1.0, forKey: "inputAmount")
          f.setValue(NSValue(point: NSPoint(x: vec.x, y: vec.y)), forKey: "inputOffset")
          chain.append(f)
        }
      }
    }
    applying = true; bd.filters = chain; applying = false
    expectedFilters = chain.count
    applied = p
    layoutMasks(force: true)
    // the system rebuilds this filter chain now and then (activation, appearance); put ours back in the same turn
    if observed !== bd { observed?.removeObserver(self, forKeyPath: "filters"); bd.addObserver(self, forKeyPath: "filters", options: [], context: nil); observed = bd }
    return true
  }
  override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey: Any]?, context: UnsafeMutableRawPointer?) {
    guard keyPath == "filters", !applying else { return }
    resets += 1
    if drifted() { apply(applied) }
  }

  /** Band masks follow the glass shape: ring `level` of the rounded rectangle, split per edge so each edge has its own axis. */
  func layoutMasks(force: Bool = false) {
    guard !masks.isEmpty, let bd = backdrop() else { return }
    let size = bd.bounds.size
    if !force && size == maskSize { return }
    maskSize = size
    let W = size.width, H = size.height, r = applied.radius, w = CGFloat(applied.chromaBand)
    for m in masks {
      m.frame = bd.bounds
      guard let name = m.name, name.count >= 6, let level = Int(name.dropFirst(5)) else { continue }
      let dir = name[name.index(name.startIndex, offsetBy: 4)]
      let d0 = CGFloat(level) * w, d1 = CGFloat(level + 1) * w
      let ring = roundedPath(CGRect(x: 0, y: 0, width: W, height: H).insetBy(dx: d0, dy: d0), r - d0)
      let hole = roundedPath(CGRect(x: 0, y: 0, width: W, height: H).insetBy(dx: d1, dy: d1), r - d1)
      let reach = d1 + r / 2 // a little past the band so the rounded corners are covered by both neighbouring edges
      let strip: CGRect
      switch dir {
      case "L": strip = CGRect(x: 0, y: 0, width: reach, height: H)
      case "R": strip = CGRect(x: W - reach, y: 0, width: reach, height: H)
      case "T": strip = CGRect(x: 0, y: H - reach, width: W, height: reach)
      default: strip = CGRect(x: 0, y: 0, width: W, height: reach)
      }
      m.path = ring.intersection(CGPath(rect: strip, transform: nil)).subtracting(hole)
    }
  }

  /** Did the system rebuild the glass view's filters (appearance change, style reset)? */
  func drifted() -> Bool {
    guard let bd = backdrop(), let f = bd.filters as? [NSObject], f.count == expectedFilters, let first = f.first else { return true }
    if (first.value(forKey: "inputBlurRadius") as? Double) != expectedBlur { return true }
    if !masks.isEmpty && masks.contains(where: { $0.superlayer == nil }) { return true }
    return false
  }
}

// ---- the window list --------------------------------------------------------------------------------------------------
/** Every on-screen, layer-0, non-fullscreen window of the target, front to back, plus the full front-to-back order of layer-0 windows. */
func fullList() -> (targets: [(CGWindowID, CGRect)], order: [CGWindowID]) {
  guard let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] else { return ([], []) }
  let screens = NSScreen.screens.map { CGRect(x: $0.frame.minX, y: primaryHeight - $0.frame.maxY, width: $0.frame.width, height: $0.frame.height) }
  var targets: [(CGWindowID, CGRect)] = [], order: [CGWindowID] = []
  for w in list {
    guard let n = w[kCGWindowNumber as String] as? Int, let owner = w[kCGWindowOwnerPID as String] as? Int, let layer = w[kCGWindowLayer as String] as? Int, layer == 0 else { continue }
    order.append(CGWindowID(n))
    guard Int32(owner) == targetPid, let b = w[kCGWindowBounds as String] as? [String: CGFloat], (w[kCGWindowAlpha as String] as? Double ?? 1) > 0 else { continue }
    let r = CGRect(x: b["X"] ?? 0, y: b["Y"] ?? 0, width: b["Width"] ?? 0, height: b["Height"] ?? 0)
    if r.width < 200 || r.height < 120 { continue }                       // tooltips, drag images
    // a native full-screen window gets a slab too: with Apple's material as the body the frost over that Space's
    // wallpaper is the point, even though the rim sits on the screen edge (only a clear-plane body has nothing to show)
    if screens.contains(where: { $0.equalTo(r) }) && params.body == "clear-plane" { continue }
    targets.append((CGWindowID(n), r))
  }
  return (targets, order)
}
/** Frames of already-known windows only (much cheaper than the full list). */
func frames(of ids: [CGWindowID]) -> [(CGWindowID, CGRect)] {
  guard !ids.isEmpty, let list = CGWindowListCreateDescriptionFromArray(ids as CFArray) as? [[String: Any]] else { return [] }
  return list.compactMap { w in
    guard let n = w[kCGWindowNumber as String] as? Int, let b = w[kCGWindowBounds as String] as? [String: CGFloat] else { return nil }
    return (CGWindowID(n), CGRect(x: b["X"] ?? 0, y: b["Y"] ?? 0, width: b["Width"] ?? 0, height: b["Height"] ?? 0))
  }
}

// ---- main loop --------------------------------------------------------------------------------------------------------
var slabs: [CGWindowID: Slab] = [:]
var targets: [(CGWindowID, CGRect)] = [], order: [CGWindowID] = []
var lastFull = Date.distantPast, lastParams = Date(), lastMotion = Date(), lastDrift = Date()
var reorders = 0, frameUpdates = 0

func reloadParams() {
  let m = (try? FileManager.default.attributesOfItem(atPath: paramsPath)[.modificationDate] as? Date)
  guard m != paramsMtime else { return }
  paramsMtime = m ?? Date()
  guard let p = loadParams(), p.enabled else { quit("window glass turned off; bye") }
  if p != params {
    params = p
    for s in slabs.values { s.apply(params) }
    say("parameters updated: body \(params.body) radius \(params.radius) refraction \(params.refraction)/\(params.refractionHeight) chroma \(params.chroma)×\(params.chromaLevels) band \(params.chromaBand)")
  }
}

func tick() {
  let t = Date()
  if kill(targetPid, 0) != 0 { quit("VS Code (pid \(targetPid)) exited; bye") }
  if t.timeIntervalSince(lastParams) > 0.5 { lastParams = t; reloadParams() }
  let full = t.timeIntervalSince(lastFull) > 0.25
  if full { lastFull = t; (targets, order) = fullList() } else { targets = frames(of: targets.map { $0.0 }) }
  var seen = Set<CGWindowID>()
  for (wid, r) in targets {
    seen.insert(wid)
    let frame = appKitFrame(r).insetBy(dx: -params.margin, dy: -params.margin)
    let slab: Slab
    if let s = slabs[wid] { slab = s } else {
      slab = Slab(target: wid, frame: frame, p: params); slabs[wid] = slab
      var ok = slab.apply(params)
      slab.win.order(.below, relativeTo: Int(wid))
      if !ok { ok = slab.apply(params) }
      say("slab \(slab.windowID) under window \(wid) (\(Int(r.width))×\(Int(r.height))), filters \(ok ? "tuned" : "NOT found — stock glass")")
    }
    slab.missingSince = nil
    if slab.bounds != r { slab.win.setFrame(frame, display: false); slab.bounds = r; frameUpdates += 1; lastMotion = t; slab.layoutMasks(); slab.refusedFor = nil }
    if full {
      if let idx = order.firstIndex(of: wid) {
        if slab.refusedFor == r { /* the window server will not take a slab under this window at these bounds (native full screen); it stays hidden until the window moves or resizes */ }
        else if let si = order.firstIndex(of: slab.windowID), si < idx {
          // the slab came out ABOVE its window: hide it at once — glass over the editor is never acceptable
          slab.win.orderOut(nil); slab.refusedFor = r
          say("window \(wid) will not take a slab underneath at \(Int(r.width))×\(Int(r.height)) (native full screen?); the slab stays hidden until it moves or resizes")
        } else {
          let below: CGWindowID = idx + 1 < order.count ? order[idx + 1] : 0
          if below != slab.windowID { slab.win.order(.below, relativeTo: Int(wid)); reorders += 1 }
        }
      } else if !slab.win.isVisible && slab.refusedFor == nil { slab.win.order(.below, relativeTo: Int(wid)) }
    }
  }
  if full {
    for (wid, s) in slabs where !seen.contains(wid) {
      if s.win.isVisible { s.win.orderOut(nil); if verbose { say("hid slab for window \(wid) (off screen, minimised or on another Space)") } }
      if s.missingSince == nil { s.missingSince = t }
      else if t.timeIntervalSince(s.missingSince!) > 60 { s.win.close(); slabs[wid] = nil; if verbose { say("dropped slab for window \(wid)") } }
    }
  }
  if t.timeIntervalSince(lastDrift) > 0.25 {
    lastDrift = t
    for s in slabs.values where s.drifted() { s.apply(params); s.resets += 1; if verbose { say("re-applied the filters for window \(s.target) (the system had reset them)") } }
  }
}

// z-order changes when an application is activated or deactivated: refresh the full list at once instead of on the next poll
for name in [NSWorkspace.didActivateApplicationNotification, NSWorkspace.didDeactivateApplicationNotification, NSWorkspace.activeSpaceDidChangeNotification] {
  NSWorkspace.shared.notificationCenter.addObserver(forName: name, object: nil, queue: .main) { _ in lastFull = .distantPast; lastMotion = Date() }
}
say("vs-glass-helper \(VERSION) serving VS Code pid \(targetPid) (chroma filter \(chromaAvailable ? "available" : "unavailable")); params \(paramsPath)")
var lastReport = Date()
while true {
  let active = Date().timeIntervalSince(lastMotion) < 0.75
  RunLoop.main.run(until: Date().addingTimeInterval(active ? 1.0 / 120 : 1.0 / 20))
  tick()
  if verbose && Date().timeIntervalSince(lastReport) > 5 {
    lastReport = Date()
    for (wid, s) in slabs { say("report: window \(wid) z=\(order.firstIndex(of: wid).map(String.init) ?? "-") slab \(s.windowID) z=\(order.firstIndex(of: s.windowID).map(String.init) ?? "-") visible=\(s.win.isVisible) reorders=\(reorders) frameUpdates=\(frameUpdates) filterResets=\(s.resets)") }
  }
}
