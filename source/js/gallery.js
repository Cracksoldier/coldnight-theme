(function () {
  'use strict'

  function buildPlugins() {
    const plugins = []
    if (typeof lgZoom !== 'undefined') plugins.push(lgZoom)
    if (typeof lgThumbnail !== 'undefined') plugins.push(lgThumbnail)
    return plugins
  }

  function mountAutoGallery() {
    if (typeof lightGallery === 'undefined') return
    const body = document.querySelector('.post-body')
    if (!body) return

    const imgs = Array.from(body.querySelectorAll('img:not(.no-gallery)'))
    if (!imgs.length) return

    const dynamicEl = imgs.map(function (img) {
      return { src: img.src, thumb: img.src, subHtml: img.alt ? '<p>' + img.alt + '</p>' : '' }
    })

    const container = document.createElement('div')
    container.setAttribute('aria-hidden', 'true')
    document.body.appendChild(container)

    const instance = lightGallery(container, {
      plugins: buildPlugins(),
      dynamic: true,
      dynamicEl: dynamicEl,
      speed: 300,
      backdropDuration: 250,
      closeOnTap: true,
    })

    imgs.forEach(function (img, idx) {
      img.style.cursor = 'zoom-in'
      img.addEventListener('click', function () { instance.openGallery(idx) })
    })
  }

  function mountExplicitGalleries() {
    if (typeof lightGallery === 'undefined') return
    document.querySelectorAll('.lg-gallery').forEach(function (gallery) {
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
    mountAutoGallery()
    mountExplicitGalleries()
  })
})()
