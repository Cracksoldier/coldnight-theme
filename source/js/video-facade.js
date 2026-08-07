(function () {
  'use strict'

  // Embed URLs are reconstructed from an allowlisted provider + validated id —
  // never read a raw URL from a data attribute. Anything that fails validation
  // falls through to the anchor's normal navigation (the provider watch page).
  var PROVIDERS = {
    youtube: {
      idRe: /^[\w-]+$/,
      embed: function (id) { return 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1' },
      allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
    },
    vimeo: {
      idRe: /^\d+$/,
      embed: function (id) { return 'https://player.vimeo.com/video/' + id + '?autoplay=1' },
      allow: 'autoplay; fullscreen; picture-in-picture'
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.video-facade').forEach(function (facade) {
      facade.addEventListener('click', function (e) {
        var provider = PROVIDERS[facade.dataset.provider]
        var id = facade.dataset.videoId || ''
        if (!provider || !provider.idRe.test(id)) return

        e.preventDefault()
        var iframe = document.createElement('iframe')
        iframe.src = provider.embed(id)
        iframe.title = facade.dataset.videoTitle || 'Video'
        iframe.setAttribute('allow', provider.allow)
        iframe.setAttribute('allowfullscreen', '')
        facade.replaceWith(iframe)
        iframe.focus()
      })
    })
  })
})()
