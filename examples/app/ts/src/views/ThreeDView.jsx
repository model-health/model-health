/**
 * 3D view — renders an activity's animation data using
 * @modelhealth/viewer-react's View3D component.
 *
 * View3D renders no built-in controls — this file composes it explicitly with
 * the package's exported PlaybackControls, wired through View3D's imperative
 * ref handle, exactly like a consumer building fully custom controls would
 * (just reusing the ready-made component instead of hand-rolling markup).
 *
 * This is the only view in this app that uses React — every other view is
 * plain DOM/innerHTML. A single React root is mounted once into this view's
 * container and reused across re-renders (and re-created if a different view's
 * `container.innerHTML = ...` call detaches it — see `ensureShell` below).
 */
import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  View3D,
  PlaybackControls,
  fetchAnimationTransforms,
  fetchExternalSto,
  parseExternalSto,
} from '@modelhealth/viewer-react';
import '@modelhealth/viewer-react/styles.css';
import { getClient } from '../api.js';

let root = null;
let mountedContainer = null;
let heldVideoURL = null;

/** Lets go of the synced video held for the last activity.
 *
 * A blob URL keeps the whole video in memory until it is revoked, and a recording runs
 * to tens of megabytes per camera. Without this, every activity opened here costs
 * another one for as long as the page is up.
 */
function releaseVideo() {
  if (heldVideoURL) {
    URL.revokeObjectURL(heldVideoURL);
    heldVideoURL = null;
  }
}

const SYNC_TAG_SUFFIX = '-sync';

function detectExternalDataTag(activity) {
  const result = activity.results.find((candidate) => {
    if (!candidate.tag?.endsWith(SYNC_TAG_SUFFIX)) return false;
    const path = candidate.media?.split('?')[0];
    return path?.endsWith('.sto') ?? false;
  });
  return result?.tag ? result.tag.slice(0, -SYNC_TAG_SUFFIX.length) : null;
}

// How often (ms) to poll the live playhead position for the scrubber. View3D
// deliberately doesn't expose currentTime reactively (it would force a
// re-render every frame), so a consumer that wants a live readout polls it.
const CURRENT_TIME_POLL_INTERVAL_MS = 100;

