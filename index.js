// Silly Optimizer for SillyTavern
// Makes SillyTavern lighter to draw, mainly on phones, while changing what
// you see as little as possible. Options that you would notice are off by
// default.

const VERSION = '1.0.1';
const MODULE = 'silly_optimizer';

const DEFAULTS = {
    offscreen: true,      // don't draw messages scrolled far out of view
    pauseScroll: true,    // hold screen effects still while scrolling
    pauseGenerating: false, // hold screen effects still while a reply is written
    smartBlur: false,     // turn off panel blur only while effects are moving
    meter: false,         // frame-rate readout
};

function ctx() {
    return SillyTavern.getContext();
}

function settings() {
    const store = ctx().extensionSettings;
    if (!store[MODULE] || typeof store[MODULE] !== 'object') store[MODULE] = structuredClone(DEFAULTS);
    const s = store[MODULE];
    for (const [k, v] of Object.entries(DEFAULTS)) if (s[k] === undefined) s[k] = v;
    return s;
}

function save() {
    ctx().saveSettingsDebounced();
}

// ---------- pausing effects ----------
// Several reasons can hold the effects still at once; they only move again
// when none is left.

const holds = new Set();

function setHold(reason, on) {
    if (on) holds.add(reason);
    else holds.delete(reason);
    document.body.classList.toggle('opt-paused', holds.size > 0);
}

let scrollTimer = null;
function onScroll() {
    if (!settings().pauseScroll) return;
    setHold('scroll', true);
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => setHold('scroll', false), 180);
}

// ---------- smart blur ----------
// Frosted-glass blur on panels has to be redone every frame while something
// animates behind it. With this on, panels go flat only while an effect is
// moving, and get their blur back when nothing is.

function effectsMoving() {
    return !!(document.querySelector('#sfx-fx-root .sfx-fx, #sfx-fx-under .sfx-fx, #sfx-fx-under .sfx-words, #ssb-holder .ssb-fig.ssb-on'));
}

let addedNoBlur = false;
function updateBlur() {
    const body = document.body;
    const want = settings().smartBlur && effectsMoving();
    if (want && !body.classList.contains('no-blur')) {
        body.classList.add('no-blur');
        addedNoBlur = true;
    } else if (!want && addedNoBlur) {
        body.classList.remove('no-blur');
        addedNoBlur = false;
    }
}

function blurIsOn() {
    return !document.body.classList.contains('no-blur') || addedNoBlur;
}

// ---------- frame-rate meter ----------

let meterEl = null;
let meterRun = 0;

