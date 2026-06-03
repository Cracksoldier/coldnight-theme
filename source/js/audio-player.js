(function () {
  'use strict'

  var PLAY_SVG  = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
  var PAUSE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
  var VOL_SVG   = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>'
  var MUTE_SVG  = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>'

  function fmtTime(s) {
    if (!isFinite(s) || s < 0) return '0:00'
    var m   = Math.floor(s / 60)
    var sec = Math.floor(s % 60)
    return m + ':' + (sec < 10 ? '0' : '') + sec
  }

  function seekTo(audio, bar, clientX) {
    var rect = bar.getBoundingClientRect()
    var frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    if (isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = frac * audio.duration
    }
  }

  function pauseOthers(currentAudio) {
    document.querySelectorAll('.audio-player audio').forEach(function (a) {
      if (a === currentAudio || a.paused) return
      a.pause()
    })
  }

  function initPlayer(wrap) {
    var src = wrap.dataset.src
    if (!src) return

    var playBtn   = wrap.querySelector('.audio-player__play')
    var muteBtn   = wrap.querySelector('.audio-player__mute')
    var bar       = wrap.querySelector('.audio-player__bar')
    var fill      = wrap.querySelector('.audio-player__fill')
    var timeLabel = wrap.querySelector('.audio-player__time')

    var audio = document.createElement('audio')
    audio.preload = 'metadata'
    audio.src = src
    audio.style.display = 'none'
    wrap.appendChild(audio)

    playBtn.innerHTML = PLAY_SVG
    muteBtn.innerHTML = VOL_SVG

    playBtn.addEventListener('click', function () {
      if (audio.paused) {
        pauseOthers(audio)
        audio.play()
      } else {
        audio.pause()
      }
    })

    audio.addEventListener('play', function () {
      wrap.classList.add('is-playing')
      playBtn.innerHTML = PAUSE_SVG
      playBtn.setAttribute('aria-label', 'Pause')
    })

    audio.addEventListener('pause', function () {
      wrap.classList.remove('is-playing')
      playBtn.innerHTML = PLAY_SVG
      playBtn.setAttribute('aria-label', 'Play')
    })

    audio.addEventListener('ended', function () {
      wrap.classList.remove('is-playing')
      playBtn.innerHTML = PLAY_SVG
      playBtn.setAttribute('aria-label', 'Play')
      fill.style.width = '0%'
      bar.setAttribute('aria-valuenow', '0')
    })

    audio.addEventListener('timeupdate', function () {
      if (!isFinite(audio.duration) || audio.duration <= 0) return
      var pct = (audio.currentTime / audio.duration) * 100
      fill.style.width = pct + '%'
      bar.setAttribute('aria-valuenow', Math.round(pct))
      timeLabel.textContent = fmtTime(audio.currentTime) + ' / ' + fmtTime(audio.duration)
    })

    audio.addEventListener('loadedmetadata', function () {
      timeLabel.textContent = '0:00 / ' + fmtTime(audio.duration)
    })

    audio.addEventListener('waiting', function () { wrap.classList.add('is-loading') })
    audio.addEventListener('canplay',  function () { wrap.classList.remove('is-loading') })

    // Seek via pointer events (supports mouse and touch)
    var dragging = false
    bar.addEventListener('pointerdown', function (e) {
      dragging = true
      bar.setPointerCapture(e.pointerId)
      seekTo(audio, bar, e.clientX)
    })
    bar.addEventListener('pointermove', function (e) {
      if (dragging) seekTo(audio, bar, e.clientX)
    })
    bar.addEventListener('pointerup',     function () { dragging = false })
    bar.addEventListener('pointercancel', function () { dragging = false })

    // Keyboard seek (±5 s)
    bar.addEventListener('keydown', function (e) {
      var dur = audio.duration
      if (!isFinite(dur)) return
      if (e.key === 'ArrowLeft') {
        audio.currentTime = Math.max(0, audio.currentTime - 5)
        e.preventDefault()
      } else if (e.key === 'ArrowRight') {
        audio.currentTime = Math.min(dur, audio.currentTime + 5)
        e.preventDefault()
      }
    })

    // Mute toggle
    muteBtn.addEventListener('click', function () {
      audio.muted = !audio.muted
      muteBtn.innerHTML = audio.muted ? MUTE_SVG : VOL_SVG
      muteBtn.setAttribute('aria-label', audio.muted ? 'Unmute' : 'Mute')
    })
  }

  document.querySelectorAll('.audio-player').forEach(initPlayer)
})()
