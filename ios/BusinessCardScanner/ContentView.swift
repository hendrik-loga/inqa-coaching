import SwiftUI

struct ContentView: View {
    @StateObject private var viewModel = CardScannerViewModel()

    var body: some View {
        NavigationView {
            ZStack {
                if viewModel.showContactPreview, viewModel.parsedContact != nil {
                    ContactPreviewView(
                        contact: Binding(
                            get: { viewModel.parsedContact ?? ParsedContact() },
                            set: { viewModel.parsedContact = $0 }
                        ),
                        onSave: { viewModel.saveContact($0) },
                        onDismiss: { viewModel.resetScan() }
                    )
                    .transition(.move(edge: .bottom))
                } else {
                    ScannerView(viewModel: viewModel)
                        .transition(.opacity)
                }
            }
            .animation(.easeInOut(duration: 0.3), value: viewModel.showContactPreview)
            .navigationTitle("Visitenkarten Scanner")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbarBackground(Color(red: 0, green: 0, blue: 0.29), for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
        }
        .navigationViewStyle(.stack)
        .alert("Fehler", isPresented: $viewModel.showError) {
            Button("OK") { viewModel.showError = false }
        } message: {
            Text(viewModel.errorMessage)
        }
        .alert("Kontakt gespeichert", isPresented: $viewModel.showSuccess) {
            Button("Neuer Scan") { viewModel.resetScan() }
        } message: {
            Text("Der Kontakt wurde erfolgreich zu Ihren Kontakten hinzugefügt.")
        }
    }
}
