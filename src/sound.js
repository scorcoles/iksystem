// =========================================================================================
// El sonido: una sala de radio, de noche, escuchando el espacio
// =========================================================================================
//
// Todo se genera aquí, con la Web Audio API: no hay archivos de audio.
//   - el FONDO, un acorde quieto y abierto (La, Mi y Si, muy graves, en ondas suaves) por un
//     filtro que se abre y se cierra muy despacio, como una respiración larga;
//   - la TELEMETRÍA: cada vez que una baliza emite (life.js), unos pitidos cortos y agudos,
//     de uno a cinco, como un mensaje que llega de lejos, con un eco que se repite y se
//     apaga; del lado de la pantalla donde está la baliza;
//   - las NAVES, al saltar, un «fiu» muy flojo que sube;
//   - los SUCESOS: un jump point que pierde la señal, un chisporroteo de radio; un cometa,
//     un soplo que cruza de un altavoz al otro;
//   - el VIENTO al arrastrar: ruido muy filtrado, más fuerte y más abierto cuanto más
//     deprisa se mueve la carta;
//   - al tocar un planeta, un PING de sonar, con su eco: cada clase de cuerpo, su nota (el
//     hub, la más grave; la capital, un acorde de dos);
//   - con el ZOOM, el fondo se cierra un poco, como si te acercaras al altavoz.
//
// Los navegadores no dejan sonar nada sin que se toque algo: empieza con el botón de arriba.

// El fondo: sus notas (Hz), su volumen, por dónde corta el filtro y su respiración.
const CHORD = [55, 82.41, 123.47, 164.81];
const BED_VOLUME = 0.05;
const FILTER = 420;
const BREATH = 19;
const BREATH_DEPTH = 260;

// La telemetría: su nota (Hz, entre y) y su volumen.
const TELEMETRY_PITCH = [1400, 2600];
const TELEMETRY_VOLUME = 0.05;

// El eco: cada cuánto se repite (segundos) y cuánto queda en cada vuelta.
const ECHO = 0.33;
const ECHO_FEEDBACK = 0.45;

// El ping de cada cuerpo (Hz) y su volumen.
const PINGS = { hub: [220], capital: [330, 495], jump: [660], planet: [880] };
const PING_VOLUME = 0.22;

// El viento: su volumen más alto y lo que tarda en irse.
const WIND_VOLUME = 0.08;
const WIND_FADE = 0.25;

const VOLUME = 0.6;
const FADE = 1.5;

const random = (a, b) => a + Math.random() * (b - a);

