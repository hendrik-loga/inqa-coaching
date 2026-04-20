import UIKit
import AVFoundation
import SwiftUI

final class CameraViewController: UIViewController {

    private var captureSession: AVCaptureSession?
    private var photoOutput = AVCapturePhotoOutput()
    private var previewLayer: AVCaptureVideoPreviewLayer?

    var onPhotoCaptured: ((UIImage) -> Void)?
    var onSetupError: ((String) -> Void)?

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        setupSession()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        startSession()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        stopSession()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.bounds
    }

    // MARK: - Session setup

    private func setupSession() {
        guard AVCaptureDevice.authorizationStatus(for: .video) != .denied else { return }

        let session = AVCaptureSession()
        session.sessionPreset = .photo

        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back) else {
            onSetupError?("Keine Rückkamera gefunden.")
            return
        }

        do {
            let input = try AVCaptureDeviceInput(device: camera)
            guard session.canAddInput(input) else {
                onSetupError?("Kamera-Input konnte nicht hinzugefügt werden.")
                return
            }
            session.addInput(input)

            guard session.canAddOutput(photoOutput) else {
                onSetupError?("Foto-Output konnte nicht hinzugefügt werden.")
                return
            }
            session.addOutput(photoOutput)

            let layer = AVCaptureVideoPreviewLayer(session: session)
            layer.frame = view.bounds
            layer.videoGravity = .resizeAspectFill
            view.layer.addSublayer(layer)
            previewLayer = layer

            captureSession = session
        } catch {
            onSetupError?("Kamera-Fehler: \(error.localizedDescription)")
        }
    }

    private func startSession() {
        guard let session = captureSession, !session.isRunning else { return }
        DispatchQueue.global(qos: .userInitiated).async {
            session.startRunning()
        }
    }

    private func stopSession() {
        guard let session = captureSession, session.isRunning else { return }
        DispatchQueue.global(qos: .userInitiated).async {
            session.stopRunning()
        }
    }

    // MARK: - Capture

    func capturePhoto() {
        let settings = AVCapturePhotoSettings()
        photoOutput.capturePhoto(with: settings, delegate: self)
    }
}

// MARK: - AVCapturePhotoCaptureDelegate

extension CameraViewController: AVCapturePhotoCaptureDelegate {
    func photoOutput(_ output: AVCapturePhotoOutput,
                     didFinishProcessingPhoto photo: AVCapturePhoto,
                     error: Error?) {
        if let error = error {
            onSetupError?("Foto konnte nicht aufgenommen werden: \(error.localizedDescription)")
            return
        }
        guard let data = photo.fileDataRepresentation(),
              let image = UIImage(data: data) else {
            onSetupError?("Foto-Daten konnten nicht gelesen werden.")
            return
        }
        onPhotoCaptured?(image)
    }
}

// MARK: - SwiftUI wrapper

struct CameraPreview: UIViewControllerRepresentable {
    let controller: CameraViewController

    func makeUIViewController(context: Context) -> CameraViewController { controller }
    func updateUIViewController(_ uiViewController: CameraViewController, context: Context) {}
}
