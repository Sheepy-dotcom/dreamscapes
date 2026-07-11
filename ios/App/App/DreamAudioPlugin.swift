import AVFoundation
import Capacitor
import MediaPlayer
import UIKit

@objc(DreamAudioPlugin)
public class DreamAudioPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DreamAudioPlugin"
    public let jsName = "DreamAudio"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "seek", returnType: CAPPluginReturnPromise)
    ]

    private var player: AVQueuePlayer?
    private var trackSources: [String] = []
    private var trackDurations: [Double] = []
    private var tempFiles: [URL] = []
    private var currentIndex = 0
    private var totalDuration: Double = 0
    private var title = "DreamScapes Story"
    private var artist = "DreamScapes"
    private var album = "Story"
    private var timeObserver: Any?

    public override func load() {
        configureAudioSession()
        setupRemoteCommands()
    }

    @objc func play(_ call: CAPPluginCall) {
        guard let tracks = call.getArray("tracks", String.self), !tracks.isEmpty else {
            call.reject("No audio tracks supplied.")
            return
        }

        stopInternal(emitStopped: false)
        trackSources = tracks
        trackDurations = (call.getArray("durations") ?? []).map { value in
            if let number = value as? NSNumber { return number.doubleValue }
            if let double = value as? Double { return double }
            return 0
        }
        currentIndex = 0
        title = call.getString("title") ?? "DreamScapes Story"
        artist = call.getString("artist") ?? "DreamScapes"
        album = call.getString("album") ?? "Story"
        totalDuration = call.getDouble("duration") ?? trackDurations.reduce(0, +)

        configureAudioSession()
        updateNowPlayingInfo(state: .playing)
        startPlayback(at: 0, offset: 0)
        call.resolve()
    }

    @objc func pause(_ call: CAPPluginCall) {
        player?.pause()
        updateNowPlayingInfo(state: .paused)
        call.resolve()
    }

    @objc func resume(_ call: CAPPluginCall) {
        player?.play()
        updateNowPlayingInfo(state: .playing)
        call.resolve()
    }

    @objc func stop(_ call: CAPPluginCall) {
        stopInternal(emitStopped: true)
        call.resolve()
    }

    @objc func seek(_ call: CAPPluginCall) {
        let position = call.getDouble("position") ?? 0
        seekTo(position)
        call.resolve()
    }

    private func configureAudioSession() {
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [])
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            notifyError("iOS audio session could not start.")
        }
    }

    private func startPlayback(at index: Int, offset: Double) {
        releasePlayer()
        currentIndex = max(0, min(index, trackSources.count - 1))

        do {
            let urls = try trackSources[currentIndex...].map(resolveTrackUrl)
            let items = urls.map { AVPlayerItem(url: $0) }
            player = AVQueuePlayer(items: items)
            player?.actionAtItemEnd = .advance
            addObservers(for: items)

            if let firstItem = items.first, offset > 0 {
                firstItem.seek(to: CMTime(seconds: offset, preferredTimescale: 600)) { [weak self] _ in
                    self?.player?.play()
                }
            } else {
                player?.play()
            }

            updateNowPlayingInfo(state: .playing)
        } catch {
            notifyError("iOS audio playback failed.")
            stopInternal(emitStopped: false)
        }
    }

    private func addObservers(for items: [AVPlayerItem]) {
        NotificationCenter.default.removeObserver(self, name: .AVPlayerItemDidPlayToEndTime, object: nil)
        items.forEach { item in
            NotificationCenter.default.addObserver(
                self,
                selector: #selector(playerItemDidEnd(_:)),
                name: .AVPlayerItemDidPlayToEndTime,
                object: item
            )
        }

        if let player = player {
            timeObserver = player.addPeriodicTimeObserver(
                forInterval: CMTime(seconds: 1, preferredTimescale: 1),
                queue: .main
            ) { [weak self] _ in
                self?.emitProgress()
            }
        }
    }

    @objc private func playerItemDidEnd(_ notification: Notification) {
        currentIndex += 1
        if currentIndex >= trackSources.count {
            stopInternal(emitStopped: false)
            notifyListeners("ended", data: JSObject())
            return
        }

        updateNowPlayingInfo(state: .playing)
    }

    private func seekTo(_ position: Double) {
        guard !trackSources.isEmpty else { return }

        var remaining = max(0, position)
        var targetIndex = 0
        for index in 0..<trackSources.count {
            let duration = index < trackDurations.count ? trackDurations[index] : 0
            if remaining <= duration || index == trackSources.count - 1 {
                targetIndex = index
                break
            }
            remaining -= duration
        }

        startPlayback(at: targetIndex, offset: remaining)
    }

    private func setupRemoteCommands() {
        let commandCenter = MPRemoteCommandCenter.shared()
        commandCenter.playCommand.addTarget { [weak self] _ in
            self?.player?.play()
            self?.updateNowPlayingInfo(state: .playing)
            return .success
        }
        commandCenter.pauseCommand.addTarget { [weak self] _ in
            self?.player?.pause()
            self?.updateNowPlayingInfo(state: .paused)
            return .success
        }
        commandCenter.stopCommand.addTarget { [weak self] _ in
            self?.stopInternal(emitStopped: true)
            return .success
        }
        commandCenter.skipForwardCommand.preferredIntervals = [15]
        commandCenter.skipForwardCommand.addTarget { [weak self] _ in
            guard let self else { return .commandFailed }
            self.seekTo(self.elapsedSeconds() + 15)
            return .success
        }
        commandCenter.skipBackwardCommand.preferredIntervals = [15]
        commandCenter.skipBackwardCommand.addTarget { [weak self] _ in
            guard let self else { return .commandFailed }
            self.seekTo(max(0, self.elapsedSeconds() - 15))
            return .success
        }
        commandCenter.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let event = event as? MPChangePlaybackPositionCommandEvent else { return .commandFailed }
            self?.seekTo(event.positionTime)
            return .success
        }
    }

    private func elapsedSeconds() -> Double {
        let completed = trackDurations.prefix(currentIndex).reduce(0, +)
        let current = player?.currentItem?.currentTime().seconds ?? 0
        return completed + (current.isFinite ? current : 0)
    }

    private func emitProgress() {
        var data = JSObject()
        data["position"] = elapsedSeconds()
        data["duration"] = totalDuration
        data["trackIndex"] = currentIndex
        notifyListeners("progress", data: data)
        updateNowPlayingInfo(state: player?.timeControlStatus == .paused ? .paused : .playing)
    }

    private enum PlaybackVisualState {
        case playing
        case paused
        case stopped
    }

    private func updateNowPlayingInfo(state: PlaybackVisualState) {
        var info: [String: Any] = [
            MPMediaItemPropertyTitle: title,
            MPMediaItemPropertyArtist: artist,
            MPMediaItemPropertyAlbumTitle: album,
            MPMediaItemPropertyPlaybackDuration: totalDuration,
            MPNowPlayingInfoPropertyElapsedPlaybackTime: elapsedSeconds(),
            MPNowPlayingInfoPropertyPlaybackRate: state == .playing ? 1.0 : 0.0
        ]

        if let image = UIImage(named: "AppIcon") {
            info[MPMediaItemPropertyArtwork] = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
        }

        MPNowPlayingInfoCenter.default().nowPlayingInfo = state == .stopped ? nil : info
    }

    private func releasePlayer() {
        if let observer = timeObserver, let player = player {
            player.removeTimeObserver(observer)
        }
        timeObserver = nil
        player?.pause()
        player = nil
        NotificationCenter.default.removeObserver(self, name: .AVPlayerItemDidPlayToEndTime, object: nil)
    }

    private func stopInternal(emitStopped: Bool) {
        releasePlayer()
        currentIndex = 0
        updateNowPlayingInfo(state: .stopped)
        clearTempFiles()
        if emitStopped {
            notifyListeners("stopped", data: JSObject())
        }
    }

    private func resolveTrackUrl(_ source: String) throws -> URL {
        if source.hasPrefix("data:audio") {
            guard let commaIndex = source.firstIndex(of: ",") else {
                throw NSError(domain: "DreamAudio", code: 1)
            }
            let base64 = String(source[source.index(after: commaIndex)...])
            guard let data = Data(base64Encoded: base64) else {
                throw NSError(domain: "DreamAudio", code: 2)
            }
            let url = FileManager.default.temporaryDirectory
                .appendingPathComponent("dreamscapes-audio-\(UUID().uuidString).mp3")
            try data.write(to: url)
            tempFiles.append(url)
            return url
        }

        guard let url = URL(string: source) else {
            throw NSError(domain: "DreamAudio", code: 3)
        }
        return url
    }

    private func clearTempFiles() {
        tempFiles.forEach { try? FileManager.default.removeItem(at: $0) }
        tempFiles.removeAll()
    }

    private func notifyError(_ message: String) {
        var data = JSObject()
        data["message"] = message
        notifyListeners("error", data: data)
    }
}