function ViewerWithControls({ transforms, overlay, videoURL }) {
  const viewerRef = useRef(null);
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [followVideo, setFollowVideo] = useState(false);
  const [videoDuration, setVideoDuration] = useState(0);

  // While the video is in charge it owns the clock, so the readout and the scrubber come
  // from it rather than from the viewer.
  const clock = followVideo
    ? { current: currentTime, total: videoDuration }
    : { current: currentTime, total: viewerRef.current?.duration ?? 0 };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(
        followVideo
          ? videoRef.current?.currentTime ?? 0
          : viewerRef.current?.currentTime ?? 0
      );
    }, CURRENT_TIME_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [followVideo]);

  // Every frame the browser paints is handed to the viewer. That is far more often than
  // it needs, which is the point: it coalesces the calls and acts on the latest time only.
  useEffect(() => {
    if (!followVideo) return undefined;
    let frame = requestAnimationFrame(function tick() {
      const video = videoRef.current;
      if (video) viewerRef.current?.seek(video.currentTime);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [followVideo]);

  /** Whichever clock is in charge, driven by the one set of controls below. */
  const control = followVideo
    ? {
        play: () => videoRef.current?.play(),
        pause: () => videoRef.current?.pause(),
        seek: (time) => {
          if (videoRef.current) videoRef.current.currentTime = time;
        },
        speed: (speed) => {
          if (videoRef.current) videoRef.current.playbackRate = speed;
        },
        step: (direction) => {
          const video = videoRef.current;
          if (video) video.currentTime = Math.max(0, video.currentTime + direction / 60);
        },
      }
    : {
        play: () => viewerRef.current?.play(),
        pause: () => viewerRef.current?.pause(),
        seek: (time) => viewerRef.current?.seek(time),
        speed: (speed) => viewerRef.current?.setPlaybackSpeed(speed),
        step: (direction) => viewerRef.current?.step(direction),
      };

  const startFollowing = (following) => {
    setFollowVideo(following);
    setPlaying(false);
    viewerRef.current?.pause();
    videoRef.current?.pause();
  };

  return (
    <>
      <label className="viewer-sync">
        <input
          type="checkbox"
          checked={followVideo}
          disabled={!videoURL}
          onChange={(event) => startFollowing(event.target.checked)}
        />
        {videoURL ? 'Follow the recorded video' : 'No synced video to follow'}
      </label>

      {/* No controls of its own: the ones below drive both. */}
      <video
        ref={videoRef}
        src={videoURL ?? undefined}
        muted
        playsInline
        onLoadedMetadata={(event) => setVideoDuration(event.currentTarget.duration)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        style={{
          display: followVideo ? 'block' : 'none',
          width: '100%',
          maxHeight: '30vh',
          objectFit: 'contain',
          background: '#000',
        }}
      />

      <div style={{ flex: 1, minHeight: 0 }}>
        <View3D
          ref={viewerRef}
          transforms={transforms}
          overlay={overlay}
          externalClock={followVideo}
          onPlayingChange={(next) => {
            if (!followVideo) setPlaying(next);
          }}
        />
      </div>

      <PlaybackControls
        currentTime={clock.current}
        duration={clock.total}
        playing={playing}
        playbackSpeed={playbackSpeed}
        onTimeChange={control.seek}
        onPlayingChange={(next) => (next ? control.play() : control.pause())}
        onPlaybackSpeedChange={(speed) => {
          setPlaybackSpeed(speed);
          control.speed(speed);
        }}
        onStep={control.step}
      />
    </>
  );
}

function escapeHtml(s) {
  if (s == null)
    return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function ensureShell(container, onBack) {
  const alreadyMounted = mountedContainer === container && container.querySelector('#view-3d-mount');
  if (alreadyMounted)
    return;

  if (root) {
    try {
      root.unmount();
    } catch {
      // Root's DOM node was already detached by another view — nothing to unmount.
    }
  }

  container.innerHTML = `
    <div class="view-header">
      <button type="button" class="btn back" id="back-view-3d">← Back</button>
      <h1>3D View</h1>
    </div>
    <div id="view-3d-status" class="status" style="display:none;"></div>
    <div id="view-3d-mount" style="height:70vh;background:#000;border-radius:4px;overflow:hidden;display:flex;flex-direction:column;"></div>
  `;
  container.querySelector('#back-view-3d')?.addEventListener('click', onBack);
  root = createRoot(container.querySelector('#view-3d-mount'));
  mountedContainer = container;
}

export function render(container, state, { navigate }) {
  ensureShell(container, () => {
    releaseVideo();
    navigate('record-activity');
  });

  const statusEl = container.querySelector('#view-3d-status');
  const loading = state.loadingState === 'loading';
  const error = state.errorMessage;

  if (loading) {
    statusEl.style.display = '';
    statusEl.className = 'status';
    statusEl.textContent = 'Loading 3D animation…';
    root.render(null);
    return;
  }

  if (error && !state.threeDTransforms) {
    statusEl.style.display = '';
    statusEl.className = 'status error';
    statusEl.textContent = escapeHtml(error);
    root.render(null);
    return;
  }

  statusEl.style.display = 'none';

  if (!state.threeDTransforms) {
    root.render(null);
    return;
  }

  root.render(
    <ViewerWithControls
      transforms={state.threeDTransforms}
      overlay={state.threeDOverlay}
      videoURL={state.threeDVideoURL}
    />
  );
}

export async function onEnter(container, state, ctx) {
  const activity = state.selectedActivity;
  if (!activity)
    return;
  if (state.threeDTransforms)
    return;

  const client = getClient();
  if (!client)
    return;

  ctx.setState({ loadingState: 'loading', errorMessage: null });
  try {
    const transforms = await fetchAnimationTransforms(client, activity);
    const externalDataTag = detectExternalDataTag(activity);
    const externalSto = externalDataTag
      ? await fetchExternalSto(client, activity, externalDataTag)
      : null;
    // The synced video, so the model can be driven by a clock it does not own. Its
    // absence only costs the toggle, so it is not worth failing the screen for.
    releaseVideo();
    try {
      const [video] = await client.videosForActivity(activity, 'synced');
      if (video) heldVideoURL = URL.createObjectURL(new Blob([video], { type: 'video/mp4' }));
    } catch {
      // Left without one.
    }

    ctx.setState({
      threeDTransforms: transforms,
      threeDOverlay: externalSto ? parseExternalSto(externalSto) : null,
      threeDVideoURL: heldVideoURL,
      loadingState: 'idle',
    });
  } catch (err) {
    ctx.setState({ loadingState: 'idle', errorMessage: err?.message || 'Failed to load animation data' });
  }
}