function startMeter() {
    if (meterEl) return;
    meterEl = document.createElement('div');
    meterEl.id = 'opt-meter';
    document.body.appendChild(meterEl);
    const run = ++meterRun;
    let frames = 0;
    let since = performance.now();
    let worst = 0;
    let last = since;
    const step = (now) => {
        if (run !== meterRun) return;
        frames++;
        worst = Math.max(worst, now - last);
        last = now;
        if (now - since >= 1000) {
            const fps = Math.round((frames * 1000) / (now - since));
            meterEl.textContent = `${fps} fps · worst ${Math.round(worst)} ms`;
            meterEl.className = fps >= 50 ? 'opt-ok' : fps >= 30 ? 'opt-meh' : 'opt-bad';
            frames = 0;
            worst = 0;
            since = now;
        }
        requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function stopMeter() {
    meterRun++;
    meterEl?.remove();
    meterEl = null;
}

// ---------- applying settings ----------

function apply() {
    const s = settings();
    document.body.classList.toggle('opt-offscreen', !!s.offscreen);
    if (!s.pauseScroll) setHold('scroll', false);
    if (!s.pauseGenerating) setHold('generating', false);
    if (s.meter) startMeter();
    else stopMeter();
    updateBlur();
}

// ---------- report ----------

function measureFps(ms = 1500) {
    return new Promise((resolve) => {
        let frames = 0;
        const t0 = performance.now();
        const step = (now) => {
            frames++;
            if (now - t0 < ms) requestAnimationFrame(step);
            else resolve(Math.round((frames * 1000) / (now - t0)));
        };
        requestAnimationFrame(step);
    });
}

async function report() {
    const chatEl = document.getElementById('chat');
    const messages = chatEl ? chatEl.querySelectorAll('.mes').length : 0;
    const layers = document.querySelectorAll('#sfx-fx-root .sfx-fx, #sfx-fx-under .sfx-fx').length;
    const backdrop = document.querySelector('#ssb-holder .ssb-fig.ssb-on') ? 'showing' : 'off';
    const fps = await measureFps();
    const lines = [
        `v${VERSION}`,
        `frame rate now: ${fps} fps (measured with this panel open)`,
        `messages on the page: ${messages}${messages > 80 ? ' (a lower "# Msg. to Load" in User Settings would help)' : ''}`,
        `panel blur: ${blurIsOn() ? 'on' : 'off'}${blurIsOn() && !settings().smartBlur ? ' (the biggest cost while effects play; see Smart blur, or "No Blur Effect" in User Settings)' : ''}`,
        `screen effects playing: ${layers}${layers > 3 ? ' (several at once; each adds work)' : ''}`,
        `scene backdrop: ${backdrop}`,
        `effects paused right now: ${holds.size ? [...holds].join(', ') : 'no'}`,
    ];
    return lines.join('\n');
}

// ---------- settings UI ----------

function buildSettings() {
    const host = document.getElementById('extensions_settings2') ?? document.getElementById('extensions_settings');
    if (!host || document.getElementById('opt-settings')) return;
    const s = settings();
    const wrap = document.createElement('div');
    wrap.id = 'opt-settings';
    wrap.innerHTML = `
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>Silly Optimizer <small>v${VERSION}</small></b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <label class="checkbox_label"><input type="checkbox" data-k="offscreen">
                    <span>Skip drawing messages you've scrolled away from
                    <small class="opt-note">They're drawn again the moment they come back into view. The newest 8 always stay drawn. You shouldn't notice anything.</small></span></label>
                <label class="checkbox_label"><input type="checkbox" data-k="pauseScroll">
                    <span>Hold screen effects still while scrolling
                    <small class="opt-note">Makes scrolling smoother; effects carry on a split second after you stop.</small></span></label>
                <label class="checkbox_label"><input type="checkbox" data-k="pauseGenerating">
                    <span>Hold screen effects still while a reply is being written
                    <small class="opt-note">Off by default, because you'd see effects freeze while the AI writes.</small></span></label>
                <label class="checkbox_label"><input type="checkbox" data-k="smartBlur">
                    <span>Smart blur: flat panels only while effects are moving
                    <small class="opt-note">Only matters if panel blur is on. Off by default, because panels would look flat while effects play.</small></span></label>
                <label class="checkbox_label"><input type="checkbox" data-k="meter">
                    <span>Show a frame-rate meter
                    <small class="opt-note">60 fps is smooth, under 30 feels choppy. Useful for seeing what slows your phone down.</small></span></label>
                <div class="flex-container">
                    <button type="button" class="menu_button" id="opt-report-btn">Check performance</button>
                </div>
                <pre id="opt-report" class="opt-report" hidden></pre>
            </div>
        </div>`;
    host.appendChild(wrap);
    for (const input of wrap.querySelectorAll('[data-k]')) {
        input.checked = !!s[input.dataset.k];
        input.addEventListener('change', () => {
            s[input.dataset.k] = input.checked;
            save();
            apply();
        });
    }
    wrap.querySelector('#opt-report-btn').addEventListener('click', async () => {
        const out = wrap.querySelector('#opt-report');
        out.hidden = false;
        out.textContent = 'Measuring…';
        out.textContent = await report();
    });
}

// ---------- wiring ----------

function watchEffects() {
    // Re-check smart blur whenever effect layers come and go.
    let t = null;
    new MutationObserver(() => {
        clearTimeout(t);
        t = setTimeout(updateBlur, 200);
    }).observe(document.body, { childList: true, subtree: false });
    for (const id of ['sfx-fx-root', 'sfx-fx-under']) {
        const el = document.getElementById(id);
        if (el && !el.dataset.optWatched) {
            el.dataset.optWatched = '1';
            new MutationObserver(() => {
                clearTimeout(t);
                t = setTimeout(updateBlur, 200);
            }).observe(el, { childList: true });
        }
    }
}

function wireEvents() {
    const { eventSource, event_types: ev } = ctx();
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    eventSource.on(ev.GENERATION_STARTED, (type, _o, dryRun) => {
        if (dryRun || type === 'quiet') return;
        if (settings().pauseGenerating) setHold('generating', true);
    });
    for (const name of ['GENERATION_ENDED', 'GENERATION_STOPPED', 'CHARACTER_MESSAGE_RENDERED']) {
        if (ev[name]) eventSource.on(ev[name], () => setHold('generating', false));
    }
    eventSource.on(ev.CHAT_CHANGED, () => {
        watchEffects();
        updateBlur();
    });
    // Effect layers are created later by other extensions; pick them up.
    setInterval(() => {
        watchEffects();
        updateBlur();
    }, 5000);
}

jQuery(() => {
    try {
        settings();
        buildSettings();
        apply();
        watchEffects();
        wireEvents();
    } catch (err) {
        console.error('[Silly Optimizer] failed to start', err);
    }
});
