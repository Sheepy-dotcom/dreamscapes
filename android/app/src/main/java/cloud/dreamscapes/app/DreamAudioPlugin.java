package cloud.dreamscapes.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.MediaMetadata;
import android.media.MediaPlayer;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "DreamAudio")
public class DreamAudioPlugin extends Plugin {
    private final Handler progressHandler = new Handler(Looper.getMainLooper());
    private final List<String> tracks = new ArrayList<>();
    private final List<Double> durations = new ArrayList<>();
    private final List<File> tempFiles = new ArrayList<>();
    private MediaPlayer player;
    private MediaSession mediaSession;
    private int currentIndex = 0;
    private double totalDuration = 0;
    private String title = "DreamScapes Story";
    private String artist = "DreamScapes";
    private String album = "Story";
    private boolean paused = false;

    private final Runnable progressRunnable = new Runnable() {
        @Override
        public void run() {
            emitProgress();
            if (player != null) {
                progressHandler.postDelayed(this, 1000);
            }
        }
    };

    @Override
    public void load() {
        setupMediaSession();
    }

    @PluginMethod
    public void play(PluginCall call) {
        JSArray trackArray = call.getArray("tracks");
        if (trackArray == null || trackArray.length() == 0) {
            call.reject("No audio tracks supplied.");
            return;
        }

        stopInternal(false);
        tracks.clear();
        durations.clear();
        currentIndex = 0;
        paused = false;
        title = call.getString("title", "DreamScapes Story");
        artist = call.getString("artist", "DreamScapes");
        album = call.getString("album", "Story");
        totalDuration = call.getDouble("duration", 0.0);

        JSArray durationArray = call.getArray("durations");
        try {
            for (int index = 0; index < trackArray.length(); index++) {
                tracks.add(trackArray.getString(index));
                double trackDuration = durationArray != null && index < durationArray.length()
                    ? durationArray.optDouble(index, 0)
                    : 0;
                durations.add(trackDuration);
            }
        } catch (JSONException error) {
            call.reject("Audio tracks could not be read.");
            return;
        }

        if (totalDuration <= 0) {
            for (double duration : durations) totalDuration += duration;
        }

        updateMetadata();
        playCurrentTrack();
        call.resolve();
    }

    @PluginMethod
    public void pause(PluginCall call) {
        pauseInternal();
        call.resolve();
    }

    @PluginMethod
    public void resume(PluginCall call) {
        resumeInternal();
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopInternal(true);
        call.resolve();
    }

    @PluginMethod
    public void seek(PluginCall call) {
        double position = call.getDouble("position", 0.0);
        seekTo(position);
        call.resolve();
    }

    private void setupMediaSession() {
        if (mediaSession != null) return;

        mediaSession = new MediaSession(getContext(), "DreamScapesAudio");
        mediaSession.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
        mediaSession.setCallback(new MediaSession.Callback() {
            @Override
            public void onPlay() {
                resumeInternal();
            }

            @Override
            public void onPause() {
                pauseInternal();
            }

            @Override
            public void onStop() {
                stopInternal(true);
            }

            @Override
            public void onSeekTo(long pos) {
                seekTo(pos / 1000.0);
            }

            @Override
            public void onSkipToNext() {
                playNextTrack();
            }

            @Override
            public void onSkipToPrevious() {
                seekTo(Math.max(0, getElapsedSeconds() - 15));
            }
        });
    }

