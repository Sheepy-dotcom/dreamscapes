package cloud.dreamscapes.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioAttributes;
import android.media.MediaMetadata;
import android.media.MediaPlayer;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.net.Uri;
import android.os.Build;
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
    private static final String CHANNEL_ID = "dreamscapes_audio";
    private static final int NOTIFICATION_ID = 71002;
    private static final String ACTION_PLAY = "cloud.dreamscapes.app.audio.PLAY";
    private static final String ACTION_PAUSE = "cloud.dreamscapes.app.audio.PAUSE";
    private static final String ACTION_STOP = "cloud.dreamscapes.app.audio.STOP";

    private final Handler progressHandler = new Handler(Looper.getMainLooper());
    private final List<String> tracks = new ArrayList<>();
    private final List<Double> durations = new ArrayList<>();
    private final List<File> tempFiles = new ArrayList<>();
    private boolean receiverRegistered = false;
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

    private final BroadcastReceiver audioActionReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (ACTION_PLAY.equals(action)) {
                resumeInternal();
            } else if (ACTION_PAUSE.equals(action)) {
                pauseInternal();
            } else if (ACTION_STOP.equals(action)) {
                stopInternal(true);
            }
        }
    };

    @Override
    public void load() {
        createNotificationChannel();
        registerAudioActionReceiver();
        setupMediaSession();
    }

    @Override
    protected void handleOnDestroy() {
        unregisterAudioActionReceiver();
        cancelMediaNotification();
        super.handleOnDestroy();
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
                showMediaNotification(PlaybackState.STATE_PLAYING);
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
            showMediaNotification(PlaybackState.STATE_PAUSED);
        }
    }

    private void resumeInternal() {
        if (player != null && paused) {
            player.start();
            paused = false;
            updatePlaybackState(PlaybackState.STATE_PLAYING);
            showMediaNotification(PlaybackState.STATE_PLAYING);
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
        cancelMediaNotification();
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

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Story audio",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("DreamScapes story playback controls");
        NotificationManager manager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.createNotificationChannel(channel);
    }

    private void registerAudioActionReceiver() {
        if (receiverRegistered) return;

        IntentFilter filter = new IntentFilter();
        filter.addAction(ACTION_PLAY);
        filter.addAction(ACTION_PAUSE);
        filter.addAction(ACTION_STOP);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(audioActionReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(audioActionReceiver, filter);
        }
        receiverRegistered = true;
    }

    private void unregisterAudioActionReceiver() {
        if (!receiverRegistered) return;

        try {
            getContext().unregisterReceiver(audioActionReceiver);
        } catch (IllegalArgumentException ignored) {
            // Receiver may already have been cleared by Android.
        }
        receiverRegistered = false;
    }

    private PendingIntent createControlIntent(String action, int requestCode) {
        Intent intent = new Intent(action);
        intent.setPackage(getContext().getPackageName());
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(getContext(), requestCode, intent, flags);
    }

    private PendingIntent createContentIntent() {
        Intent intent = getContext().getPackageManager().getLaunchIntentForPackage(getContext().getPackageName());
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(getContext(), 20, intent, flags);
    }

    private void showMediaNotification(int playbackState) {
        if (mediaSession == null) return;

        Notification.Action playPauseAction = playbackState == PlaybackState.STATE_PLAYING
            ? new Notification.Action.Builder(
                android.R.drawable.ic_media_pause,
                "Pause",
                createControlIntent(ACTION_PAUSE, 11)
            ).build()
            : new Notification.Action.Builder(
                android.R.drawable.ic_media_play,
                "Play",
                createControlIntent(ACTION_PLAY, 10)
            ).build();
        Notification.Action stopAction = new Notification.Action.Builder(
            android.R.drawable.ic_menu_close_clear_cancel,
            "Stop",
            createControlIntent(ACTION_STOP, 12)
        ).build();

        Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? new Notification.Builder(getContext(), CHANNEL_ID)
            : new Notification.Builder(getContext());

        Notification notification = builder
            .setSmallIcon(getContext().getApplicationInfo().icon)
            .setContentTitle(title)
            .setContentText(artist)
            .setSubText(album)
            .setContentIntent(createContentIntent())
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .setOngoing(playbackState == PlaybackState.STATE_PLAYING)
            .setOnlyAlertOnce(true)
            .addAction(playPauseAction)
            .addAction(stopAction)
            .setStyle(new Notification.MediaStyle()
                .setMediaSession(mediaSession.getSessionToken())
                .setShowActionsInCompactView(0))
            .build();

        NotificationManager manager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.notify(NOTIFICATION_ID, notification);
    }

    private void cancelMediaNotification() {
        NotificationManager manager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) manager.cancel(NOTIFICATION_ID);
    }
}
