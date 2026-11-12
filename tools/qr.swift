import Foundation
import CoreImage
import AppKit
// qr <text> <out.svg> : QR code (error correction M) as a crisp SVG with a 4-module quiet zone,
// then decodes its own output with CIDetector to prove it scans back to <text>.
let a = CommandLine.arguments
guard a.count == 3 else { FileHandle.standardError.write("usage: qr <text> <out.svg>\n".data(using: .utf8)!); exit(1) }
let f = CIFilter(name: "CIQRCodeGenerator")!
f.setValue(a[1].data(using: .utf8), forKey: "inputMessage")
f.setValue("M", forKey: "inputCorrectionLevel")
let ci = f.outputImage!
let cg = CIContext().createCGImage(ci, from: ci.extent)!
let w = cg.width, h = cg.height
var px = [UInt8](repeating: 255, count: w * h)
let g = CGContext(data: &px, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w, space: CGColorSpaceCreateDeviceGray(), bitmapInfo: 0)!
g.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
// trim the generator's own margin, then add a standard 4-module quiet zone
var minX = w, minY = h, maxX = -1, maxY = -1
for y in 0..<h { for x in 0..<w where px[y * w + x] < 128 { minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y) } }
let n = maxX - minX + 1, q = 4, size = n + 2 * q
var dark = [[Bool]](repeating: [Bool](repeating: false, count: n), count: n)
for y in 0..<n { for x in 0..<n { dark[y][x] = px[(minY + y) * w + (minX + x)] < 128 } }
var path = ""
for y in 0..<n { var x = 0; while x < n { if dark[y][x] { var e = x; while e < n && dark[y][e] { e += 1 }; path += "M\(x + q) \(y + q)h\(e - x)v1h-\(e - x)z"; x = e } else { x += 1 } } }
let svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 \(size) \(size)\" shape-rendering=\"crispEdges\"><rect width=\"\(size)\" height=\"\(size)\" fill=\"#fff\"/><path fill=\"#000\" d=\"\(path)\"/></svg>\n"
try! svg.write(toFile: a[2], atomically: true, encoding: .utf8)
// self-check: rebuild a bitmap from the module matrix exactly as written to the SVG and decode it
let s = 12, W = size * s
var img = [UInt8](repeating: 255, count: W * W)
for y in 0..<n { for x in 0..<n where dark[y][x] { for dy in 0..<s { for dx in 0..<s { img[((y + q) * s + dy) * W + (x + q) * s + dx] = 0 } } } }
let prov = CGDataProvider(data: Data(img) as CFData)!
let chk = CGImage(width: W, height: W, bitsPerComponent: 8, bitsPerPixel: 8, bytesPerRow: W, space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGBitmapInfo(rawValue: 0), provider: prov, decode: nil, shouldInterpolate: false, intent: .defaultIntent)!
let det = CIDetector(ofType: CIDetectorTypeQRCode, context: nil, options: [CIDetectorAccuracy: CIDetectorAccuracyHigh])!
let got = (det.features(in: CIImage(cgImage: chk)).first as? CIQRCodeFeature)?.messageString ?? "(none)"
print("modules \(n)x\(n), decodes to: \(got)")
exit(got == a[1] ? 0 : 2)