    private void playCurrentTrack() {
        if (currentIndex >= tracks.size()) {
            finishPlayback();
            return;
        }

        releasePlayer();
        try {
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .build());
            player.setDataSource(getContext(), resolveTrackUri(tracks.get(currentIndex)));
            player.setOnPreparedListener(mediaPlayer -> {
                mediaPlayer.start();
                paused = false;
                mediaSession.setActive(true);
                updatePlaybackState(PlaybackState.STATE_PLAYING);
                progressHandler.removeCallbacks(progressRunnable);
                progressHandler.post(progressRunnable);
            });
            player.setOnCompletionListener(mediaPlayer -> playNextTrack());
            player.setOnErrorListener((mediaPlayer, what, extra) -> {
                emitError("Android audio playback failed.");
                stopInternal(true);
                return true;
            });
            player.prepareAsync();
        } catch (Exception error) {
            emitError("Android audio playback failed.");
            stopInternal(true);
        }
    }

    private void playNextTrack() {
        currentIndex += 1;
        if (currentIndex >= tracks.size()) {
            finishPlayback();
            return;
        }
        playCurrentTrack();
    }

    private void pauseInternal() {
        if (player != null && player.isPlaying()) {
            player.pause();
            paused = true;
            updatePlaybackState(PlaybackState.STATE_PAUSED);
        }
    }

    private void resumeInternal() {
        if (player != null && paused) {
            player.start();
            paused = false;
            updatePlaybackState(PlaybackState.STATE_PLAYING);
            progressHandler.post(progressRunnable);
        }
    }

    private void stopInternal(boolean emitStopped) {
        progressHandler.removeCallbacks(progressRunnable);
        releasePlayer();
        currentIndex = 0;
        paused = false;
        if (mediaSession != null) {
            updatePlaybackState(PlaybackState.STATE_STOPPED);
            mediaSession.setActive(false);
        }
        clearTempFiles();
        if (emitStopped) notifyListeners("stopped", new JSObject());
    }

    private void finishPlayback() {
        stopInternal(false);
        notifyListeners("ended", new JSObject());
    }

    private void releasePlayer() {
        if (player == null) return;
        try {
            player.stop();
        } catch (IllegalStateException ignored) {
            // Player may not have reached prepared state.
        }
        player.release();
        player = null;
    }

    private Uri resolveTrackUri(String source) throws IOException {
        if (source.startsWith("data:audio")) {
            String[] parts = source.split(",", 2);
            if (parts.length != 2) throw new IOException("Invalid audio data URL.");
            byte[] bytes = Base64.decode(parts[1], Base64.DEFAULT);
            File file = File.createTempFile("dreamscapes-audio-", ".mp3", getContext().getCacheDir());
            try (FileOutputStream stream = new FileOutputStream(file)) {
                stream.write(bytes);
            }
            tempFiles.add(file);
            return Uri.fromFile(file);
        }

        return Uri.parse(source);
    }

    private void clearTempFiles() {
        for (File file : tempFiles) {
            if (file.exists()) file.delete();
        }
        tempFiles.clear();
    }

    private void seekTo(double positionSeconds) {
        if (tracks.isEmpty()) return;

        double remaining = Math.max(0, positionSeconds);
        int targetIndex = 0;
        for (int index = 0; index < durations.size(); index++) {
            double duration = durations.get(index);
            if (remaining <= duration || index == durations.size() - 1) {
                targetIndex = index;
                break;
            }
            remaining -= duration;
        }

        currentIndex = targetIndex;
        final int targetMs = (int) Math.max(0, remaining * 1000);
        playCurrentTrack();
        progressHandler.postDelayed(() -> {
            if (player != null) player.seekTo(targetMs);
        }, 350);
    }

    private double getElapsedSeconds() {
        double elapsed = 0;
        for (int index = 0; index < currentIndex && index < durations.size(); index++) {
            elapsed += durations.get(index);
        }
        if (player != null) elapsed += player.getCurrentPosition() / 1000.0;
        return elapsed;
    }

    private void emitProgress() {
        JSObject state = new JSObject();
        state.put("position", getElapsedSeconds());
        state.put("duration", totalDuration);
        state.put("trackIndex", currentIndex);
        notifyListeners("progress", state);
        updatePlaybackState(paused ? PlaybackState.STATE_PAUSED : PlaybackState.STATE_PLAYING);
    }

    private void emitError(String message) {
        JSObject state = new JSObject();
        state.put("message", message);
        notifyListeners("error", state);
    }

    private void updateMetadata() {
        if (mediaSession == null) return;

        MediaMetadata metadata = new MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, title)
            .putString(MediaMetadata.METADATA_KEY_ARTIST, artist)
            .putString(MediaMetadata.METADATA_KEY_ALBUM, album)
            .putLong(MediaMetadata.METADATA_KEY_DURATION, (long) (totalDuration * 1000))
            .build();
        mediaSession.setMetadata(metadata);
    }

    private void updatePlaybackState(int state) {
        if (mediaSession == null) return;

        long actions = PlaybackState.ACTION_PLAY
            | PlaybackState.ACTION_PAUSE
            | PlaybackState.ACTION_STOP
            | PlaybackState.ACTION_SEEK_TO
            | PlaybackState.ACTION_SKIP_TO_NEXT
            | PlaybackState.ACTION_SKIP_TO_PREVIOUS;
        PlaybackState playbackState = new PlaybackState.Builder()
            .setActions(actions)
            .setState(state, (long) (getElapsedSeconds() * 1000), 1.0f)
            .build();
        mediaSession.setPlaybackState(playbackState);
    }
}
