import SwiftUI
import AVFoundation

struct ScannerView: View {
    @ObservedObject var viewModel: CardScannerViewModel
    @State private var authStatus = AVCaptureDevice.authorizationStatus(for: .video)

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            switch authStatus {
            case .authorized:
                cameraContent
            case .notDetermined:
                permissionRequestView
            default:
                permissionDeniedView
            }
        }
        .onAppear { requestCameraPermissionIfNeeded() }
    }

    // MARK: - Camera content

    private var cameraContent: some View {
        ZStack {
            CameraPreview(controller: viewModel.camera)
                .ignoresSafeArea()

            // Darkened edges with card-shaped cutout hint
            VStack {
                Spacer()
                cardGuide
                Spacer()
                captureButton
                    .padding(.bottom, 48)
            }

            if viewModel.isProcessing {
                processingOverlay
            }
        }
    }

    private var cardGuide: some View {
        let w = UIScreen.main.bounds.width * 0.86
        let h = w * 0.60  // standard business card aspect ratio

        return ZStack {
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color.white.opacity(0.85), lineWidth: 2)
                .frame(width: w, height: h)

            // Corner accents
            ForEach(Corner.allCases, id: \.self) { corner in
                CornerMark(corner: corner)
                    .frame(width: w, height: h)
            }

            VStack {
                Spacer()
                Text("Visitenkarte in den Rahmen legen")
                    .font(.caption)
                    .foregroundColor(.white)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color.black.opacity(0.55))
                    .cornerRadius(6)
                    .padding(.bottom, 10)
            }
            .frame(width: w, height: h)
        }
    }

    private var captureButton: some View {
        Button(action: { viewModel.capturePhoto() }) {
            ZStack {
                Circle()
                    .fill(Color.white)
                    .frame(width: 76, height: 76)
                Circle()
                    .stroke(Color.white.opacity(0.4), lineWidth: 4)
                    .frame(width: 88, height: 88)
                Image(systemName: "camera.fill")
                    .font(.system(size: 30))
                    .foregroundColor(.black)
            }
        }
        .disabled(viewModel.isProcessing)
        .opacity(viewModel.isProcessing ? 0.5 : 1)
    }

    private var processingOverlay: some View {
        ZStack {
            Color.black.opacity(0.6).ignoresSafeArea()
            VStack(spacing: 16) {
                ProgressView()
                    .progressViewStyle(.circular)
                    .tint(.white)
                    .scaleEffect(1.8)
                Text("Visitenkarte wird analysiert…")
                    .font(.headline)
                    .foregroundColor(.white)
            }
        }
    }

    // MARK: - Permission views

    private var permissionRequestView: some View {
        VStack(spacing: 20) {
            Image(systemName: "camera.fill")
                .font(.system(size: 52))
                .foregroundColor(.white)
            Text("Kamerazugriff benötigt")
                .font(.title2).fontWeight(.semibold)
                .foregroundColor(.white)
            Text("Zum Scannen von Visitenkarten muss die App auf die Kamera zugreifen dürfen.")
                .multilineTextAlignment(.center)
                .foregroundColor(.white.opacity(0.8))
                .padding(.horizontal)
            Button("Zugriff erlauben") {
                AVCaptureDevice.requestAccess(for: .video) { granted in
                    DispatchQueue.main.async {
                        authStatus = granted ? .authorized : .denied
                    }
                }
            }
            .padding(.horizontal, 32)
            .padding(.vertical, 12)
            .background(Color.white)
            .foregroundColor(.black)
            .cornerRadius(10)
        }
    }

    private var permissionDeniedView: some View {
        VStack(spacing: 20) {
            Image(systemName: "camera.slash.fill")
                .font(.system(size: 52))
                .foregroundColor(.white.opacity(0.7))
            Text("Kamerazugriff verweigert")
                .font(.title2).fontWeight(.semibold)
                .foregroundColor(.white)
            Text("Bitte erlauben Sie den Kamerazugriff unter\nEinstellungen → Datenschutz → Kamera.")
                .multilineTextAlignment(.center)
                .foregroundColor(.white.opacity(0.8))
                .padding(.horizontal)
            Button("Einstellungen öffnen") {
                if let url = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(url)
                }
            }
            .padding(.horizontal, 32)
            .padding(.vertical, 12)
            .background(Color.white)
            .foregroundColor(.black)
            .cornerRadius(10)
        }
    }

    // MARK: - Helpers

    private func requestCameraPermissionIfNeeded() {
        guard authStatus == .notDetermined else { return }
        AVCaptureDevice.requestAccess(for: .video) { granted in
            DispatchQueue.main.async {
                authStatus = granted ? .authorized : .denied
            }
        }
    }
}

// MARK: - Corner accent marks

private enum Corner: CaseIterable {
    case topLeft, topRight, bottomLeft, bottomRight
}

private struct CornerMark: View {
    let corner: Corner
    private let len: CGFloat = 20
    private let thick: CGFloat = 3

    var body: some View {
        GeometryReader { geo in
            Path { path in
                let (x, y) = position(in: geo.size)
                let (dx, dy) = direction
                path.move(to: CGPoint(x: x + dx * len, y: y))
                path.addLine(to: CGPoint(x: x, y: y))
                path.addLine(to: CGPoint(x: x, y: y + dy * len))
            }
            .stroke(Color.white, lineWidth: thick)
        }
    }

    private func position(in size: CGSize) -> (CGFloat, CGFloat) {
        switch corner {
        case .topLeft:     return (0, 0)
        case .topRight:    return (size.width, 0)
        case .bottomLeft:  return (0, size.height)
        case .bottomRight: return (size.width, size.height)
        }
    }

    private var direction: (CGFloat, CGFloat) {
        switch corner {
        case .topLeft:     return (1, 1)
        case .topRight:    return (-1, 1)
        case .bottomLeft:  return (1, -1)
        case .bottomRight: return (-1, -1)
        }
    }
}