export function createSound() {
  let ctx = null;
  let master = null;
  let filter = null;
  let echo = null;
  let windGain = null;
  let windFilter = null;
  let on = false;
  let noiseBuffer = null;
  let breath = 0;
  let wind = 0;

  function build() {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0;
    const compressor = ctx.createDynamicsCompressor();
    // Sin el foco de la ventana (otra pestaña, otra aplicación) se calla; al volver, suena.
    const focus = ctx.createGain();
    focus.gain.value = document.hasFocus() ? 1 : 0;
    master.connect(compressor).connect(focus).connect(ctx.destination);
    const followFocus = () => {
      const on = document.hasFocus() && !document.hidden;
      focus.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.12);
    };
    addEventListener('blur', followFocus);
    addEventListener('focus', followFocus);
    document.addEventListener('visibilitychange', followFocus);

    // El eco, compartido por la telemetría y los pings.
    echo = ctx.createDelay(2);
    echo.delayTime.value = ECHO;
    const feedback = ctx.createGain();
    feedback.gain.value = ECHO_FEEDBACK;
    const echoTone = ctx.createBiquadFilter();
    echoTone.type = 'lowpass';
    echoTone.frequency.value = 2400;
    echo.connect(echoTone).connect(feedback).connect(echo);
    echoTone.connect(master);

    // El fondo.
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = FILTER;
    filter.Q.value = 2;
    const bed = ctx.createGain();
    bed.gain.value = BED_VOLUME;
    filter.connect(bed).connect(master);
    CHORD.forEach((frequency, i) => {
      for (const detune of [-6, 6]) {
        const osc = ctx.createOscillator();
        osc.type = i % 2 ? 'triangle' : 'sawtooth';
        osc.frequency.value = frequency;
        osc.detune.value = detune;
        const g = ctx.createGain();
        g.gain.value = 1 / (i + 1.5);
        osc.connect(g).connect(filter);
        osc.start();
      }
    });

    // El viento: ruido, por un paso banda que se abre con la velocidad.
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    noiseBuffer = buffer;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 400;
    windFilter.Q.value = 0.8;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    noise.connect(windFilter).connect(windGain).connect(master);
    noise.start();
  }

  // Un pitido: una onda de seno con un golpe de volumen corto, hacia el eco y los altavoces.
  function beep(frequency, at, length, volume, pan) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(volume, at + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, at + length);
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    osc.connect(g).connect(panner);
    panner.connect(master);
    panner.connect(echo);
    osc.start(at);
    osc.stop(at + length + 0.05);
  }

  // Un trozo de ruido por un filtro: «from» y «to», por dónde corta (Hz) al empezar y al
  // acabar; «chop», si se corta a trozos.
  function hiss({ length, volume, from, to, pan = 0, panTo = pan, q = 1.5, chop = false }) {
    const at = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = q;
    band.frequency.setValueAtTime(from, at);
    band.frequency.exponentialRampToValueAtTime(to, at + length);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    if (chop) {
      for (let t = 0; t < length; t += random(0.03, 0.09)) g.gain.setValueAtTime(Math.random() < 0.6 ? volume * random(0.4, 1) : 0, at + t);
    } else {
      g.gain.linearRampToValueAtTime(volume, at + length * 0.4);
    }
    g.gain.linearRampToValueAtTime(0, at + length);
    const panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(pan, at);
    panner.pan.linearRampToValueAtTime(panTo, at + length);
    source.connect(band).connect(g).connect(panner).connect(master);
    source.start(at, Math.random());
    source.stop(at + length + 0.05);
  }

  function telemetry(pan) {
    const now = ctx.currentTime;
    const pitch = random(...TELEMETRY_PITCH);
    const count = 1 + Math.floor(Math.random() * 5);
    let at = now;
    for (let i = 0; i < count; i++) {
      // Cortos y largos, como un mensaje.
      const long = Math.random() < 0.35;
      beep(pitch, at, long ? 0.16 : 0.05, TELEMETRY_VOLUME, pan);
      at += long ? 0.22 : 0.1;
    }
  }

  return {
    toggle() {
      if (!ctx) build();
      on = !on;
      if (on) ctx.resume();
      const now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(on ? VOLUME : 0, now + (on ? FADE : 0.3));
      return on;
    },
    // Tocar un cuerpo: «kind», cuál (hub, capital, jump o planet); «pan», de -1 a 1.
    ping(kind, pan = 0) {
      if (!on) return;
      const at = ctx.currentTime;
      for (const frequency of PINGS[kind] ?? PINGS.planet) {
        beep(frequency, at, 1.4, PING_VOLUME / (PINGS[kind]?.length ?? 1), Math.max(-1, Math.min(1, pan)));
        // Un armónico flojo, que le da algo de metal.
        beep(frequency * 2.76, at, 0.4, PING_VOLUME * 0.08, pan);
      }
    },
    // Una baliza emite: «pan», dónde está en la pantalla (de -1 a 1).
    beacon(pan = 0) {
      if (on) telemetry(Math.max(-0.9, Math.min(0.9, pan)));
    },
    // Una nave salta.
    jump(pan = 0) {
      if (!on) return;
      const at = ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, at);
      osc.frequency.exponentialRampToValueAtTime(1800, at + 0.25);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.025, at + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.3);
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-0.9, Math.min(0.9, pan));
      osc.connect(g).connect(panner).connect(master);
      panner.connect(echo);
      osc.start(at);
      osc.stop(at + 0.35);
    },
    // Un jump point pierde la señal.
    glitch(pan = 0) {
      if (on) hiss({ length: 1.6, volume: 0.09, from: 2400, to: 900, pan, q: 3, chop: true });
    },
    // Un cometa cruza, de «from» a «to» (de -1 a 1) en «length» segundos.
    comet(from, to, length) {
      if (on) hiss({ length, volume: 0.05, from: 300, to: 2200, pan: from, panTo: to, q: 0.9 });
    },
    // Al arrastrar: lo deprisa que va (pantallas por segundo, más o menos).
    wind(speed) {
      wind = Math.max(wind, Math.min(1, speed / 3));
    },
    update(dt, zoom) {
      if (!ctx || !on) return;
      const now = ctx.currentTime;
      breath += dt;
      const open = FILTER + BREATH_DEPTH * Math.sin((breath / BREATH) * Math.PI * 2);
      filter.frequency.setTargetAtTime(open / Math.pow(zoom, 0.3), now, 0.2);
      windGain.gain.setTargetAtTime(wind * WIND_VOLUME, now, 0.05);
      windFilter.frequency.setTargetAtTime(300 + wind * 1600, now, 0.05);
      wind *= Math.exp(-dt / WIND_FADE);
    },
  };
}
