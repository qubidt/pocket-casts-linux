const { ipcRenderer } = require(`electron`);
const domLoaded = require(`dom-loaded`);
const select = require(`select-dom`);

const { IPC_EVENTS } = require(`./constants`);

require(`./reloader`);

domLoaded.then(() => {
  const getControlsNode = () => select(`.player-controls > .controls`);
  const getAudio = () => select(`audio`);

  let hasControlsNode = false;

  const observer = new MutationObserver(() => {
    const controlsNode = getControlsNode();
    const audio = getAudio();

    if (!hasControlsNode && controlsNode) {
      ipcRenderer.send(IPC_EVENTS.PLAYER_READY);
      handlePlayerReady(audio, controlsNode);
    }

    if (hasControlsNode && !controlsNode) {
      ipcRenderer.send(IPC_EVENTS.PLAYER_UNREADY);
    }

    hasControlsNode = !!controlsNode;
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  document.addEventListener(`keydown`, ev => {
    const isCtrlKey = key => !ev.altKey && ev.ctrlKey && ev.key === key;

    if (isCtrlKey(`+`) || isCtrlKey(`=`)) {
      ipcRenderer.send(IPC_EVENTS.ZOOM_IN);
    } else if (isCtrlKey(`-`)) {
      ipcRenderer.send(IPC_EVENTS.ZOOM_OUT);
    } else if (isCtrlKey(`0`)) {
      ipcRenderer.send(IPC_EVENTS.ZOOM_RESET);
    }
  });
});

const handlePlayerReady = (audio, controlsNode) => {
  const playBtn = select(`.play_pause_button`, controlsNode);
  const isPlaying = () => !audio.paused;

  const podcastImg = select(`.podcast-image img`, controlsNode);
  const episodeTitle = select(`.player_episode`, controlsNode);
  const podcastTitle = select(`.player_podcast_title`, controlsNode);
  const getMetadata = () => ({
    podcastImg: podcastImg.src,
    episodeTitle: episodeTitle.textContent,
    podcastTitle: podcastTitle.textContent,
  });

  const skipBackBtn = select(`.skip_back_button`, controlsNode);
  const skipForwardBtn = select(`.skip_forward_button`, controlsNode);

  ipcRenderer.send(IPC_EVENTS.METADATA_CHANGE, getMetadata());
  ipcRenderer.send(IPC_EVENTS.IS_PLAYING_CHANGE, isPlaying());

  ipcRenderer.on(IPC_EVENTS.SET_PLAYING, (ev, newPlaying) => {
    console.info(
      `IPC_EVENTS.SET_PLAYING: ${{ newPlaying, currentlyPlaying: isPlaying() }}`
    );

    if (isPlaying() !== newPlaying) {
      playBtn.clikc();
    }
  });
  ipcRenderer.on(IPC_EVENTS.SKIP_BACK, () => skipBackBtn.click());
  ipcRenderer.on(IPC_EVENTS.SKIP_FORWARD, () => skipForwardBtn.click());

  audio.addEventListener(`playing`, () => {
    console.info(`Audio Listener: Playing`);
    ipcRenderer.send(IPC_EVENTS.IS_PLAYING_CHANGE, true);
  });

  audio.addEventListener(`pause`, () => {
    console.info(`Audio Listener: Pause`);
    ipcRenderer.send(IPC_EVENTS.IS_PLAYING_CHANGE, false);
  });

  const episodeTitleObserver = new MutationObserver(() => {
    ipcRenderer.send(IPC_EVENTS.METADATA_CHANGE, getMetadata());
  });
  episodeTitleObserver.observe(episodeTitle, {
    characterData: true,
    subtree: true,
  });
};
