let howlModule: typeof import('howler') | null = null;
const sounds: Record<string, { play: () => void }> = {};

let muted = false;
let initialized = false;

function init() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  try {
    muted = localStorage.getItem('sounds_muted') === 'true';
  } catch {
    muted = false;
  }

  // Lazy-load Howler to avoid SSR issues
  import('howler').then(({ Howl }) => {
    const soundMap: Record<string, string> = {
      chip_shuffle: '/sounds/chip_shuffle.mp3',
      card_flip: '/sounds/card_flip.mp3',
      win_jingle: '/sounds/win_jingle.mp3',
      fold_whoosh: '/sounds/fold_whoosh.mp3',
      chip_slide: '/sounds/chip_slide.mp3',
    };

    for (const [name, src] of Object.entries(soundMap)) {
      const howl = new Howl({ src: [src], preload: false });
      sounds[name] = { play: () => howl.play() };
    }
  }).catch(() => {
    // Howler not available — silently ignore
  });
}

export function play(name: string) {
  init();
  if (!muted && sounds[name]) {
    sounds[name].play();
  }
}

export function toggleMute() {
  init();
  muted = !muted;
  try {
    localStorage.setItem('sounds_muted', String(muted));
  } catch {
    // ignore
  }
  return muted;
}

export function isMuted(): boolean {
  if (!initialized && typeof window !== 'undefined') {
    try {
      return localStorage.getItem('sounds_muted') === 'true';
    } catch {
      return false;
    }
  }
  return muted;
}
