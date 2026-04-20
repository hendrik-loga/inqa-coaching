import Foundation

struct ParsedContact {
    var firstName: String = ""
    var lastName: String = ""
    var jobTitle: String = ""
    var company: String = ""
    var email: String = ""
    var phone: String = ""
    var mobile: String = ""
    var website: String = ""
    var street: String = ""
    var city: String = ""
    var postalCode: String = ""
    var country: String = ""

    var fullName: String {
        [firstName, lastName].filter { !$0.isEmpty }.joined(separator: " ")
    }

    var isEmpty: Bool {
        [firstName, lastName, email, phone, company].allSatisfy { $0.isEmpty }
    }
}
