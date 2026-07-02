;(function () {
  'use strict'

  document.querySelectorAll('.compare-slider__range').forEach(function (range) {
    var frame = range.closest('.compare-slider__frame')
    if (!frame) return
    range.addEventListener('input', function () {
      frame.style.setProperty('--compare-pos', range.value + '%')
    })
  })
})()
