import SwiftUI
import Vision

@MainActor
final class CardScannerViewModel: ObservableObject {

    @Published var isProcessing = false
    @Published var parsedContact: ParsedContact?
    @Published var showContactPreview = false
    @Published var showError = false
    @Published var showSuccess = false
    @Published var errorMessage = ""

    let camera = CameraViewController()

    init() {
        camera.onPhotoCaptured = { [weak self] image in
            Task { @MainActor [weak self] in
                await self?.recognizeText(in: image)
            }
        }
        camera.onSetupError = { [weak self] message in
            Task { @MainActor [weak self] in
                self?.showErrorAlert(message)
                self?.isProcessing = false
            }
        }
    }

    func capturePhoto() {
        isProcessing = true
        camera.capturePhoto()
    }

    func saveContact(_ contact: ParsedContact) {
        Task {
            do {
                try await ContactManager.save(contact)
                showSuccess = true
            } catch {
                showErrorAlert(error.localizedDescription)
            }
        }
    }

    func resetScan() {
        parsedContact = nil
        showContactPreview = false
        showSuccess = false
    }

    // MARK: - Private

    private func recognizeText(in image: UIImage) async {
        guard let cgImage = image.cgImage else {
            isProcessing = false
            return
        }

        await withCheckedContinuation { continuation in
            let request = VNRecognizeTextRequest { [weak self] request, error in
                Task { @MainActor [weak self] in
                    defer { continuation.resume() }
                    guard let self else { return }

                    if let error {
                        self.showErrorAlert("Texterkennung fehlgeschlagen: \(error.localizedDescription)")
                        self.isProcessing = false
                        return
                    }

                    let observations = request.results as? [VNRecognizedTextObservation] ?? []
                    let rawText = observations
                        .compactMap { $0.topCandidates(1).first?.string }
                        .joined(separator: "\n")

                    let contact = BusinessCardParser.parse(from: rawText)
                    self.parsedContact = contact
                    self.showContactPreview = true
                    self.isProcessing = false
                }
            }

            request.recognitionLanguages = ["de-DE", "en-US"]
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true
            request.automaticallyDetectsLanguage = true

            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            DispatchQueue.global(qos: .userInitiated).async {
                try? handler.perform([request])
            }
        }
    }

    private func showErrorAlert(_ message: String) {
        errorMessage = message
        showError = true
    }
}
