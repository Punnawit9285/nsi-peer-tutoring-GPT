import Foundation
import PDFKit
// pdftext <pdf>  ->  one line per page: "<page>\t<text with whitespace collapsed>"
let a = CommandLine.arguments
guard a.count == 2, let doc = PDFDocument(url: URL(fileURLWithPath: a[1])) else {
    FileHandle.standardError.write("usage: pdftext <pdf>\n".data(using: .utf8)!); exit(1)
}
for i in 0..<doc.pageCount {
    let t = (doc.page(at: i)?.string ?? "").components(separatedBy: .whitespacesAndNewlines).filter { !$0.isEmpty }.joined(separator: " ")
    print("\(i + 1)\t\(t)")
}
