# Silly Optimizer

A SillyTavern extension that makes SillyTavern lighter to draw, mainly on phones, while changing what you see as little as possible. Anything you would notice is off by default.

## Install

In SillyTavern: **Extensions** (cubes icon) → **Install extension** → paste:

```
https://github.com/OrdeliaLys/SillyTimizer
```

, then reload the page.

## Options

On by default (you shouldn't notice them):

- **Skip drawing messages you've scrolled away from.** Older messages aren't drawn until they come back into view; the newest 8 always stay drawn. In a 300-message test chat this made re-layouts (like the phone keyboard opening) about 10× cheaper and opening the chat about twice as fast. The trade-off is a tiny extra cost per streamed word, far too small to notice.
- **Hold screen effects still while scrolling.** Effects from SillyStatus and Scene Backdrop pause during a scroll and continue a split second after you stop, so scrolling stays smooth.

Off by default (you would notice them):

- **Hold screen effects still while a reply is being written.**
- **Smart blur:** if panel blur is on, panels go flat only while an effect is moving and get their blur back afterwards.
- **Frame-rate meter:** a small readout of how smooth things are (60 fps is smooth, under 30 feels choppy).

**Check performance** measures the current frame rate and lists what's on the page, with suggestions.

## Built-in settings worth knowing

In SillyTavern's **User Settings**: **No Blur Effect** removes panel blur (the biggest cost while effects play), and a lower **# Msg. to Load** keeps long chats light. Avoid **Reduced Motion** if you want screen effects, since it stops animations.
