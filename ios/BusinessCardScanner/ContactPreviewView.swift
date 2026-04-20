import SwiftUI

struct ContactPreviewView: View {
    @Binding var contact: ParsedContact
    let onSave: (ParsedContact) -> Void
    let onDismiss: () -> Void

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                header
                    .padding(.bottom, 24)

                group(title: "Name") {
                    field("Vorname", text: $contact.firstName, icon: "person")
                    field("Nachname", text: $contact.lastName, icon: "person.fill")
                    field("Position / Titel", text: $contact.jobTitle, icon: "briefcase")
                    field("Unternehmen", text: $contact.company, icon: "building.2")
                }

                group(title: "Kontakt") {
                    field("Telefon", text: $contact.phone, icon: "phone", keyboard: .phonePad)
                    field("Mobil", text: $contact.mobile, icon: "iphone", keyboard: .phonePad)
                    field("E-Mail", text: $contact.email, icon: "envelope", keyboard: .emailAddress)
                    field("Website", text: $contact.website, icon: "globe", keyboard: .URL)
                }

                group(title: "Adresse") {
                    field("Straße & Hausnummer", text: $contact.street, icon: "map")
                    field("PLZ", text: $contact.postalCode, icon: "number", keyboard: .numberPad)
                    field("Stadt", text: $contact.city, icon: "building.columns")
                    field("Land", text: $contact.country, icon: "flag")
                }

                actionButtons
                    .padding(.top, 24)
                    .padding(.bottom, 40)
            }
            .padding(.horizontal, 16)
            .padding(.top, 24)
        }
        .background(Color(.systemGroupedBackground).ignoresSafeArea())
    }

    // MARK: - Subviews

    private var header: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(Color(red: 0, green: 0, blue: 0.29).opacity(0.1))
                    .frame(width: 72, height: 72)
                Image(systemName: "person.crop.rectangle.fill")
                    .font(.system(size: 32))
                    .foregroundColor(Color(red: 0, green: 0, blue: 0.29))
            }
            Text("Kontakt prüfen & speichern")
                .font(.title3).fontWeight(.semibold)
            Text("Erkannte Daten können direkt bearbeitet werden.")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
    }

    private var actionButtons: some View {
        VStack(spacing: 12) {
            Button {
                UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder),
                                                to: nil, from: nil, for: nil)
                onSave(contact)
            } label: {
                Label("Kontakt speichern", systemImage: "person.badge.plus")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(red: 0, green: 0, blue: 0.29))
                    .foregroundColor(.white)
                    .cornerRadius(12)
                    .font(.headline)
            }

            Button {
                onDismiss()
            } label: {
                Label("Neu scannen", systemImage: "camera")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(.systemGray5))
                    .foregroundColor(.primary)
                    .cornerRadius(12)
            }
        }
    }

    // MARK: - Helpers

    private func group<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title.uppercased())
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(.secondary)
                .padding(.horizontal, 4)
                .padding(.top, 20)
                .padding(.bottom, 4)
            VStack(spacing: 1) {
                content()
            }
            .background(Color(.systemBackground))
            .cornerRadius(12)
        }
    }

    private func field(
        _ label: String,
        text: Binding<String>,
        icon: String,
        keyboard: UIKeyboardType = .default
    ) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .foregroundColor(Color(red: 0, green: 0, blue: 0.29))
                .frame(width: 22)
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                TextField(label, text: text)
                    .keyboardType(keyboard)
                    .autocapitalization(
                        keyboard == .emailAddress || keyboard == .URL ? .none : .words
                    )
                    .autocorrectionDisabled(keyboard != .default)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }
}
