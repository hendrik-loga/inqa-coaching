import Contacts
import Foundation

struct ContactManager {

    static func save(_ contact: ParsedContact) async throws {
        let store = CNContactStore()

        let status = CNContactStore.authorizationStatus(for: .contacts)
        if status == .notDetermined {
            let granted = try await withCheckedThrowingContinuation { continuation in
                store.requestAccess(for: .contacts) { granted, error in
                    if let error = error {
                        continuation.resume(throwing: error)
                    } else {
                        continuation.resume(returning: granted)
                    }
                }
            }
            guard granted else { throw ContactError.accessDenied }
        } else if status != .authorized {
            throw ContactError.accessDenied
        }

        let cn = CNMutableContact()
        cn.givenName = contact.firstName
        cn.familyName = contact.lastName
        cn.jobTitle = contact.jobTitle
        cn.organizationName = contact.company

        if !contact.email.isEmpty {
            cn.emailAddresses = [CNLabeledValue(label: CNLabelWork, value: contact.email as NSString)]
        }

        var phones: [CNLabeledValue<CNPhoneNumber>] = []
        if !contact.phone.isEmpty {
            phones.append(CNLabeledValue(label: CNLabelWork,
                                         value: CNPhoneNumber(stringValue: contact.phone)))
        }
        if !contact.mobile.isEmpty {
            phones.append(CNLabeledValue(label: CNLabelPhoneNumberMobile,
                                          value: CNPhoneNumber(stringValue: contact.mobile)))
        }
        cn.phoneNumbers = phones

        if !contact.website.isEmpty {
            cn.urlAddresses = [CNLabeledValue(label: CNLabelWork, value: contact.website as NSString)]
        }

        if !contact.street.isEmpty || !contact.city.isEmpty {
            let address = CNMutablePostalAddress()
            address.street = contact.street
            address.city = contact.city
            address.postalCode = contact.postalCode
            address.country = contact.country.isEmpty ? "Deutschland" : contact.country
            cn.postalAddresses = [CNLabeledValue(label: CNLabelWork, value: address)]
        }

        let request = CNSaveRequest()
        request.add(cn, toContainerWithIdentifier: nil)
        try store.execute(request)
    }

    enum ContactError: LocalizedError {
        case accessDenied

        var errorDescription: String? {
            "Zugriff auf Kontakte verweigert. Bitte erlauben Sie den Zugriff unter Einstellungen → Datenschutz → Kontakte."
        }
    }
}
