import Foundation

struct BusinessCardParser {

    static func parse(from text: String) -> ParsedContact {
        var contact = ParsedContact()
        let lines = text
            .components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }

        var usedLines = Set<Int>()

        // Extract email
        for (i, line) in lines.enumerated() {
            if let email = extractEmail(from: line) {
                contact.email = email
                usedLines.insert(i)
                break
            }
        }

        // Extract phone numbers
        var phoneNumbers: [String] = []
        for (i, line) in lines.enumerated() where !usedLines.contains(i) {
            let phones = extractPhones(from: line)
            if !phones.isEmpty {
                phoneNumbers.append(contentsOf: phones)
                usedLines.insert(i)
            }
        }
        if phoneNumbers.count >= 1 { contact.phone = phoneNumbers[0] }
        if phoneNumbers.count >= 2 { contact.mobile = phoneNumbers[1] }

        // Extract website
        for (i, line) in lines.enumerated() where !usedLines.contains(i) {
            if let url = extractURL(from: line) {
                contact.website = url
                usedLines.insert(i)
                break
            }
        }

        // Extract company (lines with known company legal forms)
        for (i, line) in lines.enumerated() where !usedLines.contains(i) {
            if containsCompanyIndicator(line) {
                contact.company = line
                usedLines.insert(i)
                break
            }
        }

        // Extract postal address
        for (i, line) in lines.enumerated() where !usedLines.contains(i) {
            if let postal = extractPostalCode(from: line) {
                contact.postalCode = postal
                let cityPart = line
                    .replacingOccurrences(of: postal, with: "")
                    .trimmingCharacters(in: .init(charactersIn: " ,\t"))
                contact.city = cityPart
                usedLines.insert(i)

                if i > 0, !usedLines.contains(i - 1), looksLikeStreet(lines[i - 1]) {
                    contact.street = lines[i - 1]
                    usedLines.insert(i - 1)
                }
                break
            }
        }

        // Extract job title
        for (i, line) in lines.enumerated() where !usedLines.contains(i) {
            if looksLikeJobTitle(line) {
                contact.jobTitle = line
                usedLines.insert(i)
                break
            }
        }

        // Remaining lines: find name
        let remaining = lines.enumerated()
            .filter { !usedLines.contains($0.offset) }
            .map { $0.element }

        if let name = extractName(from: remaining) {
            let parts = name.components(separatedBy: " ").filter { !$0.isEmpty }
            if parts.count >= 2 {
                contact.firstName = parts.dropLast().joined(separator: " ")
                contact.lastName = parts.last ?? ""
            } else {
                contact.lastName = name
            }
        }

        return contact
    }

    // MARK: - Extraction helpers

    private static func extractEmail(from text: String) -> String? {
        firstMatch(pattern: #"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"#, in: text)
    }

    private static func extractPhones(from text: String) -> [String] {
        let pattern = #"(?:\+\d{1,3}[\s\-/]?)?(?:\(0\d{1,4}\)|\d{1,5})[\s\-/\.]?\d{2,5}(?:[\s\-/\.]\d{1,5})*"#
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return [] }
        let range = NSRange(text.startIndex..., in: text)
        return regex.matches(in: text, range: range).compactMap { match -> String? in
            guard let r = Range(match.range, in: text) else { return nil }
            let phone = String(text[r]).trimmingCharacters(in: .whitespacesAndNewlines)
            return phone.filter(\.isNumber).count >= 6 ? phone : nil
        }
    }

    private static func extractURL(from text: String) -> String? {
        guard let raw = firstMatch(
            pattern: #"(?:https?://)?(?:www\.)[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,}(?:/[^\s]*)?"#,
            in: text
        ) else { return nil }
        return raw.hasPrefix("http") ? raw : "https://\(raw)"
    }

    private static func extractPostalCode(from text: String) -> String? {
        firstMatch(pattern: #"(?<!\d)\d{5}(?!\d)"#, in: text)
    }

    private static func containsCompanyIndicator(_ text: String) -> Bool {
        let indicators = ["GmbH", "AG", " KG", "OHG", " SE", "e.V.", "Ltd", "LLC",
                          "Inc.", "Corp.", "GbR", "UG ", "mbH", "Gruppe", "Group",
                          "Verlag", "Consulting", "Solutions", "Services", "Systems"]
        return indicators.contains { text.localizedCaseInsensitiveContains($0) }
    }

    private static func looksLikeStreet(_ text: String) -> Bool {
        let keywords = ["str.", "straße", "strasse", "gasse", "weg", "allee",
                        "platz", "ring", "avenue", "road", "street", "lane"]
        let lower = text.lowercased()
        return keywords.contains { lower.contains($0) }
    }

    private static func looksLikeJobTitle(_ text: String) -> Bool {
        let keywords = ["Manager", "Direktor", "Director", "CEO", "CFO", "CTO", "COO",
                        "Geschäftsführer", "Leiter", "Head of", "Senior", "Junior",
                        "Berater", "Consultant", "Entwickler", "Developer",
                        "Ingenieur", "Engineer", "Architekt", "Architect",
                        "Marketing", "Vertrieb", "Sales", "Human Resources",
                        "Coach", "Trainer", "Referent", "Experte", "Expert",
                        "Projektmanager", "Project Manager", "Analyst", "Designer",
                        "Assistent", "Assistant", "Koordinator", "Coordinator"]
        return keywords.contains { text.localizedCaseInsensitiveContains($0) }
    }

    private static func extractName(from lines: [String]) -> String? {
        for line in lines {
            let words = line.components(separatedBy: " ").filter { !$0.isEmpty }
            guard words.count >= 2, words.count <= 5 else { continue }
            guard !line.contains(where: \.isNumber) else { continue }
            let allStart = words.allSatisfy { w in
                guard let first = w.unicodeScalars.first else { return false }
                return CharacterSet.uppercaseLetters.contains(first)
                    || ["von", "van", "de", "der", "den", "el"].contains(w.lowercased())
            }
            if allStart { return line }
        }
        return lines.first
    }

    private static func firstMatch(pattern: String, in text: String) -> String? {
        guard let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive) else { return nil }
        let range = NSRange(text.startIndex..., in: text)
        guard let match = regex.firstMatch(in: text, range: range),
              let r = Range(match.range, in: text) else { return nil }
        return String(text[r])
    }
}
