(function () {
  'use strict'

  // Wait for LightGallery and its plugins to be available via deferred scripts.
  // We poll up to 3s then give up gracefully.
  function waitForLG(cb, tries) {
    tries = tries || 0
    if (typeof lightGallery !== 'undefined') {
      cb()
    } else if (tries < 30) {
      setTimeout(function () { waitForLG(cb, tries + 1) }, 100)
    }
  }

  function buildPlugins() {
    const plugins = []
    if (typeof lgZoom !== 'undefined') plugins.push(lgZoom)
    if (typeof lgThumbnail !== 'undefined') plugins.push(lgThumbnail)
    return plugins
  }

  function mountAutoGallery() {
    const body = document.querySelector('.post-body')
    if (!body) return

    const imgs = Array.from(body.querySelectorAll('img:not(.no-gallery)'))
    if (!imgs.length) return

    // Build a hidden container with <a> wrappers for each image
    const container = document.createElement('div')
    container.className = 'lg-auto-container'
    container.setAttribute('aria-hidden', 'true')

    imgs.forEach(function (img) {
      const item = document.createElement('a')
      item.href = img.src
      item.setAttribute('data-lg-size', img.naturalWidth + '-' + img.naturalHeight)
      if (img.alt) item.setAttribute('data-sub-html', '<p>' + img.alt + '</p>')
      item.appendChild(img.cloneNode(true))
      container.appendChild(item)

      // Clicking the original image triggers the gallery
      img.style.cursor = 'zoom-in'
      img.addEventListener('click', function () {
        const idx = imgs.indexOf(img)
        lightGallery(container, {
          plugins: buildPlugins(),
          dynamic: true,
          dynamicEl: imgs.map(function (i) {
            return { src: i.src, subHtml: i.alt ? '<p>' + i.alt + '</p>' : '' }
          }),
          index: idx,
          speed: 300,
          backdropDuration: 250,
          closeOnTap: true,
        })
      })
    })
  }

  function mountExplicitGalleries() {
    const galleries = document.querySelectorAll('.lg-gallery')
    galleries.forEach(function (gallery) {
      lightGallery(gallery, {
        plugins: buildPlugins(),
        selector: 'a',
        speed: 300,
        backdropDuration: 250,
        closeOnTap: true,
      })
    })
  }

  document.addEventListener('DOMContentLoaded', function () {
    waitForLG(function () {
      mountAutoGallery()
      mountExplicitGalleries()
    })
  })
})()
